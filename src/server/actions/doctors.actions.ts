'use server';

import { db } from '@/server/db';
import { doctors, users, doctorAvailability, appointments, patients } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, count, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// ─── Get All Doctors (with name + specialization) ─────────────────────────────
// Used to populate the doctor dropdown in the booking modal.
// Accessible by: admin, receptionist

export async function getAllDoctors() {
  await requireRole(['admin', 'receptionist', 'doctor', 'patient']);

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

// ─── Get All Doctors (admin enriched view) ───────────────────────────────────
// Returns doctors with email, availability day/hour counts, and active patient count.
// Accessible by: admin only

export async function getAllDoctorsAdmin() {
  await requireRole(['admin']);

  // Base doctor + user join
  const rows = await db
    .select({
      id:             doctors.id,
      userId:         doctors.userId,
      specialization: doctors.specialization,
      licenseNumber:  doctors.licenseNumber,
      name:           users.name,
      email:          users.email,
    })
    .from(doctors)
    .leftJoin(users, eq(doctors.userId, users.id))
    .orderBy(users.name);

  // Availability counts per doctor
  const availRows = await db
    .select({
      doctorId:  doctorAvailability.doctorId,
      dayOfWeek: doctorAvailability.dayOfWeek,
      startTime: doctorAvailability.startTime,
      endTime:   doctorAvailability.endTime,
    })
    .from(doctorAvailability);

  // Active patient counts per doctor (distinct patients with appointments)
  const patientCountRows = await db
    .selectDistinct({
      doctorId:  appointments.doctorId,
      patientId: appointments.patientId,
    })
    .from(appointments);

  // Build maps
  const availByDoctor = new Map<string, typeof availRows>();
  for (const a of availRows) {
    if (!availByDoctor.has(a.doctorId)) availByDoctor.set(a.doctorId, []);
    availByDoctor.get(a.doctorId)!.push(a);
  }

  const patientsByDoctor = new Map<string, Set<string>>();
  for (const p of patientCountRows) {
    if (!patientsByDoctor.has(p.doctorId)) patientsByDoctor.set(p.doctorId, new Set());
    patientsByDoctor.get(p.doctorId)!.add(p.patientId);
  }

  return rows.map((doc) => {
    const avail    = availByDoctor.get(doc.id) ?? [];
    const dayCount = new Set(avail.map((a) => a.dayOfWeek)).size;

    // Total hours = sum of (endTime - startTime) in hours
    let totalHours = 0;
    for (const a of avail) {
      const [sh, sm] = a.startTime.split(':').map(Number);
      const [eh, em] = a.endTime.split(':').map(Number);
      totalHours += (eh + em / 60) - (sh + sm / 60);
    }

    return {
      id:             doc.id,
      userId:         doc.userId,
      name:           doc.name,
      email:          doc.email,
      specialization: doc.specialization,
      licenseNumber:  doc.licenseNumber,
      availDays:      dayCount,
      availHours:     Math.round(totalHours),
      patientCount:   patientsByDoctor.get(doc.id)?.size ?? 0,
    };
  });
}

// ─── Create Doctor ────────────────────────────────────────────────────────────
// Creates a user account with role=doctor and a linked doctor profile.
// Accessible by: admin only

const createDoctorSchema = z.object({
  name:           z.string().min(2).max(255).trim(),
  email:          z.string().email().max(255).trim(),
  // Optional at the schema level — the action enforces it for new accounts only
  password:       z.string().max(100).optional().default(''),
  specialization: z.string().min(2).max(255).trim(),
  licenseNumber:  z.string().min(2).max(100).trim(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export async function createDoctor(input: unknown) {
  await requireRole(['admin']);

  const data = createDoctorSchema.parse(input);

  // ── Check if a user with this email already exists ────────────────────────
  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, data.email));

  let userId: string;

  if (existing) {
    // ── Existing user: promote role only — password is never changed ─────────
    await db
      .update(users)
      .set({ role: 'doctor' })
      .where(eq(users.id, existing.id));

    userId = existing.id;
  } else {
    // ── New user: password is required ────────────────────────────────────────
    if (!data.password || data.password.trim().length < 8) {
      throw new Error('Password must be at least 8 characters for new accounts.');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        name:         data.name,
        email:        data.email,
        passwordHash,
        role:         'doctor',
      })
      .returning();

    userId = newUser.id;
  }

  // ── Upsert doctor profile ─────────────────────────────────────────────────
  const [existingDoctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.userId, userId));

  if (existingDoctor) {
    const [updated] = await db
      .update(doctors)
      .set({
        specialization: data.specialization,
        licenseNumber:  data.licenseNumber,
      })
      .where(eq(doctors.userId, userId))
      .returning();

    return { userId, doctor: updated, wasExistingUser: true };
  }

  const [newDoctor] = await db
    .insert(doctors)
    .values({
      userId,
      specialization: data.specialization,
      licenseNumber:  data.licenseNumber,
    })
    .returning();

  return { userId, doctor: newDoctor, wasExistingUser: false };
}
