'use server';

import { db } from '@/server/db';
import { users, patients } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  name: z
    .string({ message: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(255)
    .trim(),
  email: z
    .string({ message: 'Email is required' })
    .email('Invalid email address')
    .max(255)
    .trim()
    .toLowerCase(),
  password: z
    .string({ message: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'), // bcrypt max is 72 bytes
  // Patient profile fields — required so the account is immediately usable
  dob: z
    .string({ message: 'Date of birth is required' })
    .min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], {
    message: 'Gender must be male, female, or other',
  }),
  phone: z
    .string({ message: 'Phone number is required' })
    .trim()
    .regex(/^0\d{10}$/, 'Phone number must be exactly 11 digits and start with 0 (e.g. 03001234567)'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);

  // Check for existing account
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email));

  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  // Create the user account + linked patient record in one go so the patient
  // can immediately book appointments (no more "no patient profile" dead-end).
  // The patient row is linked by email (the system's email-join model).
  const [newUser] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'patient', // all self-registered users start as patient; admin assigns roles
      phone: data.phone, // store on user too so phone OTP login works
    })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  // Create the matching patient record (createdBy = the new user themselves)
  await db.insert(patients).values({
    name: data.name,
    dob: data.dob,
    gender: data.gender,
    phone: data.phone,
    email: data.email, // links to the user via the email-join
    createdBy: newUser.id,
  });

  return newUser;
}
