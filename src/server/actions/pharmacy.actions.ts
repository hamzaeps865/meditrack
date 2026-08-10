'use server';

import { db } from '@/server/db';
import {
  medicines, medicineInventory, dispensings,
  prescriptionItems, prescriptions, visits, patients, users, doctors,
} from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, and, or, ilike, desc, sql, isNull, gte, sum } from 'drizzle-orm';
import { z } from 'zod';
import { addDays, format } from 'date-fns';

// ─── Medicine Catalog ─────────────────────────────────────────────────────────

/**
 * Autocomplete search for doctors. Searches by brand name OR generic name.
 * Open to all authenticated clinical roles.
 */
export async function searchMedicines(query: string, limit = 10) {
  await requireRole(['admin', 'doctor', 'nurse', 'receptionist']);
  const term = `%${query.trim()}%`;
  if (!query.trim()) return [];

  return db
    .select({
      id: medicines.id,
      name: medicines.name,
      genericName: medicines.genericName,
      category: medicines.category,
      form: medicines.form,
      strength: medicines.strength,
    })
    .from(medicines)
    .where(
      or(
        ilike(medicines.name, term),
        ilike(medicines.genericName, term),
      ),
    )
    .orderBy(medicines.name)
    .limit(limit);
}

/**
 * Full catalog list for admin management.
 */
export async function getAllMedicines() {
  await requireRole(['admin']);
  return db.select().from(medicines).orderBy(medicines.name);
}

const addMedicineSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  genericName: z.string().max(255).trim().optional(),
  category: z.string().max(100).trim().optional(),
  form: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'inhaler', 'other']).optional(),
  strength: z.string().max(50).trim().optional(),
  manufacturer: z.string().max(255).trim().optional(),
  reorderLevel: z.number().int().min(0).default(50),
  unitPriceCents: z.number().int().min(0).default(0),
});

export async function addMedicine(input: unknown) {
  await requireRole(['admin']);
  const data = addMedicineSchema.parse(input);
  const [medicine] = await db.insert(medicines).values(data).returning();
  return medicine;
}

export async function updateMedicine(id: string, input: unknown) {
  await requireRole(['admin']);
  const data = addMedicineSchema.partial().parse(input);
  const [updated] = await db
    .update(medicines)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(medicines.id, id))
    .returning();
  return updated;
}

// ─── Inventory Management ─────────────────────────────────────────────────────

/**
 * Returns all inventory batches joined with medicine info.
 * Optionally filter by medicineId.
 */
export async function getInventory(medicineId?: string) {
  await requireRole(['admin', 'doctor', 'pharmacist']);

  return db
    .select({
      id: medicineInventory.id,
      medicineId: medicineInventory.medicineId,
      medicineName: medicines.name,
      genericName: medicines.genericName,
      form: medicines.form,
      strength: medicines.strength,
      batchNumber: medicineInventory.batchNumber,
      quantityInStock: medicineInventory.quantityInStock,
      reorderLevel: medicineInventory.reorderLevel,
      expiryDate: medicineInventory.expiryDate,
      costPriceCents: medicineInventory.costPriceCents,
      supplier: medicineInventory.supplier,
      receivedAt: medicineInventory.receivedAt,
      unitPriceCents: medicines.unitPriceCents,
    })
    .from(medicineInventory)
    .innerJoin(medicines, eq(medicineInventory.medicineId, medicines.id))
    .where(medicineId ? eq(medicineInventory.medicineId, medicineId) : undefined)
    .orderBy(medicines.name, medicineInventory.expiryDate);
}

const addStockSchema = z.object({
  medicineId: z.string().uuid(),
  batchNumber: z.string().max(100).trim().optional(),
  quantityInStock: z.number().int().min(0),
  reorderLevel: z.number().int().min(0).default(50),
  expiryDate: z.string().optional(),
  costPriceCents: z.number().int().min(0).default(0),
  supplier: z.string().max(255).trim().optional(),
  receivedAt: z.string().optional(),
});

export async function addStock(input: unknown) {
  await requireRole(['admin']);
  const data = addStockSchema.parse(input);
  const [batch] = await db
    .insert(medicineInventory)
    .values({
      ...data,
      expiryDate: data.expiryDate || null,
      receivedAt: data.receivedAt || format(new Date(), 'yyyy-MM-dd'),
    })
    .returning();
  return batch;
}

