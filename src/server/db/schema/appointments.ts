import { pgTable, uuid, timestamp, varchar, text, pgEnum, unique } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { doctors } from './doctors';
import { users } from './users';

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show',
]);

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  doctorId: uuid('doctor_id').notNull().references(() => doctors.id),
  scheduledAt: timestamp('scheduled_at').notNull(),
  status: appointmentStatusEnum('status').notNull().default('scheduled'),
  reason: text('reason'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  doctorSlotUnique: unique().on(table.doctorId, table.scheduledAt),
}));