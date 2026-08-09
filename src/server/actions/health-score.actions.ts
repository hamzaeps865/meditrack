'use server';

import { db } from '@/server/db';
import { healthPoints, appointments } from '@/server/db/schema';
import { requireRole, assertPatientOwnsPatientRecord } from '@/server/auth/rbac';
import { eq, and, sql, notInArray, desc } from 'drizzle-orm';
import {
  tierForScore,
  nextTier,
  tierForMonths,
} from '@/lib/gamification';

// ─── Award Points (internal helper — fire-and-forget, idempotent) ──────────────
// Idempotency comes from the unique(recordId, reason) constraint: re-awarding
// the same record+reason is a no-op (the insert throws 23505 and we swallow it).

export async function awardPoints(
  patientId: string,
  points: number,
  reason: 'appointment_completed' | 'review_posted' | 'blood_donation',
  recordId: string,
) {
  try {
    await db.insert(healthPoints).values({ patientId, points, reason, recordId });
  } catch (err) {
    // Unique violation = already awarded; not an error. Anything else is logged.
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('23505')) {
      console.error('[health-score] awardPoints failed:', msg);
    }
  }
}

// ─── Get Health Score for a Patient ───────────────────────────────────────────

export async function getHealthScore(patientId: string) {
  const session = await requireRole(['admin', 'patient']);
  if (session.user.role === 'patient') {
    await assertPatientOwnsPatientRecord(patientId, session);
  }

  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${healthPoints.points}), 0)` })
    .from(healthPoints)
    .where(eq(healthPoints.patientId, patientId));

  const total = Number(row?.total ?? 0);
  const tier = tierForScore(total);
  const next = nextTier(total);

  // Recent points activity
  const recent = await db
    .select({
      points: healthPoints.points,
      reason: healthPoints.reason,
      createdAt: healthPoints.createdAt,
    })
    .from(healthPoints)
    .where(eq(healthPoints.patientId, patientId))
    .orderBy(desc(healthPoints.createdAt))
    .limit(5);

  return { total, tier, next, recent };
}

// ─── Loyalty Tier (computed from active months) ───────────────────────────────
// Counts distinct calendar months in which the patient had a non-cancelled
// appointment, then maps to a loyalty tier.

export async function getLoyaltyTier(patientId: string) {
  const session = await requireRole(['admin', 'patient']);
  if (session.user.role === 'patient') {
    await assertPatientOwnsPatientRecord(patientId, session);
  }

  const [row] = await db
    .select({
      months: sql<number>`count(distinct date_trunc('month', ${appointments.createdAt}))`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        notInArray(appointments.status, ['cancelled', 'no_show']),
      ),
    );

  const activeMonths = Number(row?.months ?? 0);
  return { activeMonths, tier: tierForMonths(activeMonths) };
}
