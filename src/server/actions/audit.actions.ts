'use server';

import { db } from '@/server/db';
import { auditLogs } from '@/server/db/schema';
import { requireRole } from '@/server/auth/rbac';
import { desc, eq, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

// ─── Query filters validator ──────────────────────────────────────────────────

const auditLogFiltersSchema = z.object({
  /** Filter by a specific user */
  userId: z.string().uuid().optional(),
  /** Filter by action type */
  action: z.enum(['view', 'create', 'update', 'delete']).optional(),
  /** Filter by table */
  tableName: z.enum(['patients', 'visits', 'prescriptions']).optional(),
  /** ISO date string — logs on or after this date */
  from: z.string().datetime().optional(),
  /** ISO date string — logs on or before this date */
  to: z.string().datetime().optional(),
  /** Pagination */
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;

// ─── Get Audit Logs ───────────────────────────────────────────────────────────
// Returns a filterable, paginated list of audit log entries.
// Accessible by: admin only (SRS §8 — "View audit logs: Admin ✅, all others ✗")

export async function getAuditLogs(filters: unknown = {}) {
  await requireRole(['admin']);

  const {
    userId,
    action,
    tableName,
    from,
    to,
    limit,
    offset,
  } = auditLogFiltersSchema.parse(filters);

  // Build conditions array — only include filters that were provided
  const conditions = [
    userId    ? eq(auditLogs.userId,    userId)                : undefined,
    action    ? eq(auditLogs.action,    action)                : undefined,
    tableName ? eq(auditLogs.tableName, tableName)             : undefined,
    from      ? gte(auditLogs.createdAt, new Date(from))       : undefined,
    to        ? lte(auditLogs.createdAt, new Date(to))         : undefined,
  ].filter(Boolean) as Parameters<typeof and>;

  return db
    .select()
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

// ─── Get Audit Logs for a Specific Record ─────────────────────────────────────
// Returns the full access history for a single row (e.g. one patient record).
// Accessible by: admin only

export async function getAuditLogsForRecord(recordId: string) {
  await requireRole(['admin']);

  const id = z.string().uuid('Invalid record ID').parse(recordId);

  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.recordId, id))
    .orderBy(desc(auditLogs.createdAt));
}
