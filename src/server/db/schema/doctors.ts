import { pgTable, uuid, varchar, integer, time, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const doctors = pgTable('doctors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  specialization: varchar('specialization', { length: 255 }).notNull(),
  licenseNumber: varchar('license_number', { length: 100 }).notNull().unique(),
});

export const dayOfWeekEnum = pgEnum('day_of_week', [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]);

export const doctorAvailability = pgTable('doctor_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorId: uuid('doctor_id').notNull().references(() => doctors.id, { onDelete: 'cascade' }),
  dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
});