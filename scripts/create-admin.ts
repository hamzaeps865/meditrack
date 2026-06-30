import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import bcrypt from 'bcryptjs';

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  await db.insert(users).values({
    name: 'Admin User',
    email: 'admin@meditrack.dev',
    passwordHash,
    role: 'admin',
  });
  console.log('Admin created: admin@meditrack.dev / admin123');
}

main();