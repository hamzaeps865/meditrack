'use server';

import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(255)
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .max(255)
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'), // bcrypt max is 72 bytes
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

  const passwordHash = await bcrypt.hash(data.password, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'patient', // all self-registered users start as patient; admin assigns roles
    })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  return newUser;
}
