import { pgTable, uuid, integer, text, timestamp, unique, pgEnum } from 'drizzle-orm/pg-core';
import { doctors } from './doctors';
import { patients } from './patients';
import { appointments } from './appointments';

// ─── Doctor Reviews ───────────────────────────────────────────────────────────
// Verified-consultation-only reviews: one review per appointment. A patient can
// only review a doctor after a completed appointment with them.

export const doctorReviews = pgTable(
  'doctor_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id').notNull().references(() => doctors.id),
    patientId: uuid('patient_id').notNull().references(() => patients.id),
    // The appointment that earned the review — unique, so one review per visit
    appointmentId: uuid('appointment_id').notNull().references(() => appointments.id),
    rating: integer('rating').notNull(), // 1–5
    comment: text('comment'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // One review per appointment — prevents duplicate reviews
    appointmentReviewUnique: unique().on(table.appointmentId),
  }),
);
