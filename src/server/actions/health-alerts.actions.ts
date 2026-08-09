'use server';

import { db } from '@/server/db';
import { healthAlerts } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, and, or, isNull, desc, gte } from 'drizzle-orm';
import { z } from 'zod';

// ─── Community Health Alerts ──────────────────────────────────────────────────

const createAlertSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255).trim(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000).trim(),
  disease: z.string().max(100).trim().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  city: z.string().max(100).trim().optional(), // empty = all cities
  expiresAt: z.string().optional(), // ISO datetime string, optional
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;

// ─── Create a Health Alert (admin-only) ───────────────────────────────────────

export async function createHealthAlert(input: unknown) {
  await requireRole(['admin']);
  const data = createAlertSchema.parse(input);

  const [alert] = await db
    .insert(healthAlerts)
    .values({
      title: data.title,
      message: data.message,
      disease: data.disease || null,
      severity: data.severity,
      city: data.city || null, // null = broadcast to all cities
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    })
    .returning();

  return alert;
}

// ─── Get Active Alerts for a Patient's City ───────────────────────────────────
// Returns non-expired alerts that target the given city OR all cities (null).
// Patient-facing.

export async function getActiveAlertsForCity(city: string | null) {
  await requireRole(['admin', 'doctor', 'receptionist', 'patient']);

  const now = new Date();

  return db
    .select()
    .from(healthAlerts)
    .where(
      and(
        // Not expired (expiresAt is null = never expires)
        or(isNull(healthAlerts.expiresAt), gte(healthAlerts.expiresAt, now)),
        // Targets the patient's city OR all cities (null city = broadcast)
        or(isNull(healthAlerts.city), eq(healthAlerts.city, city ?? '')),
      ),
    )
    .orderBy(desc(healthAlerts.severity), desc(healthAlerts.createdAt));
}

// ─── Get All Alerts (admin management list) ───────────────────────────────────

export async function getAllHealthAlerts() {
  await requireRole(['admin']);

  return db
    .select()
    .from(healthAlerts)
    .orderBy(desc(healthAlerts.createdAt));
}

// ─── Delete a Health Alert ────────────────────────────────────────────────────

export async function deleteHealthAlert(id: string) {
  await requireRole(['admin']);

  await db.delete(healthAlerts).where(eq(healthAlerts.id, id));
  return { success: true };
}
