'use server';

import { db } from '@/server/db';
import {
  visits, prescriptions, prescriptionItems, appointments, doctors, patients, users,
} from '@/server/db/schema';
import { requireRole, assertPatientOwnsPatientRecord } from '@/server/auth/rbac';
import { eq, desc, sql, inArray } from 'drizzle-orm';

// ─── Health Report Data ───────────────────────────────────────────────────────
// Aggregates everything needed for a patient's health report / print view:
// visits (with vitals + doctor names), prescriptions + their items, and
// appointment counts. Patient-scoped via assertPatientOwnsPatientRecord.

export async function getHealthReportData(patientId: string) {
  const session = await requireRole(['admin', 'doctor', 'patient']);
  if (session.user.role === 'patient') {
    await assertPatientOwnsPatientRecord(patientId, session);
  }

  // 1. Patient profile
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));
  if (!patient) throw new Error('Patient not found.');

  // 2. Visits with doctor names (chronological)
  const visitRows = await db
    .select({
      id: visits.id,
      createdAt: visits.createdAt,
      chiefComplaint: visits.chiefComplaint,
      diagnosis: visits.diagnosis,
      notes: visits.notes,
      vitalsBp: visits.vitalsBp,
      vitalsTemp: visits.vitalsTemp,
      vitalsWeight: visits.vitalsWeight,
      doctorName: users.name,
      specialization: doctors.specialization,
    })
    .from(visits)
    .leftJoin(doctors, eq(visits.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .where(eq(visits.patientId, patientId))
    .orderBy(desc(visits.createdAt));

  // 3. Prescriptions for this patient, with their items
  const prescriptionRows = await db
    .select({
      id: prescriptions.id,
      createdAt: prescriptions.createdAt,
      visitId: prescriptions.visitId,
      doctorName: users.name,
    })
    .from(prescriptions)
    .innerJoin(visits, eq(prescriptions.visitId, visits.id))
    .leftJoin(doctors, eq(visits.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .where(eq(visits.patientId, patientId))
    .orderBy(desc(prescriptions.createdAt));

  let prescriptionsWithItems: (typeof prescriptionRows[number] & { items: typeof prescriptionItems.$inferSelect[] })[] = [];
  if (prescriptionRows.length > 0) {
    const ids = prescriptionRows.map((p) => p.id);
    const allItems = await db
      .select()
      .from(prescriptionItems)
      .where(inArray(prescriptionItems.prescriptionId, ids));

    prescriptionsWithItems = prescriptionRows.map((p) => ({
      ...p,
      items: allItems.filter((it) => it.prescriptionId === p.id),
    }));
  }

  // 4. Appointment aggregates
  const [agg] = await db
    .select({
      total: sql<number>`count(*)`,
      completed: sql<number>`count(*) filter (where ${appointments.status} = 'completed')`,
      cancelled: sql<number>`count(*) filter (where ${appointments.status} in ('cancelled','no_show'))`,
    })
    .from(appointments)
    .where(eq(appointments.patientId, patientId));

  return {
    patient,
    visits: visitRows,
    prescriptions: prescriptionsWithItems,
    appointmentStats: {
      total: Number(agg?.total ?? 0),
      completed: Number(agg?.completed ?? 0),
      cancelled: Number(agg?.cancelled ?? 0),
    },
  };
}
