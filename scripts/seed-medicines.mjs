import 'dotenv/config';
import ws from 'ws';
import { neonConfig, Pool } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Common Pakistan Medicines ────────────────────────────────────────────────
// Brand name, generic, category, form, strength, manufacturer, reorder level, unit price (paisa)

const medicines = [
  // ── Analgesics / Antipyretics ──
  ['Panadol', 'Paracetamol', 'Analgesic', 'tablet', '500mg', 'GSK', 100, 200],
  ['Panadol Extra', 'Paracetamol+Caffeine', 'Analgesic', 'tablet', '500mg', 'GSK', 50, 300],
  ['Calpol', 'Paracetamol', 'Analgesic', 'syrup', '120mg/5ml', 'GSK', 30, 1500],
  ['Brufen', 'Ibuprofen', 'NSAID', 'tablet', '400mg', 'Abbott', 80, 400],
  ['Brufen Syrup', 'Ibuprofen', 'NSAID', 'syrup', '100mg/5ml', 'Abbott', 20, 2500],
  ['Disprol', 'Paracetamol', 'Analgesic', 'tablet', '500mg', 'Reckitt', 40, 200],
  ['Synflex', 'Naproxen', 'NSAID', 'tablet', '250mg', 'Abbott', 50, 500],
  ['Ponstan', 'Mefenamic Acid', 'NSAID', 'tablet', '500mg', 'Pfizer', 60, 350],
  ['Arinac Forte', 'Ibuprofen+Pseudoephedrine', 'Cold/Flu', 'tablet', '400mg', 'Abbott', 40, 450],

  // ── Antibiotics ──
  ['Augmentin', 'Amoxicillin+Clavulanate', 'Antibiotic', 'tablet', '625mg', 'GSK', 80, 1800],
  ['Amoxil', 'Amoxicillin', 'Antibiotic', 'capsule', '500mg', 'GSK', 100, 300],
  ['Amoxil Syrup', 'Amoxicillin', 'Antibiotic', 'syrup', '125mg/5ml', 'GSK', 30, 1200],
  ['Ciproxin', 'Ciprofloxacin', 'Antibiotic', 'tablet', '500mg', 'Bayer', 60, 600],
  ['Klaricid', 'Clarithromycin', 'Antibiotic', 'tablet', '500mg', 'Abbott', 50, 1500],
  ['Zithromax', 'Azithromycin', 'Antibiotic', 'tablet', '500mg', 'Pfizer', 60, 900],
  ['Flagyl', 'Metronidazole', 'Antibiotic', 'tablet', '400mg', 'Sanofi', 70, 250],
  ['Flagyl Syrup', 'Metronidazole', 'Antibiotic', 'syrup', '200mg/5ml', 'Sanofi', 20, 1000],
  ['Bactrim', 'Co-trimoxazole', 'Antibiotic', 'tablet', '480mg', 'Roche', 50, 300],
  ['Cefspan', 'Cefixime', 'Antibiotic', 'capsule', '400mg', 'PharmEvo', 40, 1200],
  ['Ceftriaxone', 'Ceftriaxone', 'Antibiotic', 'injection', '1g', 'Generic', 30, 800],
  ['Fucidin Cream', 'Fusidic Acid', 'Antibiotic', 'cream', '2%', 'Leo', 25, 500],
  ['Erythrocin', 'Erythromycin', 'Antibiotic', 'tablet', '500mg', 'Abbott', 40, 400],

  // ── Gastrointestinal ──
  ['Motilium', 'Domperidone', 'Antiemetic', 'tablet', '10mg', 'Johnson & Johnson', 80, 250],
  ['Risek', 'Omeprazole', 'PPI', 'capsule', '20mg', 'Getz Pharma', 100, 400],
  ['Nexium', 'Esomeprazole', 'PPI', 'tablet', '40mg', 'AstraZeneca', 50, 800],
  ['Pantoloc', 'Pantoprazole', 'PPI', 'tablet', '40mg', 'Takeda', 50, 500],
  ['Gaviscon', 'Sodium Alginate', 'Antacid', 'syrup', '500mg/5ml', 'Reckitt', 30, 1800],
  ['Lomotil', 'Diphenoxylate+Atropine', 'Antidiarrheal', 'tablet', '2.5mg', 'Pfizer', 40, 300],
  ['Buscopan', 'Hyoscine Butylbromide', 'Antispasmodic', 'tablet', '10mg', 'Sanofi', 40, 450],
  ['Smecta', 'Diosmectite', 'Antidiarrheal', 'other', '3g sachet', 'Beaufour Ipsen', 30, 1200],
  ['Maxolon', 'Metoclopramide', 'Antiemetic', 'tablet', '10mg', 'Sanofi', 40, 200],

  // ── Cardiovascular ──
  ['Tenormin', 'Atenolol', 'Beta Blocker', 'tablet', '50mg', 'AstraZeneca', 80, 300],
  ['Capoten', 'Captopril', 'ACE Inhibitor', 'tablet', '25mg', 'Bristol-Myers Squibb', 50, 400],
  ['Lasix', 'Furosemide', 'Diuretic', 'tablet', '40mg', 'Sanofi', 60, 200],
  ['Lipitor', 'Atorvastatin', 'Statin', 'tablet', '20mg', 'Pfizer', 50, 600],
  ['Concor', 'Bisoprolol', 'Beta Blocker', 'tablet', '5mg', 'Merck', 50, 400],
  ['Amlodipine', 'Amlodipine', 'CCB', 'tablet', '5mg', 'Generic', 80, 200],
  ['Coversyl', 'Perindopril', 'ACE Inhibitor', 'tablet', '4mg', 'Servier', 40, 500],
  ['Isordil', 'Isosorbide Dinitrate', 'Vasodilator', 'tablet', '5mg', 'AstraZeneca', 30, 300],
  ['Clexane', 'Enoxaparin', 'Anticoagulant', 'injection', '40mg/0.4ml', 'Sanofi', 20, 2500],

  // ── Antidiabetic ──
  ['Glucophage', 'Metformin', 'Antidiabetic', 'tablet', '500mg', 'Merck', 100, 250],
  ['Glucophage XR', 'Metformin XR', 'Antidiabetic', 'tablet', '1000mg', 'Merck', 50, 400],
  ['Daonil', 'Glibenclamide', 'Antidiabetic', 'tablet', '5mg', 'Sanofi', 40, 200],
  ['Lantus', 'Insulin Glargine', 'Insulin', 'injection', '100IU/ml', 'Sanofi', 15, 4500],
  ['Novomix', 'Insulin Aspart', 'Insulin', 'injection', '100IU/ml', 'Novo Nordisk', 15, 4200],

  // ── Respiratory ──
  ['Ventolin', 'Salbutamol', 'Bronchodilator', 'inhaler', '100mcg', 'GSK', 30, 800],
  ['Ventolin Syrup', 'Salbutamol', 'Bronchodilator', 'syrup', '2mg/5ml', 'GSK', 20, 1000],
  ['Singulair', 'Montelukast', 'Anti-asthma', 'tablet', '10mg', 'Merck', 40, 700],
  ['Symbicort', 'Budesonide+Formoterol', 'Anti-asthma', 'inhaler', '160/4.5mcg', 'AstraZeneca', 20, 3500],
  ['Seretide', 'Fluticasone+Salmeterol', 'Anti-asthma', 'inhaler', '250/25mcg', 'GSK', 20, 3200],
  ['Phenergan', 'Promethazine', 'Antihistamine', 'tablet', '25mg', 'Sanofi', 40, 250],
  ['Claritek', 'Loratadine', 'Antihistamine', 'tablet', '10mg', 'Abbott', 50, 300],
  ['Zyrtec', 'Cetirizine', 'Antihistamine', 'tablet', '10mg', 'UCB', 50, 300],
  ['Actifed', 'Triprolidine+Pseudoephedrine', 'Cold/Flu', 'syrup', '—', 'GSK', 25, 1200],
  ['Sedil', 'Dextromethorphan', 'Cough Suppressant', 'syrup', '10mg/5ml', 'PharmEvo', 25, 800],

  // ── Vitamins & Supplements ──
  ['Centrum', 'Multivitamin', 'Supplement', 'tablet', '—', 'Pfizer', 50, 800],
  ['Caltrate', 'Calcium+Vitamin D', 'Supplement', 'tablet', '600mg', 'Pfizer', 40, 600],
  ['Fefol', 'Iron+Folic Acid', 'Supplement', 'capsule', '—', 'GSK', 50, 400],
  ['Neurobion', 'B-Complex Vitamins', 'Supplement', 'tablet', '—', 'Merck', 40, 500],
  ['Vitamin D3', 'Cholecalciferol', 'Supplement', 'capsule', '5000IU', 'Generic', 60, 300],
  ['Vitamin C', 'Ascorbic Acid', 'Supplement', 'tablet', '500mg', 'Generic', 80, 200],
  ['Folic Acid', 'Folic Acid', 'Supplement', 'tablet', '5mg', 'Generic', 50, 100],
  ['Becosules', 'B-Complex', 'Supplement', 'capsule', '—', 'Pfizer', 40, 350],

  // ── Antimalarial ──
  ['Lariam', 'Mefloquine', 'Antimalarial', 'tablet', '250mg', 'Roche', 20, 600],
  ['Arinate', 'Artemether', 'Antimalarial', 'tablet', '80mg', 'PharmEvo', 20, 500],
  ['Fansidar', 'Sulfadoxine+Pyrimethamine', 'Antimalarial', 'tablet', '500/25mg', 'Roche', 15, 400],
  ['Chloroquine', 'Chloroquine Phosphate', 'Antimalarial', 'tablet', '250mg', 'Generic', 30, 200],

  // ── CNS / Psychiatric ──
  ['Valium', 'Diazepam', 'Anxiolytic', 'tablet', '5mg', 'Roche', 30, 200],
  ['Xanax', 'Alprazolam', 'Anxiolytic', 'tablet', '0.5mg', 'Pfizer', 30, 300],
  ['Tegretol', 'Carbamazepine', 'Anticonvulsant', 'tablet', '200mg', 'Novartis', 30, 350],
  ['Encorate', 'Sodium Valproate', 'Anticonvulsant', 'tablet', '200mg', 'Sun Pharma', 30, 400],
  ['Seroquel', 'Quetiapine', 'Antipsychotic', 'tablet', '25mg', 'AstraZeneca', 20, 800],
  ['Lexapro', 'Escitalopram', 'Antidepressant', 'tablet', '10mg', 'Lundbeck', 25, 600],
  ['Pakser', 'Sertraline', 'Antidepressant', 'tablet', '50mg', 'Pfizer', 25, 500],
  ['Imovane', 'Zopiclone', 'Hypnotic', 'tablet', '7.5mg', 'Sanofi', 20, 400],

  // ── Steroids / Hormones ──
  ['Dexamethasone', 'Dexamethasone', 'Corticosteroid', 'tablet', '0.5mg', 'Generic', 40, 200],
  ['Prednisolone', 'Prednisolone', 'Corticosteroid', 'tablet', '5mg', 'Generic', 40, 200],
  ['Ventide', 'Betamethasone', 'Corticosteroid', 'injection', '4mg/ml', 'Generic', 15, 300],
  ['Eltroxin', 'Levothyroxine', 'Thyroid Hormone', 'tablet', '50mcg', 'GSK', 40, 300],
  ['Neomercazole', 'Carbimazole', 'Antithyroid', 'tablet', '5mg', 'Roche', 20, 350],

  // ── Eye / Ear Drops ──
  ['Tobrex', 'Tobramycin', 'Antibiotic', 'drops', '0.3%', 'Alcon', 25, 600],
  ['Vigamox', 'Moxifloxacin', 'Antibiotic', 'drops', '0.5%', 'Alcon', 20, 800],
  ['Tear Naturals', 'Artificial Tears', 'Lubricant', 'drops', '—', 'Alcon', 25, 500],

  // ── Misc / Emergency ──
  ['Adrenaline', 'Epinephrine', 'Emergency', 'injection', '1mg/ml', 'Generic', 10, 300],
  ['Atropine', 'Atropine Sulphate', 'Emergency', 'injection', '0.6mg/ml', 'Generic', 10, 250],
  ['Diazepam Injection', 'Diazepam', 'Emergency', 'injection', '10mg/2ml', 'Generic', 10, 200],
  ['Ondem', 'Ondansetron', 'Antiemetic', 'tablet', '4mg', 'Cipla', 40, 350],
  ['Risek IV', 'Omeprazole', 'PPI', 'injection', '40mg', 'Getz Pharma', 20, 700],
  ['Paracetamol IV', 'Paracetamol', 'Analgesic', 'injection', '1g/100ml', 'Generic', 15, 500],
  ['Tramadol', 'Tramadol', 'Analgesic', 'capsule', '50mg', 'Generic', 40, 300],
  ['Tramadol IV', 'Tramadol', 'Analgesic', 'injection', '50mg/ml', 'Generic', 15, 250],
  ['Ketorolac', 'Ketorolac', 'NSAID', 'injection', '30mg/ml', 'Generic', 15, 350],

  // ── Women's Health ──
  ['Primolut N', 'Norethisterone', 'Hormone', 'tablet', '5mg', 'Bayer', 20, 400],
  ['Duphaston', 'Dydrogesterone', 'Hormone', 'tablet', '10mg', 'Abbott', 20, 800],
  ['Femilon', 'Ethinylestradiol+Desogestrel', 'Contraceptive', 'tablet', '—', 'Organon', 15, 600],

  // ── Skin ──
  ['Hydrocortisone Cream', 'Hydrocortisone', 'Corticosteroid', 'cream', '1%', 'Generic', 25, 300],
  ['Betnovate', 'Betamethasone', 'Corticosteroid', 'cream', '0.1%', 'GSK', 25, 400],
  ['Canesten', 'Clotrimazole', 'Antifungal', 'cream', '1%', 'Bayer', 25, 500],
  ['Acnedap', 'Dapsone', 'Acne Treatment', 'cream', '5%', 'Generic', 20, 600],

  // ── Additional Common ──
  ['Risek 40', 'Omeprazole', 'PPI', 'capsule', '40mg', 'Getz Pharma', 40, 600],
  ['Ciproxin 250', 'Ciprofloxacin', 'Antibiotic', 'tablet', '250mg', 'Bayer', 40, 400],
  ['Zinnat', 'Cefuroxime', 'Antibiotic', 'tablet', '250mg', 'GSK', 40, 1000],
  ['Moxacin', 'Amoxicillin', 'Antibiotic', 'capsule', '250mg', 'Generic', 60, 200],
  ['Risek MUPS', 'Omeprazole', 'PPI', 'tablet', '20mg', 'Getz Pharma', 50, 450],
  ['Surbex Z', 'B-Complex+Zinc', 'Supplement', 'tablet', '—', 'Abbott', 40, 450],
  ['Glucon-D', 'Glucose', 'Energy', 'other', '—', 'Heinz', 30, 300],
  ['ORS', 'Oral Rehydration Salts', 'Rehydration', 'other', '—', 'Generic', 50, 150],
  ['Risek Insta', 'Omeprazole', 'PPI', 'capsule', '20mg', 'Getz Pharma', 30, 400],
  ['Calpol 250', 'Paracetamol', 'Analgesic', 'syrup', '250mg/5ml', 'GSK', 25, 1000],
  ['Brufen 600', 'Ibuprofen', 'NSAID', 'tablet', '600mg', 'Abbott', 40, 500],
  ['Ponstan 250', 'Mefenamic Acid', 'NSAID', 'syrup', '50mg/ml', 'Pfizer', 20, 800],
];

async function main() {
  console.log(`Seeding ${medicines.length} medicines...`);
  let inserted = 0;
  let skipped = 0;

  for (const [name, genericName, category, form, strength, manufacturer, reorder, price] of medicines) {
    try {
      await pool.query(
        `INSERT INTO medicines (name, generic_name, category, form, strength, manufacturer, reorder_level, unit_price_cents)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8
         WHERE NOT EXISTS (
           SELECT 1 FROM medicines
           WHERE lower(name) = lower($1) AND coalesce(strength, '') = coalesce($5, '')
         )`,
        [name, genericName, category, form, strength, manufacturer, reorder, price],
      );
      inserted++;
    } catch (e) {
      // Skip duplicates
      skipped++;
    }
  }

  console.log(`✓ Inserted ${inserted} medicines, skipped ${skipped} duplicates.`);
  console.log('Seed complete. Doctors will now see these in the medicine autocomplete.');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
