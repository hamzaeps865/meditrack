'use server';

import { db } from '@/server/db';
import { prescriptions, prescriptionItems, visits, doctors, patients, users, auditLogs } from '@/server/db/schema';
import { requireRole, assertDoctorOwnsResource, assertPatientOwnsPatientRecord } from '@/server/auth/rbac';
import { auditRead, getIpFromHeaders } from '@/lib/audit-wrapper';
import { headers } from 'next/headers';
import {
  createPrescriptionSchema,
  prescriptionIdSchema,
} from '@/lib/validators/visit';
import { eq, inArray } from 'drizzle-orm';

// ─── Helper: assert doctor owns the visit ────────────────────────────────────
// A prescription is tied to a visit — we resolve visit → doctorId
// and compare it to the session user before any write.

async function assertDoctorOwnsVisit(visitId: string, sessionRole: string) {
  const [visit] = await db
    .select({ doctorId: visits.doctorId, patientId: visits.patientId })
    .from(visits)
    .where(eq(visits.id, visitId));

  if (!visit) throw new Error('Visit not found.');

  if (sessionRole === 'doctor') {
    const [doctor] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, visit.doctorId));

    if (!doctor) throw new Error('Doctor not found.');
    await assertDoctorOwnsResource(doctor.userId);
  }

  return visit;
}

// ─── Create Prescription ──────────────────────────────────────────────────────
// Creates a prescription with all its line items in a single transaction.
// Tied to a visit — a doctor can issue multiple prescriptions per visit if needed.
// Accessible by: doctor (own visits only), admin

export async function createPrescription(input: unknown) {
  const session = await requireRole(['admin', 'doctor']);
  const ip = getIpFromHeaders(await headers());

  const data = createPrescriptionSchema.parse(input);

  await assertDoctorOwnsVisit(data.visitId, session.user.role);

  // Insert prescription header + items atomically so a failure in the items
  // insert can never leave an orphan prescription with zero items.
  const { prescription, items } = await db.transaction(async (tx) => {
    const [prescription] = await tx
      .insert(prescriptions)
      .values({ visitId: data.visitId })
      .returning();

    const items = await tx
      .insert(prescriptionItems)
      .values(
        data.items.map((item) => ({
          prescriptionId: prescription.id,
          medicineId: item.medicineId ?? null,
          medicineName: item.medicineName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          notes: item.notes ?? null,
        })),
      )
      .returning();

    return { prescription, items };
  });

  await db.insert(auditLogs).values({
    userId: session.user.id,
    action: 'create',
    tableName: 'prescriptions',
    recordId: prescription.id,
    ipAddress: ip ?? null,
  }).catch((err) => console.error('[audit] createPrescription log failed:', err));

  return { ...prescription, items };
}

// ─── Get Prescriptions by Visit ───────────────────────────────────────────────
// Returns all prescriptions (with their items) for a given visit.
// Accessible by: admin, doctor (own visits only), patient (own records)

export async function getPrescriptionsByVisit(visitId: string) {
  const session = await requireRole(['admin', 'doctor', 'patient']);

  // Verify visit exists and enforce ownership for doctor role
  if (session.user.role === 'doctor') {
    await assertDoctorOwnsVisit(visitId, session.user.role);
  } else if (session.user.role === 'patient') {
    const [visit] = await db
      .select({ patientId: visits.patientId })
      .from(visits)
      .where(eq(visits.id, visitId));
    if (!visit) throw new Error('Visit not found.');
    await assertPatientOwnsPatientRecord(visit.patientId, session);
  }

  // Fetch all prescriptions for the visit
  const prescriptionRows = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.visitId, visitId))
    .orderBy(prescriptions.createdAt);

  if (prescriptionRows.length === 0) return [];

  // Fetch all items for those prescriptions in one query
  const prescriptionIds = prescriptionRows.map((p) => p.id);

  const allItems = await db
    .select()
    .from(prescriptionItems)
    .where(inArray(prescriptionItems.prescriptionId, prescriptionIds));

  // Group items back onto their parent prescription
  return prescriptionRows.map((prescription) => ({
    ...prescription,
    items: allItems.filter((item) => item.prescriptionId === prescription.id),
  }));
}

// ─── Get Prescriptions by Patient ─────────────────────────────────────────────
// Returns all prescriptions across all visits for a patient.
// Used in the patient portal and doctor's patient view.
// Accessible by: admin, doctor, patient (own only)

