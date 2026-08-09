import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { visits } from './visits';
import { doctors } from './doctors';
import { patients } from './patients';

// ─── Lab Orders ───────────────────────────────────────────────────────────────
// Doctor-ordered lab tests tied to a visit. Results are recorded manually when
// they come back.

export const labOrderStatusEnum = pgEnum('lab_order_status', [
  'ordered', 'completed', 'cancelled',
]);

export const labOrders = pgTable('lab_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitId: uuid('visit_id').notNull().references(() => visits.id),
  doctorId: uuid('doctor_id').notNull().references(() => doctors.id),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  testName: varchar('test_name', { length: 255 }).notNull(),
  instructions: text('instructions'),
  status: labOrderStatusEnum('status').notNull().default('ordered'),
  result: text('result'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});
