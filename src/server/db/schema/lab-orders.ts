import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { visits } from './visits';
import { doctors } from './doctors';
import { patients } from './patients';
import { users } from './users';

// ─── Lab Orders ───────────────────────────────────────────────────────────────
// Doctor-ordered lab tests tied to a visit. The lab technician processes them
// through the queue: ordered → sample_collected → completed.

export const labOrderStatusEnum = pgEnum('lab_order_status', [
  'ordered', 'sample_collected', 'in_progress', 'completed', 'cancelled',
]);

export const labOrders = pgTable('lab_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitId: uuid('visit_id').notNull().references(() => visits.id),
  doctorId: uuid('doctor_id').notNull().references(() => doctors.id),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  testName: varchar('test_name', { length: 255 }).notNull(),
  instructions: text('instructions'),
  priority: varchar('priority', { length: 20 }).notNull().default('routine'), // routine/urgent/stat
  status: labOrderStatusEnum('status').notNull().default('ordered'),
  result: text('result'),
  // The lab technician who processed the test
  performedBy: uuid('performed_by').references(() => users.id),
  collectedAt: timestamp('collected_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
