'use server';

import { db } from '@/server/db';
import { invoices, systemSettings, visits, appointments, patients, doctors, users } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { startOfDay, endOfDay } from 'date-fns';

// ─── Billing Actions ──────────────────────────────────────────────────────────

const DEFAULT_FEE_CENTS = 200000; // Rs 2000.00 in paisa (fallback if not configured)

/**
 * Internal: auto-generate an invoice when a visit completes. Reads the
 * consultation fee from system_settings (key 'consultation_fee'). Best-effort —
 * never blocks the visit completion. Idempotent (unique on visitId).
 */
export async function autoGenerateInvoice(params: {
  visitId: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
}) {
  try {
    // Read the configured fee
    const [feeRow] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, 'consultation_fee'));
    const amount = feeRow ? Number(feeRow.value) : DEFAULT_FEE_CENTS;

    await db.insert(invoices).values({
      visitId: params.visitId,
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      doctorId: params.doctorId,
      amount,
      status: 'pending',
    });
  } catch (err) {
    // Unique violation = invoice already exists for this visit; not an error
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('23505')) {
      console.error('[billing] autoGenerateInvoice failed:', msg);
    }
  }
}

// ─── Get Invoices (admin/receptionist) ────────────────────────────────────────

export async function getInvoices(filters?: {
  status?: 'pending' | 'paid' | 'waived';
  todayOnly?: boolean;
}) {
  await requireRole(['admin', 'receptionist']);

  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(invoices.status, filters.status));
  }
  if (filters?.todayOnly) {
    const now = new Date();
    conditions.push(gte(invoices.createdAt, startOfDay(now)));
    conditions.push(lte(invoices.createdAt, endOfDay(now)));
  }

  return db
    .select({
      id: invoices.id,
      amount: invoices.amount,
      status: invoices.status,
      paymentMethod: invoices.paymentMethod,
      createdAt: invoices.createdAt,
      paidAt: invoices.paidAt,
      patientName: patients.name,
      doctorName: users.name,
      specialization: doctors.specialization,
    })
    .from(invoices)
    .leftJoin(patients, eq(invoices.patientId, patients.id))
    .leftJoin(doctors, eq(invoices.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(invoices.createdAt));
}

// ─── Get Billing Summary ──────────────────────────────────────────────────────

export async function getBillingSummary() {
  await requireRole(['admin', 'receptionist']);

  const [summary] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${invoices.amount}) filter (where ${invoices.status} = 'paid'), 0)`,
      outstanding: sql<number>`coalesce(sum(${invoices.amount}) filter (where ${invoices.status} = 'pending'), 0)`,
      totalInvoices: sql<number>`count(*)`,
      pendingCount: sql<number>`count(*) filter (where ${invoices.status} = 'pending')`,
      paidCount: sql<number>`count(*) filter (where ${invoices.status} = 'paid')`,
    })
    .from(invoices);

  return {
    totalRevenue: Number(summary?.totalRevenue ?? 0),
    outstanding: Number(summary?.outstanding ?? 0),
    totalInvoices: Number(summary?.totalInvoices ?? 0),
    pendingCount: Number(summary?.pendingCount ?? 0),
    paidCount: Number(summary?.paidCount ?? 0),
  };
}

// ─── Mark Invoice Paid ────────────────────────────────────────────────────────

const markPaidSchema = z.object({
  id: z.string().uuid(),
  paymentMethod: z.string().max(50).optional(),
});

export async function markInvoicePaid(input: unknown) {
  await requireRole(['admin', 'receptionist']);
  const data = markPaidSchema.parse(input);

  const [updated] = await db
    .update(invoices)
    .set({ status: 'paid', paidAt: new Date(), paymentMethod: data.paymentMethod ?? 'cash' })
    .where(eq(invoices.id, data.id))
    .returning();

  return updated;
}

// ─── Get Invoice for Print (enriched receipt) ─────────────────────────────────

export async function getInvoiceForPrint(id: string) {
  await requireRole(['admin', 'receptionist', 'doctor', 'patient']);

  const [invoice] = await db
    .select({
      id: invoices.id,
      amount: invoices.amount,
      status: invoices.status,
      paymentMethod: invoices.paymentMethod,
      createdAt: invoices.createdAt,
      paidAt: invoices.paidAt,
      visitId: invoices.visitId,
      patientId: invoices.patientId,
      patientName: patients.name,
      patientPhone: patients.phone,
      doctorName: users.name,
      specialization: doctors.specialization,
    })
    .from(invoices)
    .leftJoin(patients, eq(invoices.patientId, patients.id))
    .leftJoin(doctors, eq(invoices.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .where(eq(invoices.id, id));

  if (!invoice) throw new Error('Invoice not found.');

  return invoice;
}

// ─── Get Outstanding Balance for a Patient ────────────────────────────────────

export async function getOutstandingBalance(patientId: string) {
  await requireRole(['admin', 'receptionist', 'patient']);

  const [row] = await db
    .select({
      outstanding: sql<number>`coalesce(sum(${invoices.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.patientId, patientId),
        eq(invoices.status, 'pending'),
      ),
    );

  return {
    outstanding: Number(row?.outstanding ?? 0),
    pendingCount: Number(row?.count ?? 0),
  };
}
