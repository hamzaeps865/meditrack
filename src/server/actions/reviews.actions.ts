'use server';

import { db } from '@/server/db';
import { doctorReviews, appointments, doctors, patients, users } from '@/server/db/schema';
import { requireRole, assertPatientOwnsPatientRecord } from '@/server/auth/rbac';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createReviewSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  doctorId: z.string().uuid('Invalid doctor ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(2000, 'Comment is too long').trim().optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ─── Create Review ────────────────────────────────────────────────────────────
// Patient-only. The appointment must belong to the patient, be with the named
// doctor, and be completed. One review per appointment (enforced by DB unique).

export async function createReview(input: unknown) {
  const session = await requireRole(['patient']);

  const data = createReviewSchema.parse(input);

  // Load the appointment and verify ownership + completion + doctor match
  const [appt] = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      status: appointments.status,
    })
    .from(appointments)
    .where(eq(appointments.id, data.appointmentId));

  if (!appt) throw new Error('Appointment not found.');
  if (appt.status !== 'completed') {
    throw new Error('You can only review doctors after a completed appointment.');
  }
  if (appt.doctorId !== data.doctorId) {
    throw new Error('This appointment was not with that doctor.');
  }

  // Verify the patient owns this appointment (email-join)
  await assertPatientOwnsPatientRecord(appt.patientId, session);

  // Prevent double-reviewing (the DB unique constraint also guards this)
  const [existing] = await db
    .select({ id: doctorReviews.id })
    .from(doctorReviews)
    .where(eq(doctorReviews.appointmentId, data.appointmentId));
  if (existing) throw new Error('You have already reviewed this appointment.');

  const [review] = await db
    .insert(doctorReviews)
    .values({
      doctorId: data.doctorId,
      patientId: appt.patientId,
      appointmentId: data.appointmentId,
      rating: data.rating,
      comment: data.comment || null,
    })
    .returning();

  // Bonus engagement: award health points for posting a review (best-effort)
  try {
    const { awardPoints } = await import('@/server/actions/health-score.actions');
    await awardPoints(appt.patientId, 10, 'review_posted', review.id);
  } catch (err) {
    console.error('[reviews] failed to award review points:', err);
  }

  return review;
}

// ─── Get Reviews for a Doctor ─────────────────────────────────────────────────
// Returns all reviews for a doctor with the patient's name. Open to all roles.

export async function getReviewsForDoctor(doctorId: string, limit = 50) {
  await requireRole(['admin', 'doctor', 'receptionist', 'patient']);

  return db
    .select({
      id: doctorReviews.id,
      rating: doctorReviews.rating,
      comment: doctorReviews.comment,
      createdAt: doctorReviews.createdAt,
      patientName: patients.name,
    })
    .from(doctorReviews)
    .innerJoin(patients, eq(doctorReviews.patientId, patients.id))
    .where(eq(doctorReviews.doctorId, doctorId))
    .orderBy(desc(doctorReviews.createdAt))
    .limit(limit);
}

// ─── Get Rating Summary for a Doctor ──────────────────────────────────────────
// Returns { average, count }.

export async function getDoctorRatingSummary(doctorId: string) {
  await requireRole(['admin', 'doctor', 'receptionist', 'patient']);

  const [row] = await db
    .select({
      average: sql<number>`coalesce(avg(${doctorReviews.rating}), 0)::numeric(2,1)`,
      count: sql<number>`count(${doctorReviews.id})`,
    })
    .from(doctorReviews)
    .where(eq(doctorReviews.doctorId, doctorId));

  return { average: Number(row?.average ?? 0), count: Number(row?.count ?? 0) };
}

// ─── Get Rating Summaries for Many Doctors (for directory/lists) ──────────────

export async function getDoctorRatingSummaries(doctorIds: string[]) {
  await requireRole(['admin', 'doctor', 'receptionist', 'patient']);
  if (doctorIds.length === 0) return new Map<string, { average: number; count: number }>();

  const rows = await db
    .select({
      doctorId: doctorReviews.doctorId,
      average: sql<number>`coalesce(avg(${doctorReviews.rating}), 0)::numeric(2,1)`,
      count: sql<number>`count(${doctorReviews.id})`,
    })
    .from(doctorReviews)
    .where(inArray(doctorReviews.doctorId, doctorIds))
    .groupBy(doctorReviews.doctorId);

  return new Map(
    rows.map((r) => [r.doctorId, { average: Number(r.average), count: Number(r.count) }]),
  );
}

// ─── Get Review for a Specific Appointment ────────────────────────────────────
// Lets the UI know whether the patient already left a review for this visit.

export async function getReviewForAppointment(appointmentId: string) {
  await requireRole(['admin', 'doctor', 'receptionist', 'patient']);

  const [row] = await db
    .select({
      id: doctorReviews.id,
      rating: doctorReviews.rating,
      comment: doctorReviews.comment,
      createdAt: doctorReviews.createdAt,
    })
    .from(doctorReviews)
    .where(eq(doctorReviews.appointmentId, appointmentId));

  return row ?? null;
}

// ─── Get Reviews Authored by a Patient (for their own dashboard) ──────────────

export async function getReviewsByPatient(patientId: string) {
  const session = await requireRole(['admin', 'patient']);
  if (session.user.role === 'patient') {
    await assertPatientOwnsPatientRecord(patientId, session);
  }

  return db
    .select({
      id: doctorReviews.id,
      rating: doctorReviews.rating,
      comment: doctorReviews.comment,
      createdAt: doctorReviews.createdAt,
      doctorId: doctorReviews.doctorId,
      doctorName: users.name,
      specialization: doctors.specialization,
    })
    .from(doctorReviews)
    .leftJoin(doctors, eq(doctorReviews.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .where(eq(doctorReviews.patientId, patientId))
    .orderBy(desc(doctorReviews.createdAt));
}
