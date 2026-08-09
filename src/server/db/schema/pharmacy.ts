import {
  pgTable, uuid, varchar, text, timestamp, date,
  integer, pgEnum, unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { prescriptionItems } from './prescriptions';

// ─── Medicine Catalog ─────────────────────────────────────────────────────────
// Master list of medicines. Seeded with common Pakistan medicines. Doctors use
// this for autocomplete when prescribing; pharmacists use it for dispensing.

export const medicineFormEnum = pgEnum('medicine_form', [
  'tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'inhaler', 'other',
]);

export const medicines = pgTable('medicines', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),          // Brand name e.g. "Panadol"
  genericName: varchar('generic_name', { length: 255 }),     // Generic e.g. "Paracetamol"
  category: varchar('category', { length: 100 }),            // e.g. "Analgesic", "Antibiotic"
  form: medicineFormEnum('form'),                            // tablet/syrup/injection/etc.
  strength: varchar('strength', { length: 50 }),             // e.g. "500mg"
  manufacturer: varchar('manufacturer', { length: 255 }),
  description: text('description'),                          // OpenFDA-enriched info (cached)
  reorderLevel: integer('reorder_level').default(50).notNull(),
  unitPriceCents: integer('unit_price_cents').default(0).notNull(), // Selling price in paisa
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Medicine Inventory / Stock ───────────────────────────────────────────────
// Each batch of a medicine is a separate row (different expiry dates).
// Total stock of a medicine = sum of all batch quantities.

export const medicineInventory = pgTable('medicine_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  medicineId: uuid('medicine_id').notNull().references(() => medicines.id, { onDelete: 'cascade' }),
  batchNumber: varchar('batch_number', { length: 100 }),
  quantityInStock: integer('quantity_in_stock').notNull().default(0),
  reorderLevel: integer('reorder_level').default(50).notNull(),
  expiryDate: date('expiry_date'),
  costPriceCents: integer('cost_price_cents').default(0).notNull(),
  receivedAt: date('received_at'),
  supplier: varchar('supplier', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Dispensings ──────────────────────────────────────────────────────────────
// Records each time a prescription item is dispensed from inventory.
// One dispensing per prescription item (unique constraint).

export const dispensings = pgTable(
  'dispensings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    prescriptionItemId: uuid('prescription_item_id').notNull().references(() => prescriptionItems.id),
    medicineId: uuid('medicine_id').notNull().references(() => medicines.id),
    inventoryBatchId: uuid('inventory_batch_id').notNull().references(() => medicineInventory.id),
    quantityDispensed: integer('quantity_dispensed').notNull().default(0),
    dispensedBy: uuid('dispensed_by').notNull().references(() => users.id),
    dispensedAt: timestamp('dispensed_at').defaultNow().notNull(),
    notes: text('notes'),
  },
  (table) => ({
    prescriptionItemUnique: unique().on(table.prescriptionItemId),
  }),
);
