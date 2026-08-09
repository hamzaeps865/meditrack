import { pgTable, uuid, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { prescriptionItems } from './prescriptions';

// ─── Medication Reminders ─────────────────────────────────────────────────────
// Auto-generated from prescription items when a visit completes. Tracks the
// next-dose time so the patient portal + notification bell can surface reminders.

export const medicationReminders = pgTable('medication_reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  prescriptionItemId: uuid('prescription_item_id').references(() => prescriptionItems.id),
  medicineName: varchar('medicine_name', { length: 255 }).notNull(),
  dosage: varchar('dosage', { length: 100 }).notNull(),
  frequency: varchar('frequency', { length: 100 }).notNull(),
  // When the next dose should be taken
  nextDoseAt: timestamp('next_dose_at').notNull(),
  // Interval in hours between doses (parsed from frequency at creation time)
  intervalHours: integer('interval_hours'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
