import { pgTable, uuid, varchar, text } from 'drizzle-orm/pg-core';

// ─── Lab Test Catalog ─────────────────────────────────────────────────────────
// Predefined lab tests with reference ranges for the result entry form.
// Doctors get autocomplete from this catalog when ordering tests.

export const labTests = pgTable('lab_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),       // Full name: "Complete Blood Count"
  shortName: varchar('short_name', { length: 50 }),        // Abbreviation: "CBC"
  category: varchar('category', { length: 100 }),          // Hematology, Biochemistry, etc.
  sampleType: varchar('sample_type', { length: 50 }),      // Blood, Urine, Stool, Sputum
  referenceRange: text('reference_range'),                  // e.g. "Hb: 13-17 g/dL, WBC: 4-11 ×10⁹/L"
  units: varchar('units', { length: 100 }),                 // e.g. "g/dL, ×10⁹/L"
});
