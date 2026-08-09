'use server';

import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// ─── Profile Photo ────────────────────────────────────────────────────────────
// Stores a base64 data URI directly in the users table. Client-side canvas
// resizes to 128×128 before upload, keeping the payload ~10-15KB.

const avatarSchema = z.object({
  avatarUrl: z.string().max(150000).startsWith('data:image/'), // max ~150KB base64
});

export async function updateAvatar(input: unknown) {
  const session = await requireRole(['admin', 'doctor', 'receptionist', 'patient', 'nurse', 'pharmacist']);
  const data = avatarSchema.parse(input);

  await db
    .update(users)
    .set({ avatarUrl: data.avatarUrl })
    .where(eq(users.id, session.user.id));

  return { success: true };
}
