'use server';

import { db } from '@/server/db';
import { appointments, doctors, patients, doctorAvailability } from '@/server/db/schema';
import {
  requireRole,
  assertDoctorOwnsResource,
  assertPatientOwnsPatientRecord,
} from '@/server/auth/rbac';
import {
  bookAppointmentSchema,
  updateAppointmentStatusSchema,
  appointmentIdSchema,
} from '@/lib/validators/appointment';
import { eq, and } from 'drizzle-orm';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function isWithinAvailability(
  scheduledAt: Date,
  windows: { startTime: string; endTime: string }[],
) {
  const minuteOfDay = scheduledAt.getUTCHours() * 60 + scheduledAt.getUTCMinutes();
  return windows.some((window) => {
    const [startHour, startMinute] = window.startTime.slice(0, 5).split(':').map(Number);
    const [endHour, endMinute] = window.endTime.slice(0, 5).split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return minuteOfDay >= start && minuteOfDay + 30 <= end;
  });
}

// ─── Book Appointment ─────────────────────────────────────────────────────────
// The core concurrency-safe booking action (SRS §FR-3, §6).
//
// Concurrency safety is provided by the UNIQUE(doctor_id, scheduled_at)
// constraint at the DB level — under a race the DB rejects the second insert
// with a 23505 unique violation, which we map to a friendly message.
//
// The SELECT below is only an application-level pre-check for a friendlier
// error message in the common (non-concurrent) case; it is NOT the
// concurrency guard. The unique constraint is.
//
// Accessible by: admin, receptionist, patient (self-booking)

export async function bookAppointment(input: unknown) {
  const session = await requireRole(['admin', 'receptionist', 'patient']);

  const data = bookAppointmentSchema.parse(input);
  const scheduledAt = new Date(data.scheduledAt);

  // Patients can only book for themselves — verify they own the patient record
  // (matched by email, since there is no patients.user_id FK yet).
  if (session.user.role === 'patient') {
    await assertPatientOwnsPatientRecord(data.patientId, session);
  }

  const dayOfWeek = DAY_NAMES[scheduledAt.getUTCDay()];
  const windows = await db
    .select({ startTime: doctorAvailability.startTime, endTime: doctorAvailability.endTime })
    .from(doctorAvailability)
    .where(and(
      eq(doctorAvailability.doctorId, data.doctorId),
      eq(doctorAvailability.dayOfWeek, dayOfWeek),
    ));
  if (!isWithinAvailability(scheduledAt, windows)) {
    throw new Error('The selected time is outside this doctor\'s availability. Please choose an available slot.');
  }

  try {
    // Application-level pre-check for a friendlier error message.
    // The DB unique constraint is the real concurrency guard.
    const [existing] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, data.doctorId),
          eq(appointments.scheduledAt, scheduledAt),
        ),
      );

    if (existing) {
      throw new Error('This time slot is already booked. Please choose another time.');
    }

    const [appointment] = await db
      .insert(appointments)
      .values({
        patientId: data.patientId,
        doctorId: data.doctorId,
        scheduledAt,
        reason: data.reason ?? null,
        createdBy: session.user.id,
      })
      .returning();

    return appointment;
  } catch (error) {
    if (error instanceof Error && error.message.includes('23505')) {
      throw new Error('This time slot was just booked by someone else. Please choose another time.');
    }
    throw error;
  }
}

// ─── Update Appointment Status ────────────────────────────────────────────────
// Drives the status lifecycle:
//   scheduled → checked_in → in_progress → completed
//   Any state  → cancelled | no_show
//
// Accessible by: admin, receptionist (status transitions)
//               doctor (in_progress → completed only)

