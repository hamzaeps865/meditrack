import { z } from 'zod';

// ─── Reusable field definitions ───────────────────────────────────────────────

const nameSchema = z
  .string({ required_error: 'Name is required' })
  .min(2, 'Name must be at least 2 characters')
  .max(255, 'Name must be at most 255 characters')
  .trim();

const dobSchema = z
  .string({ required_error: 'Date of birth is required' })
  .date('Invalid date — expected YYYY-MM-DD format')
  .refine((val) => new Date(val) < new Date(), {
    message: 'Date of birth must be in the past',
  });

const genderSchema = z.enum(['male', 'female', 'other'], {
  required_error: 'Gender is required',
  message: 'Gender must be male, female, or other',
});

const phoneSchema = z
  .string({ required_error: 'Phone number is required' })
  .min(7, 'Phone number is too short')
  .max(20, 'Phone number must be at most 20 characters')
  .trim();

const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be at most 255 characters')
  .trim()
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
  address: z.string().max(1000).trim().optional(),
  bloodGroup: bloodGroupSchema,
  allergies: z.string().max(1000, 'Allergies text too long').trim().optional(),
  emergencyContact: z
    .string()
    .max(255, 'Emergency contact too long')
    .trim()
    .optional(),
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
