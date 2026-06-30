import { pgTable, uuid, varchar, date, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  dob: date('dob').notNull(),
  gender: genderEnum('gender').notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  bloodGroup: varchar('blood_group', { length: 5 }),
  allergies: text('allergies'),
  emergencyContact: varchar('emergency_contact', { length: 255 }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});