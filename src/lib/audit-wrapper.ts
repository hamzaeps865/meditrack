/**
 * audit-wrapper.ts
 *
 * Writes to audit_logs after any sensitive query completes.
 * The main operation runs first; the audit log is a best-effort follow-up.
 * Audit failures are logged to console but do NOT block the main operation.
 */

import { db } from '@/server/db';
import { auditLogs } from '@/server/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditAction = 'view' | 'create' | 'update' | 'delete';

export type AuditableTable = 'patients' | 'visits' | 'prescriptions';

export interface AuditContext {
  userId: string;
  action: AuditAction;
  tableName: AuditableTable;
  recordId: string;
  ipAddress?: string | null;
}

// ─── Write audit log (fire-and-forget safe) ───────────────────────────────────

async function writeAuditLog(ctx: AuditContext | Omit<AuditContext, 'action'> & { action?: AuditAction }) {
  try {
    await db.insert(auditLogs).values({
      userId: ctx.userId,
      action: (ctx as AuditContext).action ?? 'view',
      tableName: ctx.tableName,
      recordId: ctx.recordId,
      ipAddress: ctx.ipAddress ?? null,
    });
  } catch (err) {
    // Audit log failure must never crash the main operation
    console.error('[audit] Failed to write audit log:', err);
  }
}

// ─── withAudit — for writes (create / update / delete) ───────────────────────

export async function withAudit<T>(
  ctx: AuditContext,
  query: () => Promise<T>,
): Promise<T> {
  const result = await query();
  await writeAuditLog(ctx);
  return result;
}

// ─── auditRead — for reads (view) ────────────────────────────────────────────

export async function auditRead<T>(
  ctx: Omit<AuditContext, 'action'>,
  result: T,
): Promise<T> {
  await writeAuditLog({ ...ctx, action: 'view' });
  return result;
}

// ─── IP address helper ────────────────────────────────────────────────────────

export function getIpFromHeaders(headersList: Headers): string | null {
  return (
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    null
  );
}
