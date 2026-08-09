import { pgTable, uuid, integer, varchar, timestamp, unique, pgEnum } from 'drizzle-orm/pg-core';
import { patients } from './patients';

// ─── Gamified Health Score ────────────────────────────────────────────────────
// Append-only points log (mirrors the audit_logs pattern). Each row records
// why points were awarded and to which patient. The unique constraint on
// (recordId, reason) makes point-awarding idempotent: a retry or double-trigger
// can't award the same points twice for the same event.

export const healthPointReasonEnum = pgEnum('health_point_reason', [
  'appointment_completed',
  'review_posted',
  'blood_donation',
]);

export const healthPoints = pgTable(
  'health_points',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id').notNull().references(() => patients.id),
    points: integer('points').notNull(),
    reason: healthPointReasonEnum('reason').notNull(),
    // The record that triggered the award (appointment id, review id, …)
    recordId: uuid('record_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Idempotency: the same record + reason can only award once
    recordReasonUnique: unique().on(table.recordId, table.reason),
  }),
);