export async function getPrescriptionsByPatient(patientId: string) {
  const session = await requireRole(['admin', 'doctor', 'patient']);

  // Patients may only view their own prescriptions
  if (session.user.role === 'patient') {
    await assertPatientOwnsPatientRecord(patientId, session);
  }

  // Join prescriptions → visits to filter by patientId
  const rows = await db
    .select({
      prescription: prescriptions,
      visit: {
        id: visits.id,
        patientId: visits.patientId,
        doctorId: visits.doctorId,
        createdAt: visits.createdAt,
      },
    })
    .from(prescriptions)
    .innerJoin(visits, eq(prescriptions.visitId, visits.id))
    .where(eq(visits.patientId, patientId))
    .orderBy(prescriptions.createdAt);

  if (rows.length === 0) return [];

  // Fetch all items for the returned prescriptions
  const prescriptionIds = rows.map((r) => r.prescription.id);

  const allItems = await db
    .select()
    .from(prescriptionItems)
    .where(inArray(prescriptionItems.prescriptionId, prescriptionIds));

  return rows.map((row) => ({
    ...row.prescription,
    visit: row.visit,
    items: allItems.filter((item) => item.prescriptionId === row.prescription.id),
  }));
}

// ─── Get Prescription by ID ───────────────────────────────────────────────────
// Returns a single prescription with all its line items.
// Accessible by: admin, doctor, patient

export async function getPrescriptionById(id: string) {
  const session = await requireRole(['admin', 'doctor', 'patient']);
  const ip = getIpFromHeaders(await headers());

  const { id: prescriptionId } = prescriptionIdSchema.parse({ id });

  const [prescription] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, prescriptionId));

  if (!prescription) throw new Error('Prescription not found.');

  if (session.user.role === 'patient') {
    const [visit] = await db
      .select({ patientId: visits.patientId })
      .from(visits)
      .where(eq(visits.id, prescription.visitId));
    if (!visit) throw new Error('Visit not found.');
    await assertPatientOwnsPatientRecord(visit.patientId, session);
  }

  const items = await db
    .select()
    .from(prescriptionItems)
    .where(eq(prescriptionItems.prescriptionId, prescriptionId));

  const result = { ...prescription, items };

  return auditRead(
    { userId: session.user.id, tableName: 'prescriptions', recordId: prescriptionId, ipAddress: ip },
    result,
  );
}

// ─── Get Prescription for Print (enriched) ───────────────────────────────────
// Returns a prescription with all its line items PLUS the visit, doctor, and
// patient details needed to render a printable prescription document.
// Accessible by: admin, doctor (own only), patient (own only)

export async function getPrescriptionForPrint(id: string) {
  const session = await requireRole(['admin', 'doctor', 'patient']);

  const { id: prescriptionId } = prescriptionIdSchema.parse({ id });

  // Prescription + visit + doctor + patient (all in one joined query)
  const [row] = await db
    .select({
      prescriptionId: prescriptions.id,
      prescriptionCreatedAt: prescriptions.createdAt,
      visitId: visits.id,
      visitCreatedAt: visits.createdAt,
      diagnosis: visits.diagnosis,
      chiefComplaint: visits.chiefComplaint,
      patientId: visits.patientId,
      patientName: patients.name,
      patientDob: patients.dob,
      patientGender: patients.gender,
      patientBloodGroup: patients.bloodGroup,
      patientPhone: patients.phone,
      doctorId: visits.doctorId,
      doctorName: users.name,
      doctorSpecialization: doctors.specialization,
    })
    .from(prescriptions)
    .innerJoin(visits, eq(prescriptions.visitId, visits.id))
    .leftJoin(doctors, eq(visits.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .leftJoin(patients, eq(visits.patientId, patients.id))
    .where(eq(prescriptions.id, prescriptionId));

  if (!row) throw new Error('Prescription not found.');

  // Ownership enforcement
  if (session.user.role === 'doctor') {
    const [doctor] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, row.doctorId));
    if (doctor) await assertDoctorOwnsResource(doctor.userId);
  } else if (session.user.role === 'patient') {
    await assertPatientOwnsPatientRecord(row.patientId, session);
  }

  // Fetch the medicine line items
  const items = await db
    .select()
    .from(prescriptionItems)
    .where(eq(prescriptionItems.prescriptionId, prescriptionId));

  return {
    prescriptionId: row.prescriptionId,
    prescriptionCreatedAt: row.prescriptionCreatedAt,
    visitCreatedAt: row.visitCreatedAt,
    diagnosis: row.diagnosis,
    chiefComplaint: row.chiefComplaint,
    patient: {
      id: row.patientId,
      name: row.patientName,
      dob: row.patientDob,
      gender: row.patientGender,
      bloodGroup: row.patientBloodGroup,
      phone: row.patientPhone,
    },
    doctor: {
      name: row.doctorName,
      specialization: row.doctorSpecialization,
    },
    items,
  };
}
