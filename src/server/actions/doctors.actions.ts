'use server';

import { db } from '@/server/db';
import { doctors, users } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq } from 'drizzle-orm';

// ─── Get All Doctors (with name + specialization) ─────────────────────────────
// Used to populate the doctor dropdown in the booking modal.
// Accessible by: admin, receptionist

export async function getAllDoctors() {
  await requireRole(['admin', 'receptionist', 'doctor']);

  return db
    .select({
      id:             doctors.id,
      specialization: doctors.specialization,
      licenseNumber:  doctors.licenseNumber,
      name:           users.name,
    })
    .from(doctors)
    .leftJoin(users, eq(doctors.userId, users.id))
    .orderBy(users.name);
}
