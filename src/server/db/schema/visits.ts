import { pgTable, uuid, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { appointments } from './appointments';
import { doctors } from './doctors';
import { patients } from './patients';

export const visits = pgTable('visits', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id').notNull().unique().references(() => appointments.id),
  doctorId: uuid('doctor_id').notNull().references(() => doctors.id),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  chiefComplaint: text('chief_complaint'),
  diagnosis: text('diagnosis'),
  notes: text('notes'),
  vitalsBp: varchar('vitals_bp', { length: 20 }),
  vitalsTemp: varchar('vitals_temp', { length: 10 }),
  vitalsWeight: varchar('vitals_weight', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});