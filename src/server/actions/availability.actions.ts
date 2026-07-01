'use server';

import { db } from '@/server/db';
import { doctors, doctorAvailability } from '@/server/db/schema';
import { requireRole, assertDoctorOwnsResource } from '@/server/auth/rbac';
import {
  setAvailabilitySchema,
  availabilityIdSchema,
  getAvailabilitySchema,
} from '@/lib/validators/availability';
import { eq } from 'drizzle-orm';

// ─── Helper: resolve doctorId → userId ───────────────────────────────────────
// Needed by assertDoctorOwnsResource which compares against session.user.id
// (a users.id), but the client passes a doctors.id.

async function getDoctorUserId(doctorId: string): Promise<string> {
  const [doctor] = await db
    .select({ userId: doctors.userId })
    .from(doctors)
    .where(eq(doctors.id, doctorId));

  if (!doctor) throw new Error('Doctor not found.');
  return doctor.userId;
}

// ─── Get Availability for a Doctor ───────────────────────────────────────────
// Returns all weekly availability windows for the given doctor.
// Accessible by: admin, receptionist, doctor (own only)

export async function getDoctorAvailability(doctorId: string) {
  await requireRole(['admin', 'receptionist', 'doctor']);

  const { doctorId: validatedDoctorId } = getAvailabilitySchema.parse({ doctorId });

  // Doctors can only view their own availability
  const session = await requireRole(['admin', 'receptionist', 'doctor']);
  if (session.user.role === 'doctor') {
    const userId = await getDoctorUserId(validatedDoctorId);
    await assertDoctorOwnsResource(userId);
  }

  return db
    .select()
    .from(doctorAvailability)
    .where(eq(doctorAvailability.doctorId, validatedDoctorId))
    .orderBy(doctorAvailability.dayOfWeek, doctorAvailability.startTime);
}

// ─── Set (Add) Availability Window ───────────────────────────────────────────
// Adds a new recurring weekly slot for a doctor.
// Admin can set for any doctor; doctors can only set their own.

export async function setDoctorAvailability(input: unknown) {
  const session = await requireRole(['admin', 'doctor']);

  const data = setAvailabilitySchema.parse(input);

  // Ownership check — doctors cannot set another doctor's availability
  if (session.user.role === 'doctor') {
    const userId = await getDoctorUserId(data.doctorId);
    await assertDoctorOwnsResource(userId);
  }

  const [created] = await db
    .insert(doctorAvailability)
    .values({
      doctorId: data.doctorId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    })
    .returning();

  return created;
}

// ─── Delete Availability Window ───────────────────────────────────────────────
// Removes a specific availability window by its ID.
// Admin can remove any; doctors can only remove their own.

export async function deleteAvailabilityWindow(id: string) {
  const session = await requireRole(['admin', 'doctor']);

  const { id: availabilityId } = availabilityIdSchema.parse({ id });

  // Fetch the window first so we can do the ownership check
  const [window] = await db
    .select()
    .from(doctorAvailability)
    .where(eq(doctorAvailability.id, availabilityId));

  if (!window) throw new Error('Availability window not found.');

  // Doctors can only delete their own windows
  if (session.user.role === 'doctor') {
    const userId = await getDoctorUserId(window.doctorId);
    await assertDoctorOwnsResource(userId);
  }

  const [deleted] = await db
    .delete(doctorAvailability)
    .where(eq(doctorAvailability.id, availabilityId))
    .returning();

  return deleted;
}

// ─── Replace All Availability for a Doctor ───────────────────────────────────
// Replaces the entire availability schedule in one transaction.
// Useful for a "save schedule" form that submits all days at once.
// Accessible by: admin, doctor (own only)

export async function replaceAvailabilitySchedule(
  doctorId: string,
  windows: unknown[],
) {
  const session = await requireRole(['admin', 'doctor']);

  // Validate doctorId
  const { doctorId: validatedDoctorId } = getAvailabilitySchema.parse({ doctorId });

  // Ownership check for doctor role
  if (session.user.role === 'doctor') {
    const userId = await getDoctorUserId(validatedDoctorId);
    await assertDoctorOwnsResource(userId);
  }

  // Validate each window — reuse setAvailabilitySchema but override doctorId
  const validatedWindows = windows.map((w) =>
    setAvailabilitySchema.parse({ ...(w as object), doctorId: validatedDoctorId }),
  );

  // Atomic: delete all existing windows then insert the new set
  return db.transaction(async (tx) => {
    await tx
      .delete(doctorAvailability)
      .where(eq(doctorAvailability.doctorId, validatedDoctorId));

    if (validatedWindows.length === 0) return [];

    return tx
      .insert(doctorAvailability)
      .values(
        validatedWindows.map((w) => ({
          doctorId: validatedDoctorId,
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
        })),
      )
      .returning();
  });
}
