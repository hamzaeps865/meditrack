import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

// ─── System Settings ──────────────────────────────────────────────────────────
// Lightweight key/value store for admin-configurable clinic settings
// (clinic name, contact details, operating hours, slot config, etc.).
// Stored as text; the application layer casts as needed.

export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Stable identifier, e.g. 'clinic_name', 'clinic_phone', 'operating_hours'
  key: varchar('key', { length: 100 }).notNull().unique(),
  // JSON or plain string value
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Support Requests ─────────────────────────────────────────────────────────
// Messages submitted via the Help Center contact form. Visible to admins.

export const supportRequests = pgTable('support_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Submitter's user id (nullable so unauthenticated help can still post if added later)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
