import { z } from 'zod';

// ─── Book Appointment ─────────────────────────────────────────────────────────

export const bookAppointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  doctorId: z.string().uuid('Invalid doctor ID'),
  // ISO 8601 datetime string — e.g. "2025-07-01T09:00:00.000Z"
  scheduledAt: z
    .string({ error: 'Scheduled time is required' })
    .datetime({ message: 'Invalid datetime — expected ISO 8601 format' })
    .refine((val) => new Date(val) > new Date(), {
      message: 'Appointment must be scheduled in the future',
    }),
  reason: z
    .string()
    .max(1000, 'Reason must be at most 1000 characters')
    .trim()
    .optional(),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

// ─── Update Appointment Status ────────────────────────────────────────────────
// Drives the status lifecycle:
// scheduled → checked_in → in_progress → completed
// Any state → cancelled | no_show

export const appointmentStatusSchema = z.enum(
  ['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'],
  { message: 'Invalid appointment status' },
);

export const updateAppointmentStatusSchema = z.object({
  id: z.string().uuid('Invalid appointment ID'),
  status: appointmentStatusSchema,
});

export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;

// ─── Query Params ─────────────────────────────────────────────────────────────

export const appointmentIdSchema = z.object({
  id: z.string().uuid('Invalid appointment ID'),
});

export type AppointmentIdInput = z.infer<typeof appointmentIdSchema>;
