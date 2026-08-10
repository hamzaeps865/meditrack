'use server';

import { db } from '@/server/db';
import {
  doctors, users, doctorAvailability, appointments, patients,
  doctorReviews, labOrders, invoices, visits, prescriptions, prescriptionItems,
} from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, count, isNull, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

// ─── Get All Doctors (with name + specialization) ─────────────────────────────
// Used to populate the doctor dropdown in the booking modal.
// Accessible by: admin, receptionist

export async function getAllDoctors() {
  await requireRole(['admin', 'receptionist', 'doctor', 'patient']);

  return db
    .select({
      id: doctors.id,
      specialization: doctors.specialization,
      licenseNumber: doctors.licenseNumber,
      name: users.name,
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
      id: doctors.id,
      userId: doctors.userId,
      specialization: doctors.specialization,
      licenseNumber: doctors.licenseNumber,
      name: users.name,
      email: users.email,
    })
    .from(doctors)
    .leftJoin(users, eq(doctors.userId, users.id))
    .orderBy(users.name);

  // Availability counts per doctor
  const availRows = await db
    .select({
      doctorId: doctorAvailability.doctorId,
      dayOfWeek: doctorAvailability.dayOfWeek,
      startTime: doctorAvailability.startTime,
      endTime: doctorAvailability.endTime,
    })
    .from(doctorAvailability);

  // Active patient counts per doctor (distinct patients with appointments)
  const patientCountRows = await db
    .selectDistinct({
      doctorId: appointments.doctorId,
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
    const avail = availByDoctor.get(doc.id) ?? [];
    const dayCount = new Set(avail.map((a) => a.dayOfWeek)).size;

    // Total hours = sum of (endTime - startTime) in hours
    let totalHours = 0;
    for (const a of avail) {
      const [sh, sm] = a.startTime.split(':').map(Number);
      const [eh, em] = a.endTime.split(':').map(Number);
      totalHours += (eh + em / 60) - (sh + sm / 60);
    }

    return {
      id: doc.id,
      userId: doc.userId,
      name: doc.name,
      email: doc.email,
      specialization: doc.specialization,
      licenseNumber: doc.licenseNumber,
      availDays: dayCount,
      availHours: Math.round(totalHours),
      patientCount: patientsByDoctor.get(doc.id)?.size ?? 0,
    };
  });
}

// ─── Create Doctor ────────────────────────────────────────────────────────────
// Creates a user account with role=doctor and a linked doctor profile.
// Accessible by: admin only

const createDoctorSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  email: z.string().email().max(255).trim(),
  // Optional at the schema level — the action enforces it for new accounts only
  password: z.string().max(100).optional().default(''),
  specialization: z.string().min(2).max(255).trim(),
  licenseNumber: z.string().min(2).max(100).trim(),
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
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'doctor',
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
        licenseNumber: data.licenseNumber,
      })
      .where(eq(doctors.userId, userId))
      .returning();

    revalidatePath('/admin/doctors');
    return { userId, doctor: updated, wasExistingUser: true };
  }

  const [newDoctor] = await db
    .insert(doctors)
    .values({
      userId,
      specialization: data.specialization,
      licenseNumber: data.licenseNumber,
    })
    .returning();

  revalidatePath('/admin/doctors');
  return { userId, doctor: newDoctor, wasExistingUser: false };
}

// ─── Update Doctor (admin only) ───────────────────────────────────────────────

const updateDoctorSchema = z.object({
  name: z.string().min(2).max(255).trim().optional(),
  specialization: z.string().min(2).max(255).trim().optional(),
  licenseNumber: z.string().min(2).max(100).trim().optional(),
});

export async function updateDoctor(doctorId: string, input: unknown) {
  await requireRole(['admin']);
  const data = updateDoctorSchema.parse(input);

  // Update doctor profile fields
  if (data.specialization || data.licenseNumber) {
    await db
      .update(doctors)
      .set({
        ...(data.specialization && { specialization: data.specialization }),
        ...(data.licenseNumber && { licenseNumber: data.licenseNumber }),
      })
      .where(eq(doctors.id, doctorId));
  }

  // Update user name if provided
  if (data.name) {
    const [doctor] = await db.select({ userId: doctors.userId }).from(doctors).where(eq(doctors.id, doctorId));
    if (doctor) {
      await db.update(users).set({ name: data.name }).where(eq(users.id, doctor.userId));
    }
  }

  revalidatePath('/admin/doctors');
  revalidatePath(`/admin/doctors/${doctorId}`);
  return { success: true };
}

// ─── Delete Doctor (admin only) ───────────────────────────────────────────────

export async function deleteDoctor(doctorId: string) {
  await requireRole(['admin']);

  const [doctor] = await db.select().from(doctors).where(eq(doctors.id, doctorId));
  if (!doctor) throw new Error('Doctor not found.');

  // Clean up dependent foreign key records in order
  // 1. Doctor availability
  await db.delete(doctorAvailability).where(eq(doctorAvailability.doctorId, doctorId));

  // 2. Doctor reviews
  await db.delete(doctorReviews).where(eq(doctorReviews.doctorId, doctorId));

  // 3. Lab orders
  await db.delete(labOrders).where(eq(labOrders.doctorId, doctorId));

  // 4. Invoices
  await db.delete(invoices).where(eq(invoices.doctorId, doctorId));

  // 5. Visits and their associated prescriptions & items
  const docVisits = await db.select({ id: visits.id }).from(visits).where(eq(visits.doctorId, doctorId));
  if (docVisits.length > 0) {
    const visitIds = docVisits.map((v) => v.id);
    const docPrescriptions = await db
      .select({ id: prescriptions.id })
      .from(prescriptions)
      .where(inArray(prescriptions.visitId, visitIds));
    if (docPrescriptions.length > 0) {
      const rxIds = docPrescriptions.map((r) => r.id);
      await db.delete(prescriptionItems).where(inArray(prescriptionItems.prescriptionId, rxIds));
      await db.delete(prescriptions).where(inArray(prescriptions.id, rxIds));
    }
    await db.delete(visits).where(eq(visits.doctorId, doctorId));
  }

  // 6. Appointments
  await db.delete(appointments).where(eq(appointments.doctorId, doctorId));

  // 7. Delete the doctor profile
  await db.delete(doctors).where(eq(doctors.id, doctorId));

  // 8. Demote the user account to patient role so they can no longer access doctor routes
  await db.update(users).set({ role: 'patient' }).where(eq(users.id, doctor.userId));

  revalidatePath('/admin/doctors');
  revalidatePath(`/admin/doctors/${doctorId}`);
  return { success: true };
}

// ─── Toggle Accepting Bookings (doctor only) ─────────────────────────────────

export async function toggleAcceptingBookings() {
  const session = await requireRole(['doctor']);
  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, session.user.id));
  if (!doctor) throw new Error('Doctor profile not found.');
  // For now this is a stub — just return success. A proper implementation
  // would add an isAcceptingBookings boolean column to the doctors table.
  return { success: true, acceptingBookings: true };
}
