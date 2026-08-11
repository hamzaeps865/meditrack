import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { auditLogs, users } from '@/server/db/schema';
import { desc, eq, and, gte, lte, ilike, or, count } from 'drizzle-orm';
import { format } from 'date-fns';
import {
 Search, Clock, Download,
 ChevronLeft, ChevronRight,
 ChevronsLeft, ChevronsRight, X,
 Filter,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import Link from 'next/link';

// ─── Config ───────────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;

// ─── Action badge styles ──────────────────────────────────────────────────────

const actionBadge: Record<string, string> = {
 create: 'bg-emerald-500 text-white',
 update: 'bg-primary text-white',
 delete: 'bg-red-500 text-white',
 view:  'bg-muted text-muted-foreground border border-border',
};

// ─── Resource label map ───────────────────────────────────────────────────────

const resourceLabel: Record<string, string> = {
 patients:   'Patient Records',
 visits:    'Visits',
 prescriptions: 'Prescriptions',
};

// ─── Role badge ───────────────────────────────────────────────────────────────

const roleBadge: Record<string, string> = {
 admin:    'bg-primary/10 text-primary border border-primary/20',
 doctor:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
 receptionist: 'bg-amber-50 text-amber-700 border border-amber-200',
 patient:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortRecordId(id: string) {
 // e.g. "RX-992-882" style from uuid — just show first 8 chars upper
 const s = id.replace(/-/g, '').toUpperCase();
 return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6, 9)}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminAuditLogsPage({
 searchParams,
}: {
 searchParams: Promise<Record<string, string>>;
}) {
 const session = await auth();
 if (!session || session.user.role !== 'admin') redirect('/login');

 const params  = await searchParams;
 const pageSize = Math.min(
  parseInt(params.size ?? String(DEFAULT_PAGE_SIZE), 10),
  100,
 );
 const currentPage = Math.max(1, parseInt(params.page ?? '1', 10));
 const offset   = (currentPage - 1) * pageSize;

 const filterAction  = params.action  ?? '';
 const filterResource = params.resource ?? '';
 const filterUserId  = params.userId  ?? '';
 const filterFrom   = params.from   ?? '';
 const filterTo    = params.to    ?? '';

 // Build where conditions
 const conditions = [
  filterAction  ? eq(auditLogs.action,  filterAction as any)  : undefined,
  filterResource ? eq(auditLogs.tableName, filterResource)     : undefined,
  filterUserId  ? eq(auditLogs.userId,  filterUserId)      : undefined,
  filterFrom   ? gte(auditLogs.createdAt, new Date(filterFrom))  : undefined,
  filterTo    ? lte(auditLogs.createdAt, new Date(filterTo + 'T23:59:59Z')) : undefined,
 ].filter(Boolean) as Parameters<typeof and>;

 const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

 // Total count for pagination
 const [{ total }] = await db
  .select({ total: count() })
  .from(auditLogs)
  .where(whereClause);

 // Paginated rows with user join
 const rows = await db
  .select({
   id:    auditLogs.id,
   action:  auditLogs.action,
   tableName: auditLogs.tableName,
   recordId: auditLogs.recordId,
   ipAddress: auditLogs.ipAddress,
   createdAt: auditLogs.createdAt,
   userName: users.name,
   userRole: users.role,
  })
  .from(auditLogs)
  .leftJoin(users, eq(auditLogs.userId, users.id))
  .where(whereClause)
  .orderBy(desc(auditLogs.createdAt))
  .limit(pageSize)
  .offset(offset);

 // All users for the filter dropdown
 const allUsers = await db
  .select({ id: users.id, name: users.name })
  .from(users)
  .orderBy(users.name);

 const totalPages  = Math.max(1, Math.ceil(total / pageSize));
 const adminName  = session.user.name ?? 'Admin';

 // ── Active filter chips ────────────────────────────────────────────────────
 const activeFilters: { label: string; clearKey: string }[] = [];
 if (filterAction)  activeFilters.push({ label: `Action: ${filterAction}`,   clearKey: 'action' });
 if (filterResource) activeFilters.push({ label: `Resource: ${filterResource}`, clearKey: 'resource' });
 if (filterUserId)  activeFilters.push({ label: `User filter active`,      clearKey: 'userId' });
 if (filterFrom || filterTo) activeFilters.push({ label: `Date range`,      clearKey: 'from' });

 // ── URL builder ────────────────────────────────────────────────────────────
 function buildHref(overrides: Record<string, string | number>) {
  const p = new URLSearchParams();
  if (filterAction)  p.set('action',  filterAction);
  if (filterResource) p.set('resource', filterResource);
  if (filterUserId)  p.set('userId',  filterUserId);
  if (filterFrom)   p.set('from',   filterFrom);
  if (filterTo)    p.set('to',    filterTo);
  if (pageSize !== DEFAULT_PAGE_SIZE) p.set('size', String(pageSize));
  p.set('page', String(currentPage));
  Object.entries(overrides).forEach(([k, v]) => {
   if (v === '' || v === 0) p.delete(k);
   else p.set(k, String(v));
  });
  return `?${p.toString()}`;
 }

 function clearFilterHref(key: string) {
  const p = new URLSearchParams();
  if (filterAction  && key !== 'action')  p.set('action',  filterAction);
  if (filterResource && key !== 'resource') p.set('resource', filterResource);
  if (filterUserId  && key !== 'userId')  p.set('userId',  filterUserId);
  if (filterFrom   && key !== 'from')   p.set('from',   filterFrom);
  if (filterTo    && key !== 'to')    p.set('to',    filterTo);
  if (pageSize !== DEFAULT_PAGE_SIZE)    p.set('size',   String(pageSize));
  p.set('page', '1');
  return `?${p.toString()}`;
 }

 function pageNumbers(): (number | 'ellipsis')[] {
  const nums: (number | 'ellipsis')[] = [1];
  if (currentPage > 3) nums.push('ellipsis');
  for (let n = Math.max(2, currentPage - 1); n <= Math.min(totalPages - 1, currentPage + 1); n++) nums.push(n);
  if (currentPage < totalPages - 2) nums.push('ellipsis');
  if (totalPages > 1) nums.push(totalPages);
  return nums;
 }

 return (
  <div className="min-h-full bg-[#f0f7f3]">

   {/* ── Top bar ── */}
   <div className="bg-white border-b border-border px-6 py-3
    flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-sm">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
      text-muted-foreground" />
     <input
      type="text"
      placeholder="Search logs by IP, ID, or user..."
      className="w-full h-9 pl-9 pr-4 border border-border bg-muted/40
       text-sm text-foreground placeholder:text-muted-foreground
       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
     />
    </div>
    <div className="flex items-center gap-2">
     <NotificationBell />
     <button type="button" aria-label="History"
      className="h-8 w-8 flex items-center justify-center 
       text-muted-foreground hover:bg-muted transition-colors">
      <Clock className="h-4 w-4" />
     </button>
    </div>
   </div>

   {/* ── Page body ── */}
   <div className="px-6 py-5 max-w-7xl mx-auto">

    {/* Page header */}
    <div className="flex items-start justify-between mb-5">
     <div>
      <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
      <p className="text-sm text-muted-foreground mt-0.5">
       Append-only record of all access to sensitive patient data
      </p>
     </div>
     <a
      href={`/api/audit-logs/export?${new URLSearchParams({
       ...(filterAction  ? { action:  filterAction  } : {}),
       ...(filterResource ? { resource: filterResource } : {}),
       ...(filterFrom   ? { from:   filterFrom   } : {}),
       ...(filterTo    ? { to:    filterTo    } : {}),
      }).toString()}`}
      className="flex items-center gap-2 h-9 px-4 border border-border
       bg-white text-sm font-semibold text-foreground hover:bg-muted
       transition-colors"
     >
      <Download className="h-3.5 w-3.5 text-muted-foreground" />
      Export CSV
     </a>
    </div>

    {/* ── Filter bar ── */}
    <form method="GET"
     className="bg-white border border-border px-4 py-4
       mb-3">

     {/* Row 1: four filter controls */}
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">

      {/* System User */}
      <div>
       <label className="block text-[10px] font-semibold uppercase tracking-widest
        text-muted-foreground mb-1.5">
        System User
       </label>
       <select
        name="userId"
        defaultValue={filterUserId}
        className="w-full h-9 px-3 border border-border bg-white
         text-sm text-foreground focus:outline-none focus:ring-2
         focus:ring-primary/20"
       >
        <option value="">All Users</option>
        {allUsers.map((u) => (
         <option key={u.id} value={u.id}>{u.name}</option>
        ))}
       </select>
      </div>

      {/* Action Type */}
      <div>
       <label className="block text-[10px] font-semibold uppercase tracking-widest
        text-muted-foreground mb-1.5">
        Action Type
       </label>
       <select
        name="action"
        defaultValue={filterAction}
        className="w-full h-9 px-3 border border-border bg-white
         text-sm text-foreground focus:outline-none focus:ring-2
         focus:ring-primary/20"
       >
        <option value="">Multi-select...</option>
        <option value="view">View</option>
        <option value="create">Create</option>
        <option value="update">Update</option>
        <option value="delete">Delete</option>
       </select>
      </div>

      {/* Resource */}
      <div>
       <label className="block text-[10px] font-semibold uppercase tracking-widest
        text-muted-foreground mb-1.5">
        Resource
       </label>
       <select
        name="resource"
        defaultValue={filterResource}
        className="w-full h-9 px-3 border border-border bg-white
         text-sm text-foreground focus:outline-none focus:ring-2
         focus:ring-primary/20"
       >
        <option value="">Patients, Visits...</option>
        <option value="patients">Patients</option>
        <option value="visits">Visits</option>
        <option value="prescriptions">Prescriptions</option>
       </select>
      </div>

      {/* Date Range */}
      <div>
       <label className="block text-[10px] font-semibold uppercase tracking-widest
        text-muted-foreground mb-1.5">
        Date Range
       </label>
       <div className="flex items-center gap-1.5">
        <input
         type="date"
         name="from"
         defaultValue={filterFrom}
         className="flex-1 min-w-0 h-9 px-2 border border-border
          bg-white text-sm text-foreground focus:outline-none focus:ring-2
          focus:ring-primary/20"
        />
        <span className="text-muted-foreground text-xs shrink-0">—</span>
        <input
         type="date"
         name="to"
         defaultValue={filterTo}
         className="flex-1 min-w-0 h-9 px-2 border border-border
          bg-white text-sm text-foreground focus:outline-none focus:ring-2
          focus:ring-primary/20"
        />
       </div>
      </div>
     </div>

     {/* Row 2: hidden inputs + Apply right-aligned */}
     <input type="hidden" name="page" value="1" />
     <input type="hidden" name="size" value={String(pageSize)} />

     <div className="flex justify-end">
      <button
       type="submit"
       className="h-9 px-6 text-sm font-bold text-white
        hover:opacity-90 transition-opacity flex items-center gap-2"
       style={{ backgroundColor: '#01411C' }}
      >
       <Filter className="h-3.5 w-3.5" />
       Apply
      </button>
     </div>
    </form>

    {/* Active filter chips */}
    {activeFilters.length > 0 && (
     <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs font-medium text-muted-foreground">
       Active Filters:
      </span>
      {activeFilters.map((f) => (
       <Link
        key={f.clearKey}
        href={clearFilterHref(f.clearKey)}
        className="flex items-center gap-1.5 h-7 px-3 
         bg-primary/10 text-primary border border-primary/20
         text-xs font-semibold hover:bg-red-50 hover:text-red-600
         hover:border-red-200 transition-colors"
       >
        {f.label}
        <X className="h-3 w-3" />
       </Link>
      ))}
      <Link
       href="?"
       className="text-xs font-semibold text-primary hover:underline"
      >
       Clear All
      </Link>
     </div>
    )}

    {/* ── Table ── */}
    <div className="bg-white border border-border overflow-hidden ">

     {/* Header */}
     <div className="grid grid-cols-[180px_1fr_90px_150px_150px_130px]
      px-5 py-3 border-b border-border bg-muted/20">
      {['TIMESTAMP', 'USER IDENTITY', 'ACTION', 'RESOURCE', 'RECORD ID', 'IP ADDRESS'].map((h) => (
       <p key={h}
        className="text-[10px] font-bold uppercase tracking-widest
         text-muted-foreground">
        {h}
       </p>
      ))}
     </div>

     {/* Rows */}
     {rows.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-20
       text-muted-foreground gap-2">
       <p className="text-sm font-medium">No audit logs found</p>
       <p className="text-xs">Try adjusting your filters.</p>
      </div>
     ) : (
      <ul className="divide-y divide-border">
       {rows.map((row) => {
        const badge = actionBadge[row.action]  ?? actionBadge.view;
        const rBadge= roleBadge[row.userRole ?? ''] ?? roleBadge.patient;

        return (
         <li key={row.id}
          className="grid grid-cols-[180px_1fr_90px_150px_150px_130px]
           items-center px-5 py-3.5 hover:bg-muted/20 transition-colors">

          {/* Timestamp */}
          <div>
           <p className="text-xs font-mono text-foreground tabular-nums">
            {format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm:ss.SSS')}
           </p>
          </div>

          {/* User Identity */}
          <div className="flex items-center gap-2 min-w-0">
           <p className="text-sm font-semibold text-foreground truncate">
            {row.userName ?? 'Unknown'}
           </p>
           {row.userRole && (
            <span className={`shrink-0 px-2 py-0.5 text-[9px]
             font-bold uppercase tracking-wide ${rBadge}`}>
             {row.userRole}
            </span>
           )}
          </div>

          {/* Action badge */}
          <div>
           <span className={`inline-block px-2.5 py-1 text-[10px]
            font-bold uppercase tracking-wide ${badge}`}>
            {row.action}
           </span>
          </div>

          {/* Resource */}
          <div>
           <p className="text-sm text-muted-foreground">
            {resourceLabel[row.tableName] ?? row.tableName}
           </p>
          </div>

          {/* Record ID */}
          <div>
           <p className="text-xs font-mono text-muted-foreground">
            {shortRecordId(row.recordId)}
           </p>
          </div>

          {/* IP Address */}
          <div>
           <p className="text-xs font-mono text-muted-foreground">
            {row.ipAddress ?? '—'}
           </p>
          </div>
         </li>
        );
       })}
      </ul>
     )}

     {/* ── Pagination footer ── */}
     <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5
      border-t border-border bg-muted/10">

      {/* Left: count + rows-per-page */}
      <div className="flex items-center gap-3">
       <p className="text-xs text-muted-foreground whitespace-nowrap">
        Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + pageSize, total)} of{' '}
        {total.toLocaleString()} records
       </p>
       <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Rows per page:</span>
        <div className="flex items-center gap-0.5">
         {PAGE_SIZES.map((s) => (
          <Link
           key={s}
           href={buildHref({ size: s, page: 1 })}
           className={`h-6 min-w-[28px] px-1.5 flex items-center justify-center
            text-[11px] font-medium transition-colors
            ${s === pageSize
             ? 'bg-primary text-primary-foreground'
             : 'text-muted-foreground hover:bg-muted'}`}
          >
           {s}
          </Link>
         ))}
        </div>
       </div>
      </div>

      {/* Right: page controls */}
      <div className="flex items-center gap-1">
       {/* First */}
       <Link
        href={buildHref({ page: 1 })}
        aria-disabled={currentPage === 1}
        className={`h-7 w-7 flex items-center justify-center border
         border-border bg-white transition-colors
         ${currentPage === 1
          ? 'pointer-events-none opacity-40'
          : 'text-muted-foreground hover:bg-muted'}`}
       >
        <ChevronsLeft className="h-3.5 w-3.5" />
       </Link>

       {/* Prev */}
       <Link
        href={buildHref({ page: currentPage - 1 })}
        aria-disabled={currentPage === 1}
        className={`h-7 w-7 flex items-center justify-center border
         border-border bg-white transition-colors
         ${currentPage === 1
          ? 'pointer-events-none opacity-40'
          : 'text-muted-foreground hover:bg-muted'}`}
       >
        <ChevronLeft className="h-3.5 w-3.5" />
       </Link>

       {/* Page numbers */}
       {pageNumbers().map((n, i) =>
        n === 'ellipsis' ? (
         <span key={`e-${i}`}
          className="h-7 px-1 flex items-center text-xs text-muted-foreground">
          …
         </span>
        ) : (
         <Link
          key={n}
          href={buildHref({ page: n })}
          className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center
            text-xs font-semibold border transition-colors
           ${n === currentPage
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-white border-border text-muted-foreground hover:bg-muted'}`}
         >
          {n}
         </Link>
        ),
       )}

       {/* Next */}
       <Link
        href={buildHref({ page: currentPage + 1 })}
        aria-disabled={currentPage === totalPages}
        className={`h-7 w-7 flex items-center justify-center border
         border-border bg-white transition-colors
         ${currentPage === totalPages
          ? 'pointer-events-none opacity-40'
          : 'text-muted-foreground hover:bg-muted'}`}
       >
        <ChevronRight className="h-3.5 w-3.5" />
       </Link>

       {/* Last */}
       <Link
        href={buildHref({ page: totalPages })}
        aria-disabled={currentPage === totalPages}
        className={`h-7 w-7 flex items-center justify-center border
         border-border bg-white transition-colors
         ${currentPage === totalPages
          ? 'pointer-events-none opacity-40'
          : 'text-muted-foreground hover:bg-muted'}`}
       >
        <ChevronsRight className="h-3.5 w-3.5" />
       </Link>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