export async function updateAppointmentStatus(input: unknown) {
  const session = await requireRole(['admin', 'receptionist', 'doctor', 'patient']);

  const { id, status } = updateAppointmentStatusSchema.parse(input);

  const [existing] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id));

  if (!existing) throw new Error('Appointment not found.');

  // Patients can only cancel their OWN appointments
  if (session.user.role === 'patient') {
    if (status !== 'cancelled') {
      throw new Error('Patients can only cancel appointments.');
    }
    await assertPatientOwnsPatientRecord(existing.patientId, session);
  }

  // Doctors can only move status to in_progress or completed on their own appointments
  if (session.user.role === 'doctor') {
    const [doctor] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, existing.doctorId));

    await assertDoctorOwnsResource(doctor.userId);

    const doctorAllowedStatuses = ['in_progress', 'completed'];
    if (!doctorAllowedStatuses.includes(status)) {
      throw new Error(`Doctors can only set status to: ${doctorAllowedStatuses.join(', ')}`);
    }
  }

  const [updated] = await db
    .update(appointments)
    .set({ status })
    .where(eq(appointments.id, id))
    .returning();

  // Gamified health score: award +20 points when an appointment transitions
  // into 'completed' (one-shot — guarded by the transition check + idempotency
  // in awardPoints). Best-effort: never blocks the status update.
  if (status === 'completed' && existing.status !== 'completed') {
    // 1. Award health points
    try {
      const { awardPoints } = await import('@/server/actions/health-score.actions');
      await awardPoints(existing.patientId, 20, 'appointment_completed', existing.id);
    } catch (err) {
      console.error('[appointments] failed to award completion points:', err);
    }

    // 2. Auto-generate invoice (best-effort)
    try {
      const { autoGenerateInvoice } = await import('@/server/actions/billing.actions');
      const { db: db2 } = await import('@/server/db');
      const { visits } = await import('@/server/db/schema');
      const { eq: eq2 } = await import('drizzle-orm');
      const [visit] = await db2.select().from(visits).where(eq2(visits.appointmentId, existing.id));
      if (visit) {
        await autoGenerateInvoice({
          visitId: visit.id,
          appointmentId: existing.id,
          doctorId: existing.doctorId,
          patientId: existing.patientId,
        });
      }
    } catch (err) {
      console.error('[appointments] failed to auto-generate invoice:', err);
    }

    // 3. Generate medication reminders from prescriptions (best-effort)
    try {
      const { generateMedicationReminders } = await import('@/server/actions/medication-reminders.actions');
      const { db: db3 } = await import('@/server/db');
      const { visits: visitsTable } = await import('@/server/db/schema');
      const { eq: eq3 } = await import('drizzle-orm');
      const [visit] = await db3.select().from(visitsTable).where(eq3(visitsTable.appointmentId, existing.id));
      if (visit) {
        await generateMedicationReminders(visit.id, existing.patientId);
      }
    } catch (err) {
      console.error('[appointments] failed to generate medication reminders:', err);
    }
  }

  return updated;
}

// ─── Get Appointments by Doctor ───────────────────────────────────────────────
// Returns all appointments for a given doctor.
// Accessible by: admin, receptionist, doctor (own only)

export async function getAppointmentsByDoctor(doctorId: string) {
  const session = await requireRole(['admin', 'receptionist', 'doctor']);

  // Doctors can only view their own appointments
  if (session.user.role === 'doctor') {
    const [doctor] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, doctorId));

    if (!doctor) throw new Error('Doctor not found.');
    await assertDoctorOwnsResource(doctor.userId);
  }

  return db
    .select()
    .from(appointments)
    .where(eq(appointments.doctorId, doctorId))
    .orderBy(appointments.scheduledAt);
}

// ─── Get Appointments by Patient ──────────────────────────────────────────────
// Returns all appointments for a given patient.
// Accessible by: admin, receptionist, doctor, patient (own only)

export async function getAppointmentsByPatient(patientId: string) {
  const session = await requireRole(['admin', 'receptionist', 'doctor', 'patient']);

  // Patients can only view their own appointments.
  if (session.user.role === 'patient') {
    await assertPatientOwnsPatientRecord(patientId, session);
  }

  return db
    .select()
    .from(appointments)
    .where(eq(appointments.patientId, patientId))
    .orderBy(appointments.scheduledAt);
}

// ─── Get Appointment by ID ────────────────────────────────────────────────────
// Accessible by: admin, receptionist, doctor

export async function getAppointmentById(id: string) {
  await requireRole(['admin', 'receptionist', 'doctor']);

  const { id: appointmentId } = appointmentIdSchema.parse({ id });

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appointment) throw new Error('Appointment not found.');

  return appointment;
}

// ─── Get All Appointments ─────────────────────────────────────────────────────
// Returns all appointments with joined patient and doctor names.
// Accessible by: admin, receptionist

