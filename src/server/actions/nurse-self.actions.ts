'use server';

import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255).trim(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export async function updateOwnNurseProfile(input: unknown) {
  const session = await requireRole(['nurse', 'admin']);
  const data = updateProfileSchema.parse(input);
  await db.update(users).set({ name: data.name }).where(eq(users.id, session.user.id));
  return { success: true };
}

export async function changeOwnNursePassword(input: unknown) {
  const session = await requireRole(['nurse', 'admin']);
  const { currentPassword, newPassword } = changePasswordSchema.parse(input);

  const [userRow] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id));
  if (!userRow) throw new Error('User not found.');

  const valid = await bcrypt.compare(currentPassword, userRow.passwordHash);
  if (!valid) throw new Error('Current password is incorrect.');

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userRow.id));
  return { success: true };
}
