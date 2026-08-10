'use server';

import { db } from '@/server/db';
import { otpCodes, users } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { addMinutes } from 'date-fns';
import { isValidPakistaniPhone, pakistaniPhoneMessage } from '@/lib/validators/phone';

// ─── Phone OTP Authentication ─────────────────────────────────────────────────
// In-app OTP flow (free — no SMS provider needed for testing).
// The generated code is returned to the client so it can be shown in a toast.
// Later this can be plugged into a real SMS gateway.

const phoneSchema = z.string().trim().min(7, pakistaniPhoneMessage).max(20).refine((value) => isValidPakistaniPhone(value), {
  message: pakistaniPhoneMessage,
});

/**
 * Generate and store a 4-digit OTP for the given phone number.
 * Returns the code so the UI can display it (for testing without SMS).
 * The code expires after 5 minutes.
 */
export async function sendOtp(input: unknown): Promise<{ success: boolean; code?: string; error?: string }> {
  const phone = phoneSchema.parse(input);

  // Check if any user has this phone number
  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.phone, phone));

  if (!user) {
    return { success: false, error: 'No account found with this phone number.' };
  }

  // Generate 4-digit code
  const code = String(Math.floor(1000 + Math.random() * 9000));

  // Store the code with 5-minute expiry
  await db.insert(otpCodes).values({
    phone,
    code,
    expiresAt: addMinutes(new Date(), 5),
    used: false,
  });

  // Return the code for in-app display (replace with SMS send in production)
  return { success: true, code };
}

/**
 * Verify an OTP code for a phone number.
 * Returns the user's email so the client can call signIn with email + a
 * one-time password, OR returns a custom token.
 */
export async function verifyOtp(input: unknown): Promise<{ success: boolean; email?: string; error?: string }> {
  const schema = z.object({
    phone: phoneSchema,
    code: z.string().length(4),
  });
  const { phone, code } = schema.parse(input);

  // Find the latest unused, non-expired code for this phone
  const [otpRecord] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!otpRecord) {
    return { success: false, error: 'Invalid or expired code.' };
  }

  if (new Date() > otpRecord.expiresAt) {
    return { success: false, error: 'Code has expired. Please request a new one.' };
  }

  // Mark code as used
  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otpRecord.id));

  // Find the user's email so we can sign them in
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.phone, phone));

  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  return { success: true, email: user.email };
}

/**
 * Link a phone number to the current user (for existing accounts that don't
 * have a phone yet).
 */
export async function updateOwnPhone(phone: string) {
  'use server';
  const { requireRole } = await import('@/server/auth/rbac');
  const session = await requireRole(['admin', 'doctor', 'receptionist', 'patient', 'nurse', 'pharmacist']);
  const validated = phoneSchema.parse(phone);

  await db.update(users).set({ phone: validated }).where(eq(users.id, session.user.id));
  return { success: true };
}
