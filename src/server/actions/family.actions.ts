'use server';

import { db } from '@/server/db';
import { patients } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidPakistaniPhone, pakistaniPhoneMessage } from '@/lib/validators/phone';

// ─── Family Profile Management ────────────────────────────────────────────────
// A logged-in patient (head-of-household) can create managed sub-profiles for
// family members. These have no login of their own — they are accessed through
// the manager's account via the active-profile switcher.

const createFamilyMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255).trim(),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().trim().refine((value) => isValidPakistaniPhone(value), {
    message: pakistaniPhoneMessage,
  }),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .optional(),
  allergies: z.string().max(1000).trim().optional(),
  emergencyContact: z.string().max(255).trim().optional(),
  city: z.string().max(100).trim().optional(),
});

export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberSchema>;

// ─── Create a managed family member ───────────────────────────────────────────

export async function createFamilyMember(input: unknown) {
  const session = await requireRole(['patient']);
  const data = createFamilyMemberSchema.parse(input);

  const [member] = await db
    .insert(patients)
    .values({
      name: data.name,
      dob: data.dob,
      gender: data.gender,
      phone: data.phone,
      email: null,
      bloodGroup: data.bloodGroup ?? null,
      allergies: data.allergies || null,
      emergencyContact: data.emergencyContact || null,
      city: data.city || null,
      createdBy: session.user.id,
      managedBy: session.user.id, // ← the manager link
    })
    .returning({ id: patients.id, name: patients.name });

  revalidatePath('/patient', 'layout');
  return member;
}

export async function updateFamilyMember(id: string, input: unknown) {
  const session = await requireRole(['patient']);
  const data = createFamilyMemberSchema.parse(input);
  const [updated] = await db.update(patients).set({
    name: data.name, dob: data.dob, gender: data.gender, phone: data.phone,
    bloodGroup: data.bloodGroup ?? null, allergies: data.allergies || null,
    emergencyContact: data.emergencyContact || null, city: data.city || null,
  }).where(and(eq(patients.id, id), eq(patients.managedBy, session.user.id), isNull(patients.deletedAt))).returning({ id: patients.id, name: patients.name });
  if (!updated) throw new Error('Family member not found.');
  revalidatePath('/patient', 'layout');
  return updated;
}

// ─── List family members managed by the logged-in patient ─────────────────────

export async function getFamilyMembers() {
  const session = await requireRole(['patient']);

  return db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      dob: patients.dob,
      gender: patients.gender,
      bloodGroup: patients.bloodGroup,
      allergies: patients.allergies,
      city: patients.city,
      emergencyContact: patients.emergencyContact,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .where(
      and(
        eq(patients.managedBy, session.user.id),
        isNull(patients.deletedAt),
      ),
    )
    .orderBy(patients.name);
}

// ─── Remove (soft-delete) a managed family member ─────────────────────────────

export async function removeFamilyMember(id: string) {
  const session = await requireRole(['patient']);

  // Verify this member is managed by the caller before deleting
  const [member] = await db
    .select({ id: patients.id, managedBy: patients.managedBy, deletedAt: patients.deletedAt })
    .from(patients)
    .where(eq(patients.id, id));

  if (!member || member.managedBy !== session.user.id) {
    throw new Error('Family member not found.');
  }
  if (member.deletedAt) {
    throw new Error('This family member is already removed.');
  }

  await db
    .update(patients)
    .set({ deletedAt: new Date() })
    .where(eq(patients.id, id));

  revalidatePath('/patient', 'layout');
  return { success: true };
}
