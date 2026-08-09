'use server';

import { db } from '@/server/db';
import { systemSettings, supportRequests, users } from '@/server/db/schema';
import { requireRole, requireSession } from '@/server/auth/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// ─── System Settings ──────────────────────────────────────────────────────────

const BCRYPT_ROUNDS_PLACEHOLDER = 12; // (not used here; kept for reference parity)

/** Load a single setting by key (admin-only). */
export async function getSystemSetting(key: string): Promise<string | null> {
  await requireRole(['admin']);
  const [row] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, key));
  return row?.value ?? null;
}

/** Load all settings as a key→value object (admin-only). */
export async function getSystemSettings(): Promise<Record<string, string>> {
  await requireRole(['admin']);
  const rows = await db.select().from(systemSettings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

const settingsInputSchema = z.record(z.string(), z.string().max(5000));

/**
 * Persist a batch of setting key/values (admin-only).
 * Upserts each key — existing rows are updated, new rows inserted.
 */
export async function setSystemSettings(input: unknown) {
  await requireRole(['admin']);
  const data = settingsInputSchema.parse(input);

  for (const [key, value] of Object.entries(data)) {
    const [existing] = await db
      .select({ id: systemSettings.id })
      .from(systemSettings)
      .where(eq(systemSettings.key, key));

    if (existing) {
      await db
        .update(systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value });
    }
  }

  return { success: true };
}

// ─── Support Requests (Help Center contact form) ──────────────────────────────

const createSupportRequestSchema = z.object({
  subject: z.string().min(2, 'Subject is required').max(255).trim(),
  message: z.string().min(10, 'Please provide a little more detail').max(5000).trim(),
});

export type CreateSupportRequestInput = z.infer<typeof createSupportRequestSchema>;

/**
 * Submit a support request. Available to any authenticated user.
 * The submitter's name/email/userId are resolved from the session so the form
 * only needs to collect subject + message.
 */
export async function createSupportRequest(input: unknown) {
  const session = await requireSession();
  const data = createSupportRequestSchema.parse(input);

  // Resolve the user's stored name + email for the support record
  const [userRow] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id));

  await db.insert(supportRequests).values({
    userId: session.user.id,
    name: userRow?.name ?? session.user.name ?? 'Unknown',
    email: userRow?.email ?? session.user.email ?? 'unknown@example.com',
    subject: data.subject,
    message: data.message,
    status: 'open',
  });

  return { success: true };
}

void BCRYPT_ROUNDS_PLACEHOLDER;
