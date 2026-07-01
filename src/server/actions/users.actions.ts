'use server';

import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// ─── Get All Users ────────────────────────────────────────────────────────────
// Accessible by: admin only

export async function getAllUsers() {
  await requireRole(['admin']);

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);
}

// ─── Assign Role ──────────────────────────────────────────────────────────────
// Admin assigns a role to any user.
// Accessible by: admin only

const assignRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['admin', 'doctor', 'receptionist', 'patient'], {
    message: 'Invalid role',
  }),
});

export async function assignRole(input: unknown) {
  const session = await requireRole(['admin']);

  const { userId, role } = assignRoleSchema.parse(input);

  // Prevent admin from accidentally removing their own admin role
  if (userId === session.user.id && role !== 'admin') {
    throw new Error('You cannot remove your own admin role.');
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId));

  if (!existing) throw new Error('User not found.');

  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  return updated;
}
