'use server';

import { db } from '@/server/db';
import { patients, users } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name:             z.string().min(2).max(255).trim(),
  phone:            z.string().min(5).max(20).trim().optional(),
  address:          z.string().max(500).trim().optional().nullable(),
  emergencyContact: z.string().max(255).trim().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(8, 'Password must be at least 8 characters').max(72),
});

// ─── Get Own Patient Profile ──────────────────────────────────────────────────
// Returns the patient row linked to the currently authenticated patient user.

export async function getOwnPatientProfile() {
  const session = await requireRole(['patient']);

  const [patientRow] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.email, session.user.email ?? ''),
        isNull(patients.deletedAt),
      ),
    );

  // Also return the user's display name from users table
  const [userRow] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id));

  return { patient: patientRow ?? null, user: userRow ?? null };
}

// ─── Update Own Profile ───────────────────────────────────────────────────────
// Patients may update their own name (users table) and contact details (patients table).

export async function updateOwnProfile(input: unknown) {
  const session = await requireRole(['patient']);

  const data = updateProfileSchema.parse(input);

  // 1. Update the user display name
  await db
    .update(users)
    .set({ name: data.name })
    .where(eq(users.id, session.user.id));

  // 2. Update the linked patient record (matched by email)
  const [existing] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(
      and(
        eq(patients.email, session.user.email ?? ''),
        isNull(patients.deletedAt),
      ),
    );

  if (existing) {
    await db
      .update(patients)
      .set({
        name:             data.name,
        phone:            data.phone ?? undefined,
        address:          data.address ?? null,
        emergencyContact: data.emergencyContact ?? null,
      })
      .where(eq(patients.id, existing.id));
  }

  return { success: true };
}

// ─── Change Own Password ──────────────────────────────────────────────────────

export async function changeOwnPassword(input: unknown) {
  const session = await requireRole(['patient']);

  const { currentPassword, newPassword } = changePasswordSchema.parse(input);

  // Load current hash
  const [userRow] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!userRow) throw new Error('User not found.');

  const valid = await bcrypt.compare(currentPassword, userRow.passwordHash);
  if (!valid) throw new Error('Current password is incorrect.');

  const newHash = await bcrypt.hash(newPassword, 10);

  await db
    .update(users)
    .set({ passwordHash: newHash })
    .where(eq(users.id, userRow.id));

  return { success: true };
}
