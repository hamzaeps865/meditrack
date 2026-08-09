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
  city: varchar('city', { length: 100 }),
  bloodGroup: varchar('blood_group', { length: 5 }),
  allergies: text('allergies'),
  emergencyContact: varchar('emergency_contact', { length: 255 }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  // Family Profiles: if set, this patient record is a managed dependent of the
  // named user (the head-of-household). NULL = self-managed via the email-join.
  managedBy: uuid('managed_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});