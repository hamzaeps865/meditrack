'use server';

import { db } from '@/server/db';
import { triage, appointments, patients, users } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, and, isNull, desc, asc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { startOfDay, endOfDay } from 'date-fns';

// ─── Triage Actions ───────────────────────────────────────────────────────────

const createTriageSchema = z.object({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  severity: z.enum(['critical', 'urgent', 'standard', 'low']),
  chiefComplaint: z.string().min(3, 'Chief complaint is required').max(1000).trim(),
  vitalsBp: z.string().max(20).trim().optional(),
  vitalsTemp: z.string().max(10).trim().optional(),
  vitalsWeight: z.string().max(10).trim().optional(),
  vitalsPulse: z.string().max(10).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export type CreateTriageInput = z.infer<typeof createTriageSchema>;

// ─── Create a Triage Record (nurse-only) ──────────────────────────────────────

export async function createTriageRecord(input: unknown) {
  const session = await requireRole(['nurse', 'admin']);
  const data = createTriageSchema.parse(input);

  const [record] = await db
    .insert(triage)
    .values({
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      nurseUserId: session.user.id,
      severity: data.severity,
      chiefComplaint: data.chiefComplaint,
      vitalsBp: data.vitalsBp || null,
      vitalsTemp: data.vitalsTemp || null,
      vitalsWeight: data.vitalsWeight || null,
      vitalsPulse: data.vitalsPulse || null,
      notes: data.notes || null,
    })
    .returning();

  return record;
}

// ─── Get Triage for an Appointment (doctor/nurse view) ────────────────────────

export async function getTriageForAppointment(appointmentId: string) {
  await requireRole(['admin', 'doctor', 'nurse']);

  const [record] = await db
    .select({
      id: triage.id,
      severity: triage.severity,
      chiefComplaint: triage.chiefComplaint,
      vitalsBp: triage.vitalsBp,
      vitalsTemp: triage.vitalsTemp,
      vitalsWeight: triage.vitalsWeight,
      vitalsPulse: triage.vitalsPulse,
      notes: triage.notes,
      createdAt: triage.createdAt,
      nurseName: users.name,
    })
    .from(triage)
    .leftJoin(users, eq(triage.nurseUserId, users.id))
    .where(eq(triage.appointmentId, appointmentId))
    .orderBy(desc(triage.createdAt));

  return record ?? null;
}

// ─── Get Triage Queue (nurse dashboard) ───────────────────────────────────────
// Returns today's checked-in + walk-in appointments that need triage, plus
// those already triaged (so the nurse sees the full picture).

export async function getTriageQueue() {
  const session = await requireRole(['nurse', 'admin']);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Today's appointments that are checked_in or walk_in
  const queue = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
      isWalkIn: appointments.isWalkIn,
      reason: appointments.reason,
      createdAt: appointments.createdAt,
      patientName: patients.name,
      patientDob: patients.dob,
      patientGender: patients.gender,
      patientBloodGroup: patients.bloodGroup,
      patientAllergies: patients.allergies,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        inArray(appointments.status, ['checked_in', 'walk_in']),
      ),
    )
    .orderBy(asc(appointments.createdAt));

  // Fetch all triage records for these appointments (to know which are triaged)
  const apptIds = queue.map((q) => q.id);
  let triageMap = new Map<string, { severity: string; createdAt: Date }>();
  if (apptIds.length > 0) {
    const triageRecords = await db
      .select({
        appointmentId: triage.appointmentId,
        severity: triage.severity,
        createdAt: triage.createdAt,
      })
      .from(triage)
      .where(inArray(triage.appointmentId, apptIds))
      .orderBy(desc(triage.createdAt));

    for (const t of triageRecords) {
      if (t.appointmentId && !triageMap.has(t.appointmentId)) {
        triageMap.set(t.appointmentId, { severity: t.severity, createdAt: t.createdAt });
      }
    }
  }

  // Enrich with triage status
  return queue.map((q) => ({
    ...q,
    triaged: triageMap.has(q.id),
    triageSeverity: triageMap.get(q.id)?.severity ?? null,
    triageTime: triageMap.get(q.id)?.createdAt ?? null,
  }));
}
