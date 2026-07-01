import { z } from 'zod';

// ─── Shared UUID param ────────────────────────────────────────────────────────

export const visitIdSchema = z.object({
  id: z.string().uuid('Invalid visit ID'),
});

export type VisitIdInput = z.infer<typeof visitIdSchema>;

// ─── Vitals sub-schema ────────────────────────────────────────────────────────
// All vitals are optional — not every visit records all measurements.
// Stored as varchars in the DB so we validate format here.

const vitalsSchema = z.object({
  // Blood pressure — e.g. "120/80"
  vitalsBp: z
    .string()
    .regex(/^\d{2,3}\/\d{2,3}$/, 'Blood pressure must be in format "120/80"')
    .optional(),

  // Temperature — e.g. "98.6" (°F or °C — unit is display concern, not DB concern)
  vitalsTemp: z
    .string()
    .regex(/^\d{2,3}(\.\d{1,2})?$/, 'Temperature must be a number like "98.6"')
    .max(10)
    .optional(),

  // Weight — e.g. "72.5"
  vitalsWeight: z
    .string()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, 'Weight must be a number like "72.5"')
    .max(10)
    .optional(),
});

// ─── Create Visit ─────────────────────────────────────────────────────────────
// Created by doctor when an appointment moves to in_progress / completed.
// Each appointment produces exactly one visit record (1:1 — SRS §FR-4).

export const createVisitSchema = z
  .object({
    appointmentId: z.string().uuid('Invalid appointment ID'),
    patientId: z.string().uuid('Invalid patient ID'),
    chiefComplaint: z
      .string({ required_error: 'Chief complaint is required' })
      .min(3, 'Chief complaint must be at least 3 characters')
      .max(2000)
      .trim(),
    diagnosis: z.string().max(2000).trim().optional(),
    notes: z.string().max(5000).trim().optional(),
  })
  .merge(vitalsSchema);

export type CreateVisitInput = z.infer<typeof createVisitSchema>;

// ─── Update Visit ─────────────────────────────────────────────────────────────
// Doctors can update clinical notes after the visit is created (PATCH semantics).

export const updateVisitSchema = z
  .object({
    chiefComplaint: z.string().min(3).max(2000).trim().optional(),
    diagnosis: z.string().max(2000).trim().optional(),
    notes: z.string().max(5000).trim().optional(),
  })
  .merge(vitalsSchema);

export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;

// ─── Prescription item sub-schema ─────────────────────────────────────────────
// Each prescription has 1+ line items (SRS §FR-5).

export const prescriptionItemSchema = z.object({
  medicineName: z
    .string({ required_error: 'Medicine name is required' })
    .min(1)
    .max(255)
    .trim(),
  dosage: z
    .string({ required_error: 'Dosage is required' })
    .min(1, 'Dosage is required')
    .max(100)
    .trim(),
  frequency: z
    .string({ required_error: 'Frequency is required' })
    .min(1, 'Frequency is required')
    .max(100)
    .trim(),
  duration: z
    .string({ required_error: 'Duration is required' })
    .min(1, 'Duration is required')
    .max(100)
    .trim(),
  notes: z.string().max(255).trim().optional(),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;

// ─── Create Prescription ──────────────────────────────────────────────────────
// Tied to a visit, must have at least one line item.

export const createPrescriptionSchema = z.object({
  visitId: z.string().uuid('Invalid visit ID'),
  items: z
    .array(prescriptionItemSchema)
    .min(1, 'At least one prescription item is required'),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

// ─── Prescription ID param ────────────────────────────────────────────────────

export const prescriptionIdSchema = z.object({
  id: z.string().uuid('Invalid prescription ID'),
});

export type PrescriptionIdInput = z.infer<typeof prescriptionIdSchema>;