export async function adjustStock(id: string, newQuantity: number) {
  await requireRole(['admin']);
  const [updated] = await db
    .update(medicineInventory)
    .set({ quantityInStock: newQuantity, updatedAt: new Date() })
    .where(eq(medicineInventory.id, id))
    .returning();
  return updated;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

/**
 * Medicines where total stock (across all batches) ≤ reorder level.
 */
export async function getLowStockAlerts() {
  await requireRole(['admin']);

  const rows = await db
    .select({
      medicineId: medicineInventory.medicineId,
      medicineName: medicines.name,
      genericName: medicines.genericName,
      totalStock: sql<number>`sum(${medicineInventory.quantityInStock})`,
      reorderLevel: sql<number>`max(${medicineInventory.reorderLevel})`,
    })
    .from(medicineInventory)
    .innerJoin(medicines, eq(medicineInventory.medicineId, medicines.id))
    .groupBy(medicineInventory.medicineId, medicines.name, medicines.genericName)
    .having(sql`sum(${medicineInventory.quantityInStock}) <= max(${medicineInventory.reorderLevel})`)
    .orderBy(medicines.name);

  return rows.map((r) => ({
    ...r,
    totalStock: Number(r.totalStock),
    reorderLevel: Number(r.reorderLevel),
  }));
}

/**
 * Batches expiring within N days.
 */
export async function getExpiryAlerts(daysAhead = 30) {
  await requireRole(['admin']);
  const cutoff = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');

  return db
    .select({
      id: medicineInventory.id,
      medicineId: medicineInventory.medicineId,
      medicineName: medicines.name,
      batchNumber: medicineInventory.batchNumber,
      quantityInStock: medicineInventory.quantityInStock,
      expiryDate: medicineInventory.expiryDate,
    })
    .from(medicineInventory)
    .innerJoin(medicines, eq(medicineInventory.medicineId, medicines.id))
    .where(
      and(
        sql`${medicineInventory.expiryDate} is not null`,
        sql`${medicineInventory.expiryDate} <= ${cutoff}`,
        gte(medicineInventory.quantityInStock, 1),
      ),
    )
    .orderBy(medicineInventory.expiryDate);
}

/**
 * Summary stats for the pharmacy dashboard.
 */
export async function getPharmacySummary() {
  await requireRole(['admin']);

  const [medCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(medicines);

  const [stockValue] = await db
    .select({ total: sql<number>`coalesce(sum(${medicineInventory.quantityInStock}::bigint * ${medicineInventory.costPriceCents}::bigint), 0)::numeric` })
    .from(medicineInventory);

  const lowStock = await getLowStockAlerts();
  const expiring = await getExpiryAlerts(30);

  return {
    totalMedicines: Number(medCount?.total ?? 0),
    stockValueCents: Number(stockValue?.total ?? 0),
    lowStockCount: lowStock.length,
    expiringCount: expiring.length,
    lowStock,
    expiring,
  };
}

// ─── Dispensing ───────────────────────────────────────────────────────────────

/**
 * Dispense a prescription item from a specific batch. Decrements stock + records
 * the dispensing. One dispensing per prescription item (unique constraint).
 */
export async function dispensePrescriptionItem(input: {
  prescriptionItemId: string;
  medicineId: string;
  inventoryBatchId: string;
  quantity: number;
  notes?: string;
}) {
  const session = await requireRole(['admin', 'pharmacist']);

  // Check not already dispensed
  const [existing] = await db
    .select({ id: dispensings.id })
    .from(dispensings)
    .where(eq(dispensings.prescriptionItemId, input.prescriptionItemId));
  if (existing) throw new Error('This item has already been dispensed.');

  // Check stock
  const [batch] = await db
    .select()
    .from(medicineInventory)
    .where(eq(medicineInventory.id, input.inventoryBatchId));
  if (!batch) throw new Error('Batch not found.');
  if (batch.quantityInStock < input.quantity) {
    throw new Error(`Insufficient stock. Only ${batch.quantityInStock} units available.`);
  }

  // Decrement stock + record dispensing in a transaction
  return db.transaction(async (tx) => {
    await tx
      .update(medicineInventory)
      .set({
        quantityInStock: batch.quantityInStock - input.quantity,
        updatedAt: new Date(),
      })
      .where(eq(medicineInventory.id, input.inventoryBatchId));

    const [dispensing] = await tx
      .insert(dispensings)
      .values({
        prescriptionItemId: input.prescriptionItemId,
        medicineId: input.medicineId,
        inventoryBatchId: input.inventoryBatchId,
        quantityDispensed: input.quantity,
        dispensedBy: session.user.id,
        notes: input.notes || null,
      })
      .returning();

    return dispensing;
  });
}

/**
 * Pending dispensings: prescription items from completed visits that haven't
 * been dispensed yet. This is the pharmacy queue.
 */
export async function getPendingDispensings() {
  await requireRole(['admin', 'pharmacist']);

  return db
    .select({
      id: prescriptionItems.id,
      medicineName: prescriptionItems.medicineName,
      medicineId: prescriptionItems.medicineId,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      patientName: patients.name,
      doctorName: users.name,
      prescriptionCreatedAt: prescriptions.createdAt,
    })
    .from(prescriptionItems)
    .innerJoin(prescriptions, eq(prescriptionItems.prescriptionId, prescriptions.id))
    .innerJoin(visits, eq(prescriptions.visitId, visits.id))
    .leftJoin(patients, eq(visits.patientId, patients.id))
    .leftJoin(doctors, eq(visits.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .leftJoin(dispensings, eq(prescriptionItems.id, dispensings.prescriptionItemId))
    .where(isNull(dispensings.id))
    .orderBy(desc(prescriptions.createdAt));
}

// ─── Undo Dispensing (admin + pharmacist) ─────────────────────────────────────
// Reverses a dispensing: restores stock + removes the dispensing record.
// The prescription item becomes pending again.

export async function undoDispensing(dispensingId: string) {
  const session = await requireRole(['admin', 'pharmacist']);

  const [dispensing] = await db
    .select()
    .from(dispensings)
    .where(eq(dispensings.id, dispensingId));

  if (!dispensing) throw new Error('Dispensing record not found.');

  return db.transaction(async (tx) => {
    // 1. Restore stock to the batch
    await tx
      .update(medicineInventory)
      .set({
        quantityInStock: sql`${medicineInventory.quantityInStock} + ${dispensing.quantityDispensed}`,
        updatedAt: new Date(),
      })
      .where(eq(medicineInventory.id, dispensing.inventoryBatchId));

    // 2. Delete the dispensing record (makes the prescription item pending again)
    await tx.delete(dispensings).where(eq(dispensings.id, dispensingId));

    return { success: true };
  });
}

// ─── Get Dispense History (admin + pharmacist) ────────────────────────────────

export async function getDispenseHistory(limit = 50) {
  await requireRole(['admin', 'pharmacist']);

  return db
    .select({
      id: dispensings.id,
      medicineName: prescriptionItems.medicineName,
      quantityDispensed: dispensings.quantityDispensed,
      dispensedAt: dispensings.dispensedAt,
      patientName: patients.name,
      dispensedByName: users.name,
      notes: dispensings.notes,
    })
    .from(dispensings)
    .innerJoin(prescriptionItems, eq(dispensings.prescriptionItemId, prescriptionItems.id))
    .innerJoin(visits, eq(prescriptions.visitId, visits.id))
    .leftJoin(patients, eq(visits.patientId, patients.id))
    .leftJoin(users, eq(dispensings.dispensedBy, users.id))
    .orderBy(desc(dispensings.dispensedAt))
    .limit(limit);
}

// ─── Add Medicine (admin only) ────────────────────────────────────────────────
// Exposed via the admin catalog tab UI

const addMedicineUISchema = z.object({
  name: z.string().min(1).max(255).trim(),
  genericName: z.string().max(255).trim().optional(),
  category: z.string().max(100).trim().optional(),
  form: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'inhaler', 'other']).optional(),
  strength: z.string().max(50).trim().optional(),
  manufacturer: z.string().max(255).trim().optional(),
  reorderLevel: z.number().int().min(0).default(50),
  unitPriceCents: z.number().int().min(0).default(0),
});

export async function addMedicineUI(input: unknown) {
  await requireRole(['admin']);
  const data = addMedicineUISchema.parse(input);
  const [medicine] = await db.insert(medicines).values(data).returning();
  return medicine;
}

// ─── Adjust Stock (admin only) ────────────────────────────────────────────────

export async function adjustStockUI(id: string, newQuantity: number) {
  await requireRole(['admin']);
  if (newQuantity < 0) throw new Error('Quantity cannot be negative.');
  const [updated] = await db
    .update(medicineInventory)
    .set({ quantityInStock: newQuantity, updatedAt: new Date() })
    .where(eq(medicineInventory.id, id))
    .returning();
  return updated;
}
