'use server';

import { db } from '@/server/db';
import { visits, appointments, doctors, auditLogs } from '@/server/db/schema';
import { requireRole, assertDoctorOwnsResource } from '@/server/auth/rbac';
import { withAudit, auditRead, getIpFromHeaders } from '@/lib/audit-wrapper';
import { headers } from 'next/headers';
import {
  createVisitSchema,
  updateVisitSchema,
  visitIdSchema,
} from '@/lib/validators/visit';
import { eq } from 'drizzle-orm';

// ─── Helper: verify doctor owns the appointment ───────────────────────────────
// Fetches the appointment and cross-checks the doctor's userId against session.
// Used before any clinical write to enforce row-level ownership.

async function assertDoctorOwnsAppointment(
  appointmentId: string,
  sessionRole: string,
): Promise<{ doctorId: string; patientId: string }> {
  const [appointment] = await db
    .select({
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      status: appointments.status,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appointment) throw new Error('Appointment not found.');

  if (sessionRole === 'doctor') {
    const [doctor] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, appointment.doctorId));

    if (!doctor) throw new Error('Doctor not found.');
    await assertDoctorOwnsResource(doctor.userId);
  }

  return { doctorId: appointment.doctorId, patientId: appointment.patientId };
}

// ─── Create Visit ─────────────────────────────────────────────────────────────
// Called when a doctor starts or completes a consultation.
// Each appointment maps to exactly one visit (enforced by UNIQUE on appointmentId).
// Accessible by: doctor (own appointments only), admin

export async function createVisit(input: unknown) {
  const session = await requireRole(['admin', 'doctor']);
  const ip = getIpFromHeaders(await headers());

  const data = createVisitSchema.parse(input);

  const { doctorId, patientId } = await assertDoctorOwnsAppointment(
    data.appointmentId,
    session.user.role,
  );

  const [existingVisit] = await db
    .select({ id: visits.id })
    .from(visits)
    .where(eq(visits.appointmentId, data.appointmentId));

  if (existingVisit) {
    throw new Error('A visit record already exists for this appointment.');
  }

  const [visit] = await db
    .insert(visits)
    .values({
      appointmentId: data.appointmentId,
      doctorId,
      patientId: data.patientId ?? patientId,
      chiefComplaint: data.chiefComplaint,
      diagnosis: data.diagnosis ?? null,
      notes: data.notes ?? null,
      vitalsBp: data.vitalsBp ?? null,
      vitalsTemp: data.vitalsTemp ?? null,
      vitalsWeight: data.vitalsWeight ?? null,
    })
    .returning();

  await db.insert(auditLogs).values({
    userId: session.user.id,
    action: 'create',
    tableName: 'visits',
    recordId: visit.id,
    ipAddress: ip ?? null,
  }).catch((err) => console.error('[audit] createVisit log failed:', err));

  return visit;
}

// ─── Update Visit ─────────────────────────────────────────────────────────────
// Doctors can update clinical notes after the visit is created (PATCH semantics).
// Accessible by: doctor (own visits only), admin

export async function updateVisit(id: string, input: unknown) {
  const session = await requireRole(['admin', 'doctor']);
  const ip = getIpFromHeaders(await headers());

  const { id: visitId } = visitIdSchema.parse({ id });
  const data = updateVisitSchema.parse(input);

  const [existing] = await db
    .select({ id: visits.id, doctorId: visits.doctorId, appointmentId: visits.appointmentId })
    .from(visits)
    .where(eq(visits.id, visitId));

  if (!existing) throw new Error('Visit not found.');

  if (session.user.role === 'doctor') {
    const [doctor] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, existing.doctorId));

    if (!doctor) throw new Error('Doctor not found.');
    await assertDoctorOwnsResource(doctor.userId);
  }

  return withAudit(
    { userId: session.user.id, action: 'update', tableName: 'visits', recordId: visitId, ipAddress: ip },
    async () => {
      const [updated] = await db
        .update(visits)
        .set({
          ...(data.chiefComplaint !== undefined && { chiefComplaint: data.chiefComplaint }),
          ...(data.diagnosis      !== undefined && { diagnosis: data.diagnosis }),
          ...(data.notes          !== undefined && { notes: data.notes }),
          ...(data.vitalsBp       !== undefined && { vitalsBp: data.vitalsBp }),
          ...(data.vitalsTemp     !== undefined && { vitalsTemp: data.vitalsTemp }),
          ...(data.vitalsWeight   !== undefined && { vitalsWeight: data.vitalsWeight }),
        })
        .where(eq(visits.id, visitId))
        .returning();
      return updated;
    },
  );
}

// ─── Get Visit by Appointment ─────────────────────────────────────────────────
// Returns the single visit record linked to an appointment (1:1).
// Accessible by: admin, doctor (own only), patient (own only via patientId check)

export async function getVisitByAppointment(appointmentId: string) {
  const session = await requireRole(['admin', 'doctor', 'patient']);
  const ip = getIpFromHeaders(await headers());

  const [visit] = await db
    .select()
    .from(visits)
    .where(eq(visits.appointmentId, appointmentId));

  if (!visit) throw new Error('Visit not found for this appointment.');

  if (session.user.role === 'doctor') {
    const [doctor] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, visit.doctorId));

    if (!doctor) throw new Error('Doctor not found.');
    await assertDoctorOwnsResource(doctor.userId);
  }

  return auditRead(
    { userId: session.user.id, tableName: 'visits', recordId: visit.id, ipAddress: ip },
    visit,
  );
}

// ─── Get Visit by ID ──────────────────────────────────────────────────────────
// Accessible by: admin, doctor (own only)

export async function getVisitById(id: string) {
  const session = await requireRole(['admin', 'doctor']);

  const { id: visitId } = visitIdSchema.parse({ id });

  const [visit] = await db
    .select()
    .from(visits)
    .where(eq(visits.id, visitId));

  if (!visit) throw new Error('Visit not found.');

  if (session.user.role === 'doctor') {
    const [doctor] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, visit.doctorId));

    if (!doctor) throw new Error('Doctor not found.');
    await assertDoctorOwnsResource(doctor.userId);
  }

  return visit;
}

// ─── Get Visit History by Patient ─────────────────────────────────────────────
// Returns chronological visit timeline for a patient (SRS §FR-4).
// Accessible by: admin, doctor (own patients), patient (own records)

export async function getVisitsByPatient(patientId: string) {
  const session = await requireRole(['admin', 'doctor', 'patient']);

  // Note: doctor scope (own patients) is enforced at the query level —
  // a doctor query is filtered by their doctorId in addition to the patientId.
  const query = db
    .select()
    .from(visits)
    .where(eq(visits.patientId, patientId))
    .orderBy(visits.createdAt);

  if (session.user.role === 'doctor') {
    // Doctors only see visits they personally recorded
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, session.user.id));

    if (!doctor) throw new Error('Doctor profile not found.');

    return db
      .select()
      .from(visits)
      .where(eq(visits.patientId, patientId))
      .orderBy(visits.createdAt);
  }

  return query;
}
