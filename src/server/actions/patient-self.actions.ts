'use server';

import { db } from '@/server/db';
import { patients, users } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const phoneRegex = /^\+?[0-9]{10,15}$/;

const updateProfileSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  email: z.string().email('Enter a valid email address').max(255).trim(),
  phone: z.string().trim().regex(phoneRegex, 'Enter 10–15 digits, optionally starting with +').optional().or(z.literal('')),
  address: z.string().max(500).trim().optional().nullable(),
  emergencyContact: z.string().max(255).trim().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

// ─── Get Own Patient Profile ──────────────────────────────────────────────────
// Returns the patient row linked to the currently authenticated patient user.

export async function getOwnPatientProfile() {
  const session = await requireRole(['patient']);

  const [userRow] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id));

  const [patientRow] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.email, userRow?.email ?? ''),
        isNull(patients.deletedAt),
      ),
    );

  return { patient: patientRow ?? null, user: userRow ?? null };
}

// ─── Update Own Profile ───────────────────────────────────────────────────────
// Patients may update their own name (users table) and contact details (patients table).

export async function updateOwnProfile(input: unknown) {
  const session = await requireRole(['patient']);

  const data = updateProfileSchema.parse(input);
  const normalizedEmail = data.email.trim().toLowerCase();
  const normalizedPhone = data.phone ? data.phone.trim() : null;

  const [userRow] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!userRow) throw new Error('User not found.');

  const [emailOwner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail));

  if (emailOwner && emailOwner.id !== userRow.id) {
    throw new Error('This email address is already in use.');
  }

  await db
    .update(users)
    .set({ name: data.name, email: normalizedEmail })
    .where(eq(users.id, userRow.id));

  const [existing] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(
      and(
        eq(patients.email, userRow.email),
        isNull(patients.deletedAt),
      ),
    );

  if (existing) {
    await db
      .update(patients)
      .set({
        name: data.name,
        email: normalizedEmail,
        phone: normalizedPhone ?? undefined,
        address: data.address ?? null,
        emergencyContact: data.emergencyContact ?? null,
      })
      .where(eq(patients.id, existing.id));
  }

  revalidatePath('/patient/settings');
  revalidatePath('/patient');
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

  const newHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(users)
    .set({ passwordHash: newHash })
    .where(eq(users.id, userRow.id));

  return { success: true };
}
