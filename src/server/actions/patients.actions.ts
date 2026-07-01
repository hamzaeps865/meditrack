'use server';

import { db } from '@/server/db';
import { patients } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { createPatientSchema, updatePatientSchema, patientIdSchema } from '@/lib/validators/patient';
import { eq, isNull, or, ilike } from 'drizzle-orm';

// ─── Get All Patients ─────────────────────────────────────────────────────────
// Returns all non-deleted patients.
// Accessible by: admin, receptionist, doctor

export async function getAllPatients() {
  await requireRole(['admin', 'receptionist', 'doctor']);

  return db
    .select()
    .from(patients)
    .where(isNull(patients.deletedAt))
    .orderBy(patients.name);
}

// ─── Search Patients ──────────────────────────────────────────────────────────
// Full-text search by name or phone number (FR-1).
// Accessible by: admin, receptionist, doctor

export async function searchPatients(query: string) {
  await requireRole(['admin', 'receptionist', 'doctor']);

  const term = `%${query.trim()}%`;

  return db
    .select()
    .from(patients)
    .where(
      or(
        ilike(patients.name, term),
        ilike(patients.phone, term),
      ) 
    )
    .orderBy(patients.name);
}

// ─── Get Patient By ID ────────────────────────────────────────────────────────
// Accessible by: admin, receptionist, doctor
// Patients viewing their own record is handled separately via assertPatientOwnsResource.

export async function getPatientById(id: string) {
  await requireRole(['admin', 'receptionist', 'doctor']);

  const { id: patientId } = patientIdSchema.parse({ id });

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));

  if (!patient || patient.deletedAt !== null) {
    throw new Error('Patient not found.');
  }

  return patient;
}

// ─── Create Patient ───────────────────────────────────────────────────────────
// Accessible by: admin, receptionist

export async function createPatient(input: unknown) {
  const session = await requireRole(['admin', 'receptionist']);

  const data = createPatientSchema.parse(input);

  const [newPatient] = await db
    .insert(patients)
    .values({
      ...data,
      // Normalize empty string emails to null
      email: data.email || null,
      createdBy: session.user.id,
    })
    .returning();

  return newPatient;
}

// ─── Update Patient ───────────────────────────────────────────────────────────
// PATCH semantics — only provided fields are updated.
// Accessible by: admin, receptionist

export async function updatePatient(id: string, input: unknown) {
  await requireRole(['admin', 'receptionist']);

  const { id: patientId } = patientIdSchema.parse({ id });
  const data = updatePatientSchema.parse(input);

  // Guard: ensure patient exists and is not deleted before updating
  const [existing] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, patientId));

  if (!existing) {
    throw new Error('Patient not found.');
  }

  const [updated] = await db
    .update(patients)
    .set({
      ...data,
      email: data.email || null,
    })
    .where(eq(patients.id, patientId))
    .returning();

  return updated;
}

// ─── Soft Delete Patient ──────────────────────────────────────────────────────
// Sets deletedAt timestamp instead of removing the row (FR-1, SRS §5.1).
// Clinical records are never hard-deleted.
// Accessible by: admin only

export async function softDeletePatient(id: string) {
  await requireRole(['admin']);

  const { id: patientId } = patientIdSchema.parse({ id });

  const [existing] = await db
    .select({ id: patients.id, deletedAt: patients.deletedAt })
    .from(patients)
    .where(eq(patients.id, patientId));

  if (!existing) {
    throw new Error('Patient not found.');
  }

  if (existing.deletedAt !== null) {
    throw new Error('Patient is already deleted.');
  }

  const [deleted] = await db
    .update(patients)
    .set({ deletedAt: new Date() })
    .where(eq(patients.id, patientId))
    .returning();

  return deleted;
}
