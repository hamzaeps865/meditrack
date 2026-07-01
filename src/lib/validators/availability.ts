import { z } from 'zod';

// ─── Reusable ─────────────────────────────────────────────────────────────────

// HH:MM — matches the Postgres `time` column format
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format (e.g. 09:00)');

export const dayOfWeekSchema = z.enum(
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  { message: 'Invalid day of week' },
);

// ─── Set / Create Availability Window ────────────────────────────────────────
// Used when a doctor (or admin) defines a recurring weekly slot.

export const setAvailabilitySchema = z
  .object({
    doctorId: z.string().uuid('Invalid doctor ID'),
    dayOfWeek: dayOfWeekSchema,
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine(
    (data) => data.startTime < data.endTime,
    {
      message: 'Start time must be before end time',
      path: ['endTime'],
    },
  );

export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;

// ─── Delete Availability Window ───────────────────────────────────────────────

export const availabilityIdSchema = z.object({
  id: z.string().uuid('Invalid availability ID'),
});

export type AvailabilityIdInput = z.infer<typeof availabilityIdSchema>;

// ─── Query Availability by Doctor ─────────────────────────────────────────────

export const getAvailabilitySchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
});

export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;
