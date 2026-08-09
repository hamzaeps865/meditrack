'use server';

import { requireRole } from '@/server/auth/rbac';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ACTIVE_COOKIE } from '@/server/actions/active-patient';

// ─── Active Patient Switch Action (client-callable) ───────────────────────────
// Separated from active-patient.ts (which is server-only) because this needs to
// be importable from client components like the ProfileSwitcher.

/**
 * Switch the active patient profile. Pass null to switch back to "self".
 */
export async function setActivePatient(patientId: string | null) {
  await requireRole(['patient']);
  const cookieStore = await cookies();

  if (patientId) {
    cookieStore.set(ACTIVE_COOKIE, patientId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } else {
    cookieStore.delete(ACTIVE_COOKIE);
  }

  revalidatePath('/patient', 'layout');
}
