'use server';

import { db } from '@/server/db';
import { patients } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { isNull } from 'drizzle-orm';

export async function getAllPatients() {
  await requireRole(['admin', 'receptionist', 'doctor']);
  return db.select().from(patients).where(isNull(patients.deletedAt));
}