export async function getAllAppointments() {
  await requireRole(['admin', 'receptionist']);

  const { users } = await import('@/server/db/schema');

  return db
    .select({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
      reason: appointments.reason,
      createdAt: appointments.createdAt,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      patientName: patients.name,
      doctorName: users.name,
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .orderBy(appointments.scheduledAt);
}

// ─── Cancel Appointment ───────────────────────────────────────────────────────
// Convenience wrapper around updateAppointmentStatus for cancellation.
// Accessible by: admin, receptionist

export async function cancelAppointment(id: string) {
  return updateAppointmentStatus({ id, status: 'cancelled' });
}

// ─── Schedule Follow-Up ───────────────────────────────────────────────────────
// Creates a new scheduled appointment linked to the original via followUpOfId.
// Accessible by: admin, doctor

export async function scheduleFollowUp(params: {
  originalAppointmentId: string;
  doctorId: string;
  patientId: string;
  scheduledAt: string;
  reason?: string;
}) {
  const session = await requireRole(['admin', 'doctor']);

  try {
    const [appt] = await db
      .insert(appointments)
      .values({
        patientId: params.patientId,
        doctorId: params.doctorId,
        scheduledAt: new Date(params.scheduledAt),
        status: 'scheduled',
        reason: params.reason ?? 'Follow-up appointment',
        followUpOfId: params.originalAppointmentId,
        createdBy: session.user.id,
      })
      .returning();
    return appt;
  } catch (error) {
    if (error instanceof Error && error.message.includes('23505')) {
      throw new Error('That follow-up slot is already booked. Please choose another time.');
    }
    throw error;
  }
}

// ─── Create Walk-In Appointment ───────────────────────────────────────────────
// Walk-ins don't use the slot-booking flow — they arrive now and join the
// queue. scheduledAt is set to the current time; isWalkIn flags them so the UI
// can show them in a separate walk-in queue rather than the calendar grid.
// Accessible by: admin, receptionist, nurse

export async function createWalkInAppointment(input: {
  patientId: string;
  doctorId: string;
  reason?: string;
}) {
  const session = await requireRole(['admin', 'receptionist', 'nurse']);

  // Minimal validation — walk-ins skip the future-only and slot checks
  if (!input.patientId || !input.doctorId) {
    throw new Error('Patient and doctor are required.');
  }

  const now = new Date();

  try {
    const [appointment] = await db
      .insert(appointments)
      .values({
        patientId: input.patientId,
        doctorId: input.doctorId,
        scheduledAt: now,
        status: 'walk_in',
        isWalkIn: true,
        reason: input.reason ?? null,
        createdBy: session.user.id,
      })
      .returning();

    return appointment;
  } catch (error) {
    // Slot collision is extremely unlikely at sub-second precision, but handle it
    if (error instanceof Error && error.message.includes('23505')) {
      // Retry once with a 1-second offset to avoid the unique constraint
      const [retry] = await db
        .insert(appointments)
        .values({
          patientId: input.patientId,
          doctorId: input.doctorId,
          scheduledAt: new Date(now.getTime() + 1000),
          status: 'walk_in',
          isWalkIn: true,
          reason: input.reason ?? null,
          createdBy: session.user.id,
        })
        .returning();
      return retry;
    }
    throw error;
  }
}

// ─── Reschedule Appointment ───────────────────────────────────────────────────
// Changes the scheduledAt time for an existing appointment.
// Accessible by: admin, receptionist

export async function rescheduleAppointment(input: {
  appointmentId: string;
  newScheduledAt: string; // ISO datetime string
}) {
  const session = await requireRole(['admin', 'receptionist']);

  if (!input.appointmentId || !input.newScheduledAt) {
    throw new Error('Appointment ID and new time are required.');
  }

  const [existing] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, input.appointmentId));

  if (!existing) throw new Error('Appointment not found.');

  try {
    const [updated] = await db
      .update(appointments)
      .set({ scheduledAt: new Date(input.newScheduledAt), status: 'scheduled' })
      .where(eq(appointments.id, input.appointmentId))
      .returning();

    return updated;
  } catch (error) {
    if (error instanceof Error && error.message.includes('23505')) {
      throw new Error('That time slot is already booked. Please choose another time.');
    }
    throw error;
  }
}
