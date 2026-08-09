import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

// ─── OTP Codes ────────────────────────────────────────────────────────────────
// Temporary 4-digit codes for phone-based login. Each code expires after 5 min
// and can only be used once.

export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).notNull(),
  code: varchar('code', { length: 4 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
