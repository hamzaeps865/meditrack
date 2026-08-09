import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { appointments } from './appointments';
import { users } from './users';

// ─── Triage ───────────────────────────────────────────────────────────────────
// Recorded by a nurse BEFORE the doctor sees the patient. Captures vitals +
// chief complaint + a severity score so the queue can be prioritized.

export const triageSeverityEnum = pgEnum('triage_severity', [
  'critical', 'urgent', 'standard', 'low',
]);

export const triage = pgTable('triage', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  appointmentId: uuid('appointment_id').references(() => appointments.id),
  // The nurse who recorded the triage
  nurseUserId: uuid('nurse_user_id').notNull().references(() => users.id),
  severity: triageSeverityEnum('severity').notNull().default('standard'),
  chiefComplaint: text('chief_complaint'),
  // Vitals (mirrors the visits table naming for consistency)
  vitalsBp: varchar('vitals_bp', { length: 20 }),
  vitalsTemp: varchar('vitals_temp', { length: 10 }),
  vitalsWeight: varchar('vitals_weight', { length: 10 }),
  vitalsPulse: varchar('vitals_pulse', { length: 10 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
