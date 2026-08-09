'use server';

import { db } from '@/server/db';
import { users, doctors } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255).trim(),
  specialization: z
    .string()
    .min(2, 'Specialization must be at least 2 characters')
    .max(255)
    .trim(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72),
});

// ─── Get Own Doctor Profile ───────────────────────────────────────────────────

export async function getOwnDoctorProfile() {
  const session = await requireRole(['doctor', 'admin']);

  const [userRow] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!userRow) throw new Error('User not found.');

  const [doctorRow] = await db
    .select({
      id: doctors.id,
      specialization: doctors.specialization,
      licenseNumber: doctors.licenseNumber,
    })
    .from(doctors)
    .where(eq(doctors.userId, session.user.id));

  return { user: userRow, doctor: doctorRow ?? null };
}

// ─── Update Own Profile ───────────────────────────────────────────────────────
// Doctors may update their display name (users table) and specialization
// (doctors table). Email and license number are managed by an administrator.

export async function updateOwnDoctorProfile(input: unknown) {
  const session = await requireRole(['doctor', 'admin']);

  const data = updateProfileSchema.parse(input);

  // 1. Update the user display name
  await db
    .update(users)
    .set({ name: data.name })
    .where(eq(users.id, session.user.id));

  // 2. Update specialization on the linked doctor profile (if it exists)
  await db
    .update(doctors)
    .set({ specialization: data.specialization })
    .where(eq(doctors.userId, session.user.id));

  return { success: true };
}

// ─── Change Own Password ──────────────────────────────────────────────────────

export async function changeOwnDoctorPassword(input: unknown) {
  const session = await requireRole(['doctor', 'admin']);

  const { currentPassword, newPassword } = changePasswordSchema.parse(input);

  const [userRow] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!userRow) throw new Error('User not found.');

  const valid = await bcrypt.compare(currentPassword, userRow.passwordHash);
  if (!valid) throw new Error('Current password is incorrect.');

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db
    .update(users)
    .set({ passwordHash: newHash })
    .where(eq(users.id, userRow.id));

  return { success: true };
}
