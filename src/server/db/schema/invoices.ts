import { pgTable, uuid, integer, text, timestamp, varchar, pgEnum, unique } from 'drizzle-orm/pg-core';
import { visits } from './visits';
import { appointments } from './appointments';
import { patients } from './patients';
import { doctors } from './doctors';

// ─── Invoices ─────────────────────────────────────────────────────────────────
// Auto-generated when a visit completes. Amount stored in integer cents to avoid
// float precision issues (e.g. 2000 = Rs 20.00, or 200000 = Rs 2000 depending
// on the clinic's currency config). One invoice per visit (unique constraint).

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'pending', 'paid', 'waived',
]);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    visitId: uuid('visit_id').notNull().references(() => visits.id),
    appointmentId: uuid('appointment_id').notNull().references(() => appointments.id),
    patientId: uuid('patient_id').notNull().references(() => patients.id),
    doctorId: uuid('doctor_id').notNull().references(() => doctors.id),
    // Amount in the smallest currency unit (cents/paisa) to avoid float issues
    amount: integer('amount').notNull(),
    status: invoiceStatusEnum('status').notNull().default('pending'),
    paymentMethod: varchar('payment_method', { length: 50 }),
    notes: text('notes'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    paidAt: timestamp('paid_at'),
  },
  (table) => ({
    visitInvoiceUnique: unique().on(table.visitId),
  }),
);
