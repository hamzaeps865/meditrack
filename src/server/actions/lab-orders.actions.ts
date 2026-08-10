'use server';

import { db } from '@/server/db';
import { labOrders, visits, doctors } from '@/server/db/schema';
import { requireRole, assertDoctorOwnsResource } from '@/server/auth/rbac';
import { and, eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// ─── Lab Order Actions ────────────────────────────────────────────────────────

const createLabOrdersSchema = z.object({
  visitId: z.string().uuid(),
  orders: z
    .array(
      z.object({
        testName: z.string().min(2, 'Test name is required').max(255).trim(),
        instructions: z.string().max(1000).trim().optional(),
      }),
    )
    .min(1, 'At least one lab order is required'),
});

export type CreateLabOrdersInput = z.infer<typeof createLabOrdersSchema>;

// ─── Create Lab Orders (doctor/admin) ─────────────────────────────────────────

export async function createLabOrders(input: unknown) {
  const session = await requireRole(['admin', 'doctor']);
  const data = createLabOrdersSchema.parse(input);

  // Resolve the visit → doctor for ownership
  const [visit] = await db
    .select({ doctorId: visits.doctorId, patientId: visits.patientId })
    .from(visits)
    .where(eq(visits.id, data.visitId));

  if (!visit) throw new Error('Visit not found.');

  if (session.user.role === 'doctor') {
    const [doctor] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, visit.doctorId));
    if (doctor) await assertDoctorOwnsResource(doctor.userId);
  }

  // Insert all lab orders
  const created = await db
    .insert(labOrders)
    .values(
      data.orders.map((order) => ({
        visitId: data.visitId,
        doctorId: visit.doctorId,
        patientId: visit.patientId,
        testName: order.testName,
        instructions: order.instructions || null,
        status: 'ordered' as const,
      })),
    )
    .returning();

  return created;
}

// ─── Get Lab Orders for a Visit ───────────────────────────────────────────────

export async function getLabOrdersForVisit(visitId: string) {
  await requireRole(['admin', 'doctor', 'patient']);

  return db
    .select()
    .from(labOrders)
    .where(eq(labOrders.visitId, visitId))
    .orderBy(desc(labOrders.createdAt));
}

// ─── Update Lab Result (doctor/admin) ─────────────────────────────────────────

const updateResultSchema = z.object({
  id: z.string().uuid(),
  result: z.string().min(1, 'Result is required').max(5000).trim(),
});

export async function updateLabResult(input: unknown) {
  await requireRole(['admin', 'doctor']);
  const data = updateResultSchema.parse(input);

  const [updated] = await db
    .update(labOrders)
    .set({ result: data.result, status: 'completed', completedAt: new Date() })
    .where(eq(labOrders.id, data.id))
    .returning();

  return updated;
}

// ─── Get Lab Orders for a Patient (patient portal) ────────────────────────────

export async function getLabOrdersForPatient(patientId: string) {
  await requireRole(['admin', 'doctor', 'patient']);

  return db
    .select({
      id: labOrders.id,
      testName: labOrders.testName,
      instructions: labOrders.instructions,
      status: labOrders.status,
      result: labOrders.result,
      createdAt: labOrders.createdAt,
      completedAt: labOrders.completedAt,
      visitCreatedAt: visits.createdAt,
    })
    .from(labOrders)
    .innerJoin(visits, eq(labOrders.visitId, visits.id))
    .where(
      and(
        eq(visits.patientId, patientId),
        eq(labOrders.status, 'completed'),
        sql`coalesce(${labOrders.result}, '') <> ''`,
      ),
    )
    .orderBy(desc(labOrders.createdAt));
}

export async function getLabOrderForPatient(patientId: string, orderId: string) {
  await requireRole(['admin', 'doctor', 'patient']);

  const [row] = await db
    .select({
      id: labOrders.id,
      testName: labOrders.testName,
      instructions: labOrders.instructions,
      status: labOrders.status,
      result: labOrders.result,
      createdAt: labOrders.createdAt,
      completedAt: labOrders.completedAt,
      visitCreatedAt: visits.createdAt,
    })
    .from(labOrders)
    .innerJoin(visits, eq(labOrders.visitId, visits.id))
    .where(and(eq(labOrders.id, orderId), eq(visits.patientId, patientId)));

  return row ?? null;
}
