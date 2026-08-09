import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// ─── Community Health Alerts ──────────────────────────────────────────────────
// Admin-created public-health broadcasts (dengue, flu, typhoid outbreaks, etc.).
// Targeted by city; a NULL city means "all cities". Alerts expire at expiresAt.

export const alertSeverityEnum = pgEnum('alert_severity', [
  'low', 'medium', 'high', 'critical',
]);

export const healthAlerts = pgTable('health_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  disease: varchar('disease', { length: 100 }),
  severity: alertSeverityEnum('severity').notNull().default('medium'),
  // Target city — NULL means broadcast to all patients regardless of city
  city: varchar('city', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Optional expiry — NULL means the alert is active until manually deactivated
  expiresAt: timestamp('expires_at'),
});
