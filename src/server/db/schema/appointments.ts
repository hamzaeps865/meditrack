import { pgTable, uuid, timestamp, varchar, text, boolean, pgEnum, unique } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { doctors } from './doctors';
import { users } from './users';

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'walk_in',
]);

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  doctorId: uuid('doctor_id').notNull().references(() => doctors.id),
  scheduledAt: timestamp('scheduled_at').notNull(),
  status: appointmentStatusEnum('status').notNull().default('scheduled'),
  reason: text('reason'),
  isWalkIn: boolean('is_walk_in').default(false).notNull(),
  // Self-FK: if set, this appointment is a follow-up of the referenced one
  followUpOfId: uuid('follow_up_of_id'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  doctorSlotUnique: unique().on(table.doctorId, table.scheduledAt),
}));