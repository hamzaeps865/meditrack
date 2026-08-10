import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function main() {
  const client = await pool.connect();
  try {
    // Check if column already exists
    const { rows } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'doctors'
        AND column_name = 'accepting_bookings'
    `);

    if (rows.length > 0) {
      console.log('✓ Column accepting_bookings already exists — nothing to do.');
      return;
    }

    await client.query(`
      ALTER TABLE "doctors"
      ADD COLUMN "accepting_bookings" boolean NOT NULL DEFAULT true;
    `);

    console.log('✓ Successfully added accepting_bookings column to doctors table.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('✗ Migration failed:', err.message);
  process.exit(1);
});
