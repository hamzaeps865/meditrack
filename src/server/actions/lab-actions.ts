'use server';

import { db } from '@/server/db';
import { labOrders, labTests, visits, patients, doctors, users } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, and, desc, asc, ilike, or, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';

// ─── Lab Test Catalog Search (for doctor autocomplete) ────────────────────────

export async function searchLabCatalog(query: string, limit = 10) {
  await requireRole(['admin', 'doctor', 'lab']);
  const term = `%${query.trim()}%`;
  if (!query.trim()) return [];

  return db
    .select({
      id: labTests.id,
      name: labTests.name,
      shortName: labTests.shortName,
      category: labTests.category,
      sampleType: labTests.sampleType,
      referenceRange: labTests.referenceRange,
    })
    .from(labTests)
    .where(or(ilike(labTests.name, term), ilike(labTests.shortName, term)))
    .limit(limit);
}

// ─── Get Lab Queue (lab technician view) ──────────────────────────────────────
// All ordered + sample_collected tests, sorted by priority then wait time.

export async function getLabQueue() {
  await requireRole(['admin', 'lab']);

  return db
    .select({
      id: labOrders.id,
      testName: labOrders.testName,
      priority: labOrders.priority,
      status: labOrders.status,
      instructions: labOrders.instructions,
      createdAt: labOrders.createdAt,
      collectedAt: labOrders.collectedAt,
      patientName: patients.name,
      patientId: labOrders.patientId,
      doctorName: users.name,
      visitId: labOrders.visitId,
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .leftJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .where(
      and(
        sql`${labOrders.status} in ('ordered', 'sample_collected', 'in_progress')`,
      ),
    )
    .orderBy(
      // stat first, then urgent, then routine
      sql`case ${labOrders.priority} when 'stat' then 0 when 'urgent' then 1 else 2 end`,
      asc(labOrders.createdAt),
    );
}

// ─── Collect Sample ───────────────────────────────────────────────────────────

export async function collectSample(labOrderId: string) {
  const session = await requireRole(['admin', 'lab']);

  const [updated] = await db
    .update(labOrders)
    .set({ status: 'sample_collected', collectedAt: new Date() })
    .where(eq(labOrders.id, labOrderId))
    .returning();

  return updated;
}

// ─── Submit Lab Result ────────────────────────────────────────────────────────

const submitResultSchema = z.object({
  labOrderId: z.string().uuid(),
  result: z.string().min(1, 'Result is required').max(5000).trim(),
  notes: z.string().max(2000).trim().optional(),
});

export async function submitLabResult(input: unknown) {
  const session = await requireRole(['admin', 'lab']);
  const data = submitResultSchema.parse(input);

  const [updated] = await db
    .update(labOrders)
    .set({
      status: 'completed',
      result: data.result,
      performedBy: session.user.id,
      completedAt: new Date(),
    })
    .where(eq(labOrders.id, data.labOrderId))
    .returning();

  return updated;
}

// ─── Get Completed Lab Orders (lab history) ───────────────────────────────────

export async function getCompletedLabOrders(limit = 100) {
  await requireRole(['admin', 'lab']);

  return db
    .select({
      id: labOrders.id,
      testName: labOrders.testName,
      result: labOrders.result,
      priority: labOrders.priority,
      patientName: patients.name,
      performedByName: users.name,
      completedAt: labOrders.completedAt,
      createdAt: labOrders.createdAt,
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .leftJoin(users, eq(labOrders.performedBy, users.id))
    .where(eq(labOrders.status, 'completed'))
    .orderBy(desc(labOrders.completedAt))
    .limit(limit);
}

// ─── Get Lab Orders for Doctor (results visible) ──────────────────────────────

export async function getLabOrdersForDoctorVisit(visitId: string) {
  await requireRole(['admin', 'doctor']);

  return db
    .select({
      id: labOrders.id,
      testName: labOrders.testName,
      status: labOrders.status,
      result: labOrders.result,
      priority: labOrders.priority,
      completedAt: labOrders.completedAt,
      createdAt: labOrders.createdAt,
    })
    .from(labOrders)
    .where(eq(labOrders.visitId, visitId))
    .orderBy(desc(labOrders.createdAt));
}

// ─── Get Lab Summary (admin dashboard) ────────────────────────────────────────

export async function getLabSummary() {
  await requireRole(['admin', 'lab']);

  const [summary] = await db
    .select({
      total: sql<number>`count(*)`,
      pending: sql<number>`count(*) filter (where ${labOrders.status} in ('ordered', 'sample_collected', 'in_progress'))`,
      completed: sql<number>`count(*) filter (where ${labOrders.status} = 'completed')`,
      statCount: sql<number>`count(*) filter (where ${labOrders.priority} = 'stat' and ${labOrders.status} != 'completed')`,
    })
    .from(labOrders);

  return {
    total: Number(summary?.total ?? 0),
    pending: Number(summary?.pending ?? 0),
    completed: Number(summary?.completed ?? 0),
    statCount: Number(summary?.statCount ?? 0),
  };
}

// ─── Get Lab Test by ID (for result form with reference range) ────────────────

export async function getLabOrderForResult(labOrderId: string) {
  await requireRole(['admin', 'lab']);

  const [order] = await db
    .select({
      id: labOrders.id,
      testName: labOrders.testName,
      status: labOrders.status,
      instructions: labOrders.instructions,
      priority: labOrders.priority,
      patientName: patients.name,
      patientId: labOrders.patientId,
      doctorName: users.name,
      // Try to match the test name to the catalog for reference ranges
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .leftJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .where(eq(labOrders.id, labOrderId));

  // Look up reference range from catalog
  let referenceRange: string | null = null;
  if (order) {
    const [catalogMatch] = await db
      .select({ referenceRange: labTests.referenceRange, sampleType: labTests.sampleType })
      .from(labTests)
      .where(
        or(
          ilike(labTests.name, `%${order.testName}%`),
          ilike(labTests.shortName, `%${order.testName}%`),
        ),
      )
      .limit(1);
    referenceRange = catalogMatch?.referenceRange ?? null;
  }

  return order ? { ...order, referenceRange } : null;
}
