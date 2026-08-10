import { z } from 'zod';
import { isValidPakistaniPhone, pakistaniPhoneMessage } from '@/lib/validators/phone';

// ─── Reusable field definitions ───────────────────────────────────────────────

const nameSchema = z
  .string({ message: 'Name is required' })
  .min(2, 'Name must be at least 2 characters')
  .max(255, 'Name must be at most 255 characters')
  .trim();

const dobSchema = z
  .string({ message: 'Date of birth is required' })
  .date('Invalid date — expected YYYY-MM-DD format')
  .refine((val) => new Date(val) < new Date(), {
    message: 'Date of birth must be in the past',
  });

const genderSchema = z.enum(['male', 'female', 'other'], {
  message: 'Gender must be male, female, or other',
});

const phoneSchema = z
  .string({ message: 'Phone number is required' })
  .trim()
  .refine((value) => isValidPakistaniPhone(value), {
    message: pakistaniPhoneMessage,
  });

const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be at most 255 characters')
  .trim()
  .toLowerCase()
  .optional()
  .or(z.literal(''));

const bloodGroupSchema = z
  .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
    message: 'Invalid blood group',
  })
  .optional();

// ─── Create Patient ───────────────────────────────────────────────────────────

export const createPatientSchema = z.object({
  name: nameSchema,
  dob: dobSchema,
  gender: genderSchema,
  phone: phoneSchema,
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password too long').optional().or(z.literal('')),
  confirmPassword: z.string().max(72).optional().or(z.literal('')),
  address: z.string().max(1000).trim().optional(),
  bloodGroup: bloodGroupSchema,
  allergies: z.string().max(1000, 'Allergies text too long').trim().optional(),
  emergencyContact: z
    .string()
    .max(255, 'Emergency contact too long')
    .trim()
    .optional(),
}).superRefine((data, ctx) => {
  if (data.password || data.confirmPassword) {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' });
    }
    if (data.password && data.password.length < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password must be at least 8 characters' });
    }
  }
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

// ─── Update Patient ───────────────────────────────────────────────────────────
// All fields optional — only the ones passed will be updated (PATCH semantics).

export const updatePatientSchema = z.object({
  name: nameSchema.optional(),
  dob: dobSchema.optional(),
  gender: genderSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema,
  address: z.string().max(1000).trim().optional(),
  bloodGroup: bloodGroupSchema,
  allergies: z.string().max(1000).trim().optional(),
  emergencyContact: z.string().max(255).trim().optional(),
});

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

// ─── Patient ID param ─────────────────────────────────────────────────────────

export const patientIdSchema = z.object({
  id: z.string().uuid('Invalid patient ID'),
});

export type PatientIdInput = z.infer<typeof patientIdSchema>;
