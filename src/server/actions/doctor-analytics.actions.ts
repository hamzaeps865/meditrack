'use server';

import { db } from '@/server/db';
import { visits, appointments, doctors, doctorReviews } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, and, sql, gte, desc } from 'drizzle-orm';
import { subDays, startOfDay, formatISO } from 'date-fns';
import { getDoctorRatingSummary } from '@/server/actions/reviews.actions';

// ─── Doctor Analytics ─────────────────────────────────────────────────────────
// Aggregates a doctor's clinical activity: visits, appointments, diagnoses, and
// ratings. Guarded to the logged-in doctor's own profile.

export async function getDoctorAnalytics() {
  const session = await requireRole(['doctor']);

  // Resolve the doctor profile for this user
  const [doctor] = await db
    .select({ id: doctors.id, specialization: doctors.specialization })
    .from(doctors)
    .where(eq(doctors.userId, session.user.id));
  if (!doctor) throw new Error('Doctor profile not found.');
  const doctorId = doctor.id;

  // ── Aggregate queries (run in parallel) ────────────────────────────────────
  const now = new Date();
  const fourteenDaysAgo = subDays(startOfDay(now), 13); // 14 days inclusive of today

  const [
    [visitCount],
    [distinctPatients],
    [apptStats],
    visitsByDay,
    topDiagnoses,
    ratingSummary,
    ratingDistribution,
  ] = await Promise.all([
    // Total visits
    db
      .select({ total: sql<number>`count(*)` })
      .from(visits)
      .where(eq(visits.doctorId, doctorId)),

    // Distinct patients seen
    db
      .select({ total: sql<number>`count(distinct ${visits.patientId})` })
      .from(visits)
      .where(eq(visits.doctorId, doctorId)),

    // Appointment status distribution
    db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${appointments.status} = 'completed')`,
        cancelled: sql<number>`count(*) filter (where ${appointments.status} in ('cancelled','no_show'))`,
        scheduled: sql<number>`count(*) filter (where ${appointments.status} in ('scheduled','checked_in','in_progress'))`,
      })
      .from(appointments)
      .where(eq(appointments.doctorId, doctorId)),

    // Visits per day for the last 14 days (trend)
    db
      .select({
        day: sql<string>`to_char(date(${visits.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
      })
      .from(visits)
      .where(and(eq(visits.doctorId, doctorId), gte(visits.createdAt, fourteenDaysAgo)))
      .groupBy(sql`date(${visits.createdAt})`)
      .orderBy(sql`date(${visits.createdAt})`),

    // Top 5 diagnoses
    db
      .select({
        diagnosis: visits.diagnosis,
        count: sql<number>`count(*)`,
      })
      .from(visits)
      .where(and(eq(visits.doctorId, doctorId), sql`${visits.diagnosis} is not null`))
      .groupBy(visits.diagnosis)
      .orderBy(desc(sql`count(*)`))
      .limit(5),

    // Rating summary (reuse)
    getDoctorRatingSummary(doctorId),

    // Rating distribution (1-5 stars)
    db
      .select({
        rating: doctorReviews.rating,
        count: sql<number>`count(*)`,
      })
      .from(doctorReviews)
      .where(eq(doctorReviews.doctorId, doctorId))
      .groupBy(doctorReviews.rating),
  ]);

  // Build the full 14-day trend (fill missing days with 0)
  const trend: { day: string; label: string; count: number }[] = [];
  const dayMap = new Map(visitsByDay.map((r) => [r.day, Number(r.count)]));
  for (let i = 13; i >= 0; i--) {
    const d = subDays(startOfDay(now), i);
    const key = formatISO(d, { representation: 'date' });
    trend.push({
      day: key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      count: dayMap.get(key) ?? 0,
    });
  }

  // Rating distribution as a map
  const distMap = new Map<number, number>();
  for (const r of ratingDistribution) {
    distMap.set(r.rating, Number(r.count));
  }

  const totalAppts = Number(apptStats?.total ?? 0);
  const completedAppts = Number(apptStats?.completed ?? 0);
  const completionRate = totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 100) : 0;

  return {
    specialization: doctor.specialization,
    totalVisits: Number(visitCount?.total ?? 0),
    distinctPatients: Number(distinctPatients?.total ?? 0),
    appointmentStats: {
      total: totalAppts,
      completed: completedAppts,
      cancelled: Number(apptStats?.cancelled ?? 0),
      scheduled: Number(apptStats?.scheduled ?? 0),
      completionRate,
    },
    visitsTrend: trend,
    topDiagnoses: topDiagnoses
      .filter((d) => d.diagnosis)
      .map((d) => ({ diagnosis: d.diagnosis!, count: Number(d.count) })),
    rating: {
      average: ratingSummary.average,
      count: ratingSummary.count,
      distribution: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: distMap.get(star) ?? 0,
      })),
    },
  };
}
