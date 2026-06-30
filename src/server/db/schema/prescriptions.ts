import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { visits } from './visits';

export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitId: uuid('visit_id').notNull().references(() => visits.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const prescriptionItems = pgTable('prescription_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  prescriptionId: uuid('prescription_id').notNull().references(() => prescriptions.id, { onDelete: 'cascade' }),
  medicineName: varchar('medicine_name', { length: 255 }).notNull(),
  dosage: varchar('dosage', { length: 100 }).notNull(),
  frequency: varchar('frequency', { length: 100 }).notNull(),
  duration: varchar('duration', { length: 100 }).notNull(),
  notes: varchar('notes', { length: 255 }),
});