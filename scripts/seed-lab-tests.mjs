import 'dotenv/config';
import ws from 'ws';
import { neonConfig, Pool } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Common Lab Tests ─────────────────────────────────────────────────────────
// [name, shortName, category, sampleType, referenceRange, units]

const tests = [
  // Hematology
  ['Complete Blood Count', 'CBC', 'Hematology', 'Blood', 'Hb: 13-17 g/dL (M), 12-15 g/dL (F)\nWBC: 4-11 ×10⁹/L\nPlatelets: 150-450 ×10⁹/L\nRBC: 4.5-6.0 ×10¹²/L (M), 4.0-5.2 ×10¹²/L (F)', 'g/dL, ×10⁹/L'],
  ['Hemoglobin', 'Hb', 'Hematology', 'Blood', 'Male: 13-17 g/dL\nFemale: 12-15 g/dL', 'g/dL'],
  ['Erythrocyte Sedimentation Rate', 'ESR', 'Hematology', 'Blood', 'Male: 0-15 mm/hr\nFemale: 0-20 mm/hr', 'mm/hr'],
  ['Blood Group', 'ABO/Rh', 'Hematology', 'Blood', 'A+, A-, B+, B-, AB+, AB-, O+, O-', '—'],
  ['Peripheral Blood Smear', 'PBS', 'Hematology', 'Blood', 'No abnormal cells seen', '—'],
  ['Reticulocyte Count', 'Retic', 'Hematology', 'Blood', '0.5-2.5%', '%'],

  // Biochemistry
  ['Blood Sugar Random', 'BSR', 'Biochemistry', 'Blood', '70-140 mg/dL', 'mg/dL'],
  ['Blood Sugar Fasting', 'FBS', 'Biochemistry', 'Blood', '70-100 mg/dL (fasting)', 'mg/dL'],
  ['HbA1c', 'HbA1c', 'Biochemistry', 'Blood', '< 5.7% (normal)\n5.7-6.4% (pre-diabetes)\n≥ 6.5% (diabetes)', '%'],
  ['Liver Function Tests', 'LFTs', 'Biochemistry', 'Blood', 'ALT: 7-56 U/L\nAST: 10-40 U/L\nBilirubin: 0.3-1.2 mg/dL\nALP: 44-147 U/L', 'U/L, mg/dL'],
  ['Lipid Profile', 'Lipid', 'Biochemistry', 'Blood', 'Total Cholesterol: < 200 mg/dL\nHDL: > 40 mg/dL (M), > 50 mg/dL (F)\nLDL: < 100 mg/dL\nTriglycerides: < 150 mg/dL', 'mg/dL'],
  ['Urea', 'Urea', 'Biochemistry', 'Blood', '7-20 mg/dL', 'mg/dL'],
  ['Creatinine', 'Cr', 'Biochemistry', 'Blood', '0.6-1.2 mg/dL', 'mg/dL'],
  ['Uric Acid', 'UA', 'Biochemistry', 'Blood', 'Male: 3.4-7.0 mg/dL\nFemale: 2.4-6.0 mg/dL', 'mg/dL'],
  ['Electrolytes', 'Na/K/Cl', 'Biochemistry', 'Blood', 'Na: 135-145 mmol/L\nK: 3.5-5.0 mmol/L\nCl: 98-107 mmol/L', 'mmol/L'],
  ['Thyroid Function Tests', 'TFTs', 'Biochemistry', 'Blood', 'TSH: 0.4-4.0 mIU/L\nT3: 80-200 ng/dL\nT4: 5-12 μg/dL', 'mIU/L, ng/dL, μg/dL'],

  // Microbiology / Serology
  ['Dengue NS1 Antigen', 'NS1', 'Serology', 'Blood', 'Negative (Non-reactive)', '—'],
  ['Dengue IgM/IgG', 'Dengue Ab', 'Serology', 'Blood', 'IgM: Negative\nIgG: Negative', '—'],
  ['Widal Test', 'Widal', 'Serology', 'Blood', 'TO < 1:80, TH < 1:160 (Negative)', '—'],
  ['Typhi Dot', 'TyphiDot', 'Serology', 'Blood', 'Negative', '—'],
  ['Hepatitis B Surface Antigen', 'HBsAg', 'Serology', 'Blood', 'Non-reactive (Negative)', '—'],
  ['Hepatitis C Antibody', 'Anti-HCV', 'Serology', 'Blood', 'Non-reactive (Negative)', '—'],
  ['HIV Antibody', 'Anti-HIV', 'Serology', 'Blood', 'Non-reactive (Negative)', '—'],
  ['Rapid Plasma Reagin', 'RPR', 'Serology', 'Blood', 'Non-reactive (Negative)', '—'],
  ['C-Reactive Protein', 'CRP', 'Serology', 'Blood', '< 5.0 mg/L', 'mg/L'],
  ['Rheumatoid Factor', 'RF', 'Serology', 'Blood', '< 14 IU/mL', 'IU/mL'],
  ['Anti-Streptolysin O', 'ASO', 'Serology', 'Blood', '< 200 IU/mL', 'IU/mL'],

  // Urine
  ['Urinalysis', 'Urine R/E', 'Urinalysis', 'Urine', 'Color: Pale yellow\npH: 4.5-8.0\nSpecific gravity: 1.003-1.030\nProtein: Negative\nGlucose: Negative\nRBC: 0-2/hpf\nWBC: 0-5/hpf', '—'],
  ['Urine Pregnancy Test', 'UPT', 'Urinalysis', 'Urine', 'Negative', '—'],
  ['24-Hour Urine Protein', '24h Protein', 'Urinalysis', 'Urine', '< 150 mg/24hr', 'mg/24hr'],

  // Stool
  ['Stool Routine Examination', 'Stool R/E', 'Microbiology', 'Stool', 'No ova/parasites seen\nNo occult blood', '—'],

  // Coagulation
  ['Prothrombin Time', 'PT', 'Coagulation', 'Blood', '11-13.5 seconds\nINR: 0.8-1.2', 'seconds, INR'],
  ['Activated Partial Thromboplastin Time', 'aPTT', 'Coagulation', 'Blood', '25-35 seconds', 'seconds'],
];

async function main() {
  console.log(`Seeding ${tests.length} lab tests...`);
  let inserted = 0;

  for (const [name, shortName, category, sampleType, referenceRange, units] of tests) {
    try {
      await pool.query(
        `INSERT INTO lab_tests (name, short_name, category, sample_type, reference_range, units)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [name, shortName, category, sampleType, referenceRange, units],
      );
      inserted++;
    } catch (e) {
      console.log(`  ✗ ${shortName}: ${e.message}`);
    }
  }

  console.log(`✓ Inserted ${inserted} lab tests.`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
