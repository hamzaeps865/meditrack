/**
 * audit-wrapper.ts
 *
 * A single higher-order helper that writes to audit_logs after any sensitive
 * query completes. Per the SRS (§FR-6, §9):
 *   - Every read/write against patients, visits, and prescriptions is logged.
 *   - Logs record: acting user, action type, target table/record, timestamp, IP.
 *   - The table is append-only — no update/delete endpoint is ever exposed.
 *   - Logging failure must NOT silently swallow the audit write; it surfaces as
 *     a thrown error so missing logs are visible immediately.
 *
 * Usage:
 *   const result = await withAudit(
 *     { userId, action: 'create', tableName: 'patients', recordId, ipAddress },
 *     () => db.insert(patients).values(...).returning(),
 *   );
 */

import { db } from '@/server/db';
import { auditLogs } from '@/server/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditAction = 'view' | 'create' | 'update' | 'delete';

export type AuditableTable = 'patients' | 'visits' | 'prescriptions';

export interface AuditContext {
  /** The users.id of the actor performing the action */
  userId: string;
  action: AuditAction;
  tableName: AuditableTable;
  /** The UUID of the row being acted upon */
  recordId: string;
  /** IPv4 or IPv6 address — pass from request headers */
  ipAddress?: string | null;
}

// ─── Core wrapper ─────────────────────────────────────────────────────────────

/**
 * Executes the target query, then writes an audit log entry.
 * Both happen inside a transaction — if the audit insert fails the
 * whole operation rolls back, ensuring no unlogged mutations exist.
 *
 * @param ctx    Audit metadata
 * @param query  A function returning a Promise of the query result
 * @returns      The result of the query
 */
export async function withAudit<T>(
  ctx: AuditContext,
  query: () => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // Run the actual query first
    const result = await query();

    // Write the audit log entry in the same transaction
    await tx.insert(auditLogs).values({
      userId: ctx.userId,
      action: ctx.action,
      tableName: ctx.tableName,
      recordId: ctx.recordId,
      ipAddress: ctx.ipAddress ?? null,
    });

    return result;
  });
}

/**
 * Logs a read (view) event without wrapping a query in a transaction.
 * Use this for SELECT queries — reads don't need to be atomic with the log,
 * but the log entry must still be written.
 *
 * If the audit insert fails it throws, making missing read-logs visible.
 *
 * @param ctx       Audit metadata (action should be 'view')
 * @param result    The already-fetched data to pass through
 * @returns         The same result, unchanged
 */
export async function auditRead<T>(
  ctx: Omit<AuditContext, 'action'>,
  result: T,
): Promise<T> {
  await db.insert(auditLogs).values({
    userId: ctx.userId,
    action: 'view',
    tableName: ctx.tableName,
    recordId: ctx.recordId,
    ipAddress: ctx.ipAddress ?? null,
  });

  return result;
}

// ─── IP address helper ────────────────────────────────────────────────────────

/**
 * Extracts the client IP from Next.js request headers.
 * Call this inside a Server Action using `headers()` from next/headers.
 *
 * Usage:
 *   import { headers } from 'next/headers';
 *   const ip = getIpFromHeaders(await headers());
 */
export function getIpFromHeaders(headersList: Headers): string | null {
  return (
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    null
  );
}
