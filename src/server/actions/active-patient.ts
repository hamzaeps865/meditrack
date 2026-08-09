import 'server-only';
import { db } from '@/server/db';
import { patients } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { eq, and, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';

// ─── Active Patient Profile Resolution (server-only) ──────────────────────────
// Resolves which patient record the logged-in patient is currently acting as:
//   - themselves (matched by patients.email === users.email), OR
//   - a managed family member (patients.managedBy === users.id), selected via the
//     `activePatientId` cookie.
//
// This module is server-only because it reads cookies via next/headers.
// The client-callable switch action lives in active-patient-actions.ts.

export interface ActivePatient {
  id: string;
  name: string;
  isManaged: boolean; // true when acting as a family member
}

const ACTIVE_COOKIE = 'activePatientId';

/**
 * Returns the active patient for the logged-in patient user, or null if no
 * patient profile is linked to this account. Re-validates any cookie value
 * against the DB (defense in depth — the cookie is never trusted blindly).
 */
export async function getActivePatient(): Promise<ActivePatient | null> {
  const session = await requireRole(['patient']);

  // 1. The patient's own record (email-join)
  const [ownPatient] = await db
    .select({ id: patients.id, name: patients.name })
    .from(patients)
    .where(and(eq(patients.email, session.user.email ?? ''), isNull(patients.deletedAt)));

  // 2. Read the active-profile cookie (may select a managed member)
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_COOKIE)?.value;

  // 3. If a cookie is set, validate it points to a patient this user manages
  if (cookieId && ownPatient && cookieId !== ownPatient.id) {
    const [managed] = await db
      .select({ id: patients.id, name: patients.name })
      .from(patients)
      .where(
        and(
          eq(patients.id, cookieId),
          eq(patients.managedBy, session.user.id),
          isNull(patients.deletedAt),
        ),
      );
    if (managed) {
      return { id: managed.id, name: managed.name, isManaged: true };
    }
  }

  // 4. Fall back to self
  if (ownPatient) {
    return { id: ownPatient.id, name: ownPatient.name, isManaged: false };
  }

  return null;
}

/**
 * Returns all profiles the logged-in patient can switch between: themselves + any
 * managed family members. Used by the ProfileSwitcher UI.
 */
export async function getSwitchableProfiles(): Promise<ActivePatient[]> {
  const session = await requireRole(['patient']);
  const profiles: ActivePatient[] = [];

  // Self
  const [own] = await db
    .select({ id: patients.id, name: patients.name })
    .from(patients)
    .where(and(eq(patients.email, session.user.email ?? ''), isNull(patients.deletedAt)));
  if (own) profiles.push({ id: own.id, name: own.name, isManaged: false });

  // Managed family members
  const managed = await db
    .select({ id: patients.id, name: patients.name })
    .from(patients)
    .where(
      and(
        eq(patients.managedBy, session.user.id),
        isNull(patients.deletedAt),
      ),
    )
    .orderBy(patients.name);
  for (const m of managed) {
    profiles.push({ id: m.id, name: m.name, isManaged: true });
  }

  return profiles;
}

export { ACTIVE_COOKIE };
