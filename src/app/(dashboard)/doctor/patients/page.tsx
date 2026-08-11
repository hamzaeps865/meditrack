import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import {
 appointments, doctors, patients, visits,
} from '@/server/db/schema';
import { eq, and, desc, gte, lte, count, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import {
 Search, Settings, ChevronLeft, ChevronRight,
 SlidersHorizontal, TrendingUp, BookOpen,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';

// ─── Config ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
 if (!name) return '?';
 return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function calcAge(dob: string | null | undefined) {
 if (!dob) return null;
 return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function avatarColor(name: string) {
 const palette = [
  'bg-emerald-100 text-emerald-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
 ];
 return palette[name.charCodeAt(0) % palette.length];
}

function conditionTagStyle(tag: string) {
 const t = tag.toLowerCase();
 if (t.includes('diabet'))  return 'bg-orange-50 text-orange-600 border-orange-100';
 if (t.includes('asthma'))  return 'bg-emerald-50 text-emerald-700 border-emerald-100';
 if (t.includes('hyper'))  return 'bg-red-50 text-red-600 border-red-100';
 if (t.includes('allerg'))  return 'bg-amber-50 text-amber-600 border-amber-100';
 return 'bg-muted text-muted-foreground border-emerald-100';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DoctorPatientsPage({
 searchParams,
}: {
 searchParams: Promise<{ q?: string; filter?: string; sort?: string; page?: string }>;
}) {
 const session = await auth();
 if (!session || session.user.role !== 'doctor') redirect('/login');

 const [doctorRow] = await db
  .select()
  .from(doctors)
  .where(eq(doctors.userId, session.user.id));

 if (!doctorRow) redirect('/doctor');

 const params   = await searchParams;
 const searchQuery = params.q?.trim().toLowerCase() ?? '';
 const activeFilter = params.filter ?? 'all';
 const sortKey   = params.sort ?? 'recent';
 const currentPage = Math.max(1, parseInt(params.page ?? '1', 10));

 // ── Fetch all patients this doctor has seen (via visits) ─────────────────
 // We need: patient info + last visit date + last diagnosis

 const allVisitRows = await db
  .select({
   patientId:  visits.patientId,
   visitId:   visits.id,
   visitedAt:  visits.createdAt,
   diagnosis:  visits.diagnosis,
   patientName: patients.name,
   patientDob: patients.dob,
   patientGender: patients.gender,
   patientAllergies: patients.allergies,
   patientBloodGroup: patients.bloodGroup,
  })
  .from(visits)
  .leftJoin(patients, eq(visits.patientId, patients.id))
  .where(
   and(
    eq(visits.doctorId, doctorRow.id),
    isNull(patients.deletedAt),
   ),
  )
  .orderBy(desc(visits.createdAt));

 // De-duplicate — keep only the most-recent visit per patient
 const seen = new Set<string>();
 const patientRows: typeof allVisitRows = [];
 for (const row of allVisitRows) {
  if (!seen.has(row.patientId)) {
   seen.add(row.patientId);
   patientRows.push(row);
  }
 }

 // ── Stats ─────────────────────────────────────────────────────────────────
 const now    = new Date();
 const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
 const thisWeek  = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };

 const newThisMonth = allVisitRows.filter((r) => {
  const d = new Date(r.visitedAt);
  return d >= thisMonth.start && d <= thisMonth.end;
 });
 const uniqueNewThisMonth = new Set(newThisMonth.map((r) => r.patientId)).size;

 const seenThisWeek = new Set(
  allVisitRows
   .filter((r) => {
    const d = new Date(r.visitedAt);
    return d >= thisWeek.start && d <= thisWeek.end;
   })
   .map((r) => r.patientId),
 ).size;

 // Follow-up rate: patients with >1 visit / total patients (rough metric)
 const patientVisitCounts = new Map<string, number>();
 for (const r of allVisitRows) {
  patientVisitCounts.set(r.patientId, (patientVisitCounts.get(r.patientId) ?? 0) + 1);
 }
 const followUpCount = [...patientVisitCounts.values()].filter((c) => c > 1).length;
 const followUpRate = patientRows.length > 0
  ? Math.round((followUpCount / patientRows.length) * 100)
  : 0;

 // ── Filter ────────────────────────────────────────────────────────────────
 let filtered = patientRows.filter((p) => {
  if (searchQuery) {
   const name = (p.patientName ?? '').toLowerCase();
   const id  = p.patientId.slice(0, 8).toLowerCase();
   if (!name.includes(searchQuery) && !id.includes(searchQuery)) return false;
  }
  if (activeFilter === 'week') {
   const d = new Date(p.visitedAt);
   return d >= thisWeek.start && d <= thisWeek.end;
  }
  if (activeFilter === 'conditions') {
   return !!(p.patientAllergies);
  }
  return true;
 });

 // ── Sort ──────────────────────────────────────────────────────────────────
 if (sortKey === 'recent') {
  filtered = [...filtered].sort(
   (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
  );
 } else if (sortKey === 'name') {
  filtered = [...filtered].sort((a, b) =>
   (a.patientName ?? '').localeCompare(b.patientName ?? ''),
  );
 } else if (sortKey === 'oldest') {
  filtered = [...filtered].sort(
   (a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime(),
  );
 }

 // ── Paginate ──────────────────────────────────────────────────────────────
 const total   = filtered.length;
 const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
 const safePage  = Math.min(currentPage, totalPages);
 const pageStart = (safePage - 1) * PAGE_SIZE;
 const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

 function buildHref(overrides: Record<string, string | number>) {
  const p = new URLSearchParams();
  if (searchQuery)  p.set('q', searchQuery);
  if (activeFilter !== 'all') p.set('filter', activeFilter);
  if (sortKey !== 'recent')  p.set('sort', sortKey);
  if (safePage > 1)      p.set('page', String(safePage));
  Object.entries(overrides).forEach(([k, v]) => {
   if (v === '' || v === 'all' || (k === 'page' && Number(v) === 1)) p.delete(k);
   else p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '?';
 }

 function pageNumbers(): (number | 'ellipsis')[] {
  const nums: (number | 'ellipsis')[] = [];
  nums.push(1);
  if (safePage > 3) nums.push('ellipsis');
  for (let n = Math.max(2, safePage - 1); n <= Math.min(totalPages - 1, safePage + 1); n++) {
   nums.push(n);
  }
  if (safePage < totalPages - 2) nums.push('ellipsis');
  if (totalPages > 1) nums.push(totalPages);
  return nums;
 }

 const doctorName = session.user.name ?? 'Doctor';

 return (
  <div className="min-h-full bg-[#f0f7f3]">

   {/* ── Top bar ── */}
   <div className="bg-white border-b border-border px-6 py-3
    flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-md">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
     <form method="GET">
      {activeFilter !== 'all' && (
       <input type="hidden" name="filter" value={activeFilter} />
      )}
      {sortKey !== 'recent' && (
       <input type="hidden" name="sort" value={sortKey} />
      )}
      <input
       name="q"
       type="text"
       defaultValue={searchQuery}
       placeholder="Search by name or patient ID"
       className="w-full h-9 pl-9 pr-4 border border-border bg-muted/40
        text-sm text-foreground placeholder:text-muted-foreground
        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
      />
     </form>
    </div>
    <div className="flex items-center gap-3">
     <NotificationBell />
     <button type="button" aria-label="Settings"
      className="h-8 w-8 flex items-center justify-center 
       text-muted-foreground hover:bg-muted transition-colors">
      <Settings className="h-4 w-4" />
     </button>
     <div className="pl-3 border-l border-border flex items-center gap-2.5">
      <div className="text-right hidden sm:block">
       <p className="text-sm font-semibold text-foreground leading-none">
        Dr. {doctorName}
       </p>
       <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
        {doctorRow.specialization}
       </p>
      </div>
      <div className="h-8 w-8 bg-primary/10 text-primary
       flex items-center justify-center text-xs font-bold shrink-0">
       {getInitials(doctorName)}
      </div>
     </div>
    </div>
   </div>

   {/* ── Page body ── */}
   <div className="px-6 py-5 max-w-6xl mx-auto">

    {/* ── Page header ── */}
    <div className="mb-4">
     <h1 className="text-base font-bold text-primary">My Patients</h1>
     <p className="text-sm text-muted-foreground mt-0.5">
      {total.toLocaleString()} patient{total !== 1 ? 's' : ''} managed
     </p>
    </div>

    {/* ── Quick filters + sort ── */}
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
     <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground mr-1">
       Quick Filters:
      </span>

      {[
       { key: 'all',    label: 'All Patients'    },
       { key: 'week',    label: 'Seen this week'   },
       { key: 'conditions', label: 'Chronic conditions' },
      ].map((f) => (
       <Link
        key={f.key}
        href={buildHref({ filter: f.key, page: 1 })}
        className={`h-8 px-3.5 text-sm font-medium border transition-colors
         ${activeFilter === f.key
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'bg-white text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'}`}
       >
        {f.label}
       </Link>
      ))}

      <button type="button"
       className="h-8 px-3.5 text-sm font-medium border border-border
        bg-white text-muted-foreground hover:text-foreground
        flex items-center gap-1.5 transition-colors">
       <SlidersHorizontal className="h-3.5 w-3.5" />
       More Filters
      </button>
     </div>

     {/* Sort */}
     <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Sort by:</span>
      {(
       [
        { key: 'recent', label: 'Last Visit (Newest)' },
        { key: 'oldest', label: 'Last Visit (Oldest)' },
        { key: 'name',  label: 'Name (A–Z)'     },
       ] as const
      ).map((opt) => (
       <Link
        key={opt.key}
        href={buildHref({ sort: opt.key, page: 1 })}
        className={`h-8 px-3 text-xs font-medium border transition-colors
         ${sortKey === opt.key
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'bg-white text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'}`}
       >
        {opt.label}
       </Link>
      ))}
     </div>
    </div>

    {/* ── Patients table ── */}
    <div className="bg-white border border-border overflow-hidden  mb-4">

     {/* Table header */}
     <div className="grid grid-cols-[130px_1fr_110px_130px_1fr_1fr_100px]
      px-5 py-3 border-b border-border bg-muted/20">
      {[
       'PATIENT ID', 'PATIENT NAME', 'AGE/GENDER',
       'LAST VISIT', 'LAST DIAGNOSIS', 'CHRONIC CONDITIONS', 'ACTIONS',
      ].map((h, i) => (
       <p key={h}
        className={`text-[10px] font-bold uppercase tracking-widest
         text-muted-foreground ${i === 6 ? 'text-right' : ''}`}>
        {h}
       </p>
      ))}
     </div>

     {/* Rows */}
     {pageItems.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-20
       text-muted-foreground gap-2">
       <p className="text-sm font-medium">No patients found</p>
       <p className="text-xs">
        {searchQuery
         ? 'Try a different search term.'
         : activeFilter !== 'all'
          ? 'No patients match this filter.'
          : 'You have no patients yet.'}
       </p>
      </div>
     ) : (
      <ul className="divide-y divide-border">
       {pageItems.map((p) => {
        const age    = calcAge(p.patientDob);
        const patientCode = `PAT-${p.patientId.slice(0, 4).toUpperCase()}-${p.patientId.slice(4, 5).toUpperCase()}`;
        const conditions = p.patientAllergies
         ? p.patientAllergies.split(',').map((a) => a.trim()).filter(Boolean)
         : [];

        return (
         <li key={p.patientId}
          className="grid grid-cols-[130px_1fr_110px_130px_1fr_1fr_100px]
           items-center px-5 py-4 hover:bg-muted/20 transition-colors">

          {/* Patient ID */}
          <div>
           <p className="text-xs text-muted-foreground font-mono">
            {patientCode}
           </p>
          </div>

          {/* Patient Name */}
          <div className="flex items-center gap-2.5 min-w-0">
           <div className={`h-8 w-8 flex items-center justify-center
            text-xs font-bold shrink-0 ${avatarColor(p.patientName ?? '')}`}>
            {getInitials(p.patientName)}
           </div>
           <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
             {p.patientName ?? '—'}
            </p>
           </div>
          </div>

          {/* Age / Gender */}
          <div>
           <p className="text-sm text-muted-foreground">
            {age !== null ? `${age}` : '—'}
            {p.patientGender && (
             <span className="capitalize"> / {p.patientGender}</span>
            )}
           </p>
          </div>

          {/* Last Visit */}
          <div>
           <p className={`text-sm font-medium
            ${new Date(p.visitedAt) >= thisWeek.start
             ? 'text-primary'
             : 'text-foreground'}`}>
            {format(new Date(p.visitedAt), 'MMM d, yyyy')}
           </p>
          </div>

          {/* Last Diagnosis */}
          <div className="min-w-0 pr-3">
           <p className="text-sm text-muted-foreground truncate">
            {p.diagnosis ?? (
             <span className="italic text-muted-foreground/50">
              None reported
             </span>
            )}
           </p>
          </div>

          {/* Chronic Conditions */}
          <div className="min-w-0 pr-3">
           {conditions.length === 0 ? (
            <span className="text-xs text-muted-foreground/50 italic">
             None reported
            </span>
           ) : (
            <div className="flex flex-wrap gap-1">
             {conditions.slice(0, 2).map((c) => (
              <span key={c}
               className={`px-2 py-0.5 border text-[10px]
                font-semibold uppercase tracking-wide
                ${conditionTagStyle(c)}`}>
               {c}
              </span>
             ))}
             {conditions.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
               +{conditions.length - 2}
              </span>
             )}
            </div>
           )}
          </div>

          {/* Actions */}
          <div className="flex justify-end">
           <Link
            href={`/doctor/patients/${p.patientId}`}
            className="text-sm font-semibold text-primary hover:underline
             whitespace-nowrap leading-tight text-right"
           >
            View<br />Details
           </Link>
          </div>
         </li>
        );
       })}
      </ul>
     )}

     {/* Pagination row */}
     {total > 0 && (
      <div className="flex items-center justify-between px-5 py-4
       border-t border-border bg-muted/10">
       <p className="text-xs text-muted-foreground">
        Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, total)} of{' '}
        {total.toLocaleString()} patients
       </p>

       <div className="flex items-center gap-1">
        <Link
         href={buildHref({ page: safePage - 1 })}
         aria-disabled={safePage === 1}
         className={`h-7 w-7 flex items-center justify-center 
          border border-border bg-white transition-colors
          ${safePage === 1
           ? 'pointer-events-none opacity-40'
           : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
         <ChevronLeft className="h-3.5 w-3.5" />
        </Link>

        {pageNumbers().map((n, i) =>
         n === 'ellipsis' ? (
          <span key={`e-${i}`}
           className="h-7 w-7 flex items-center justify-center
            text-xs text-muted-foreground">
           …
          </span>
         ) : (
          <Link
           key={n}
           href={buildHref({ page: n })}
           className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center
             text-xs font-medium border transition-colors
            ${n === safePage
             ? 'bg-primary text-primary-foreground border-primary'
             : 'bg-white border-border text-muted-foreground hover:bg-muted'}`}
          >
           {n}
          </Link>
         ),
        )}

        <Link
         href={buildHref({ page: safePage + 1 })}
         aria-disabled={safePage === totalPages}
         className={`h-7 w-7 flex items-center justify-center 
          border border-border bg-white transition-colors
          ${safePage === totalPages
           ? 'pointer-events-none opacity-40'
           : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
         <ChevronRight className="h-3.5 w-3.5" />
        </Link>
       </div>
      </div>
     )}
    </div>

    {/* ── Bottom cards ── */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

     {/* Treatment Insights */}
     <div className="bg-white border border-border p-5 ">
      <div className="flex items-center gap-2 mb-3">
       <TrendingUp className="h-4 w-4 text-primary" />
       <h3 className="text-sm font-semibold text-foreground">Treatment Insights</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
       You have managed{' '}
       <span className="font-semibold text-foreground">{total}</span>{' '}
       unique patients.{' '}
       {followUpRate > 0
        ? `${followUpRate}% of your patients have returned for follow-up visits.`
        : 'Start recording visits to see engagement metrics.'}
      </p>

      <div className="mt-4 pt-4 border-t border-border
       grid grid-cols-2 divide-x divide-border">
       <div className="pr-4">
        <p className="text-2xl font-bold text-primary">
         {uniqueNewThisMonth}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-widest
         text-muted-foreground mt-0.5">
         New Patients This Month
        </p>
       </div>
       <div className="pl-4">
        <p className="text-2xl font-bold text-foreground">
         {followUpRate}%
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-widest
         text-muted-foreground mt-0.5">
         Follow-up Rate
        </p>
       </div>
      </div>
     </div>

     {/* Medical Updates */}
     <div className=" p-5 text-white"
      style={{ backgroundColor: '#01411C' }}>
      <div className="flex items-center gap-2 mb-3">
       <BookOpen className="h-4 w-4 text-white/60" />
       <h3 className="text-sm font-semibold text-white">Medical Updates</h3>
      </div>
      <p className="text-sm text-white/75 leading-relaxed">
       New clinical guidelines and protocol updates are available. Stay current
       with the latest evidence-based recommendations for your specialty.
      </p>

      <button
       type="button"
       className="mt-5 w-full h-9 bg-white text-sm font-semibold
        text-[#01411C] hover:bg-white/90 transition-colors"
      >
       Review Guidelines
      </button>
     </div>
    </div>
   </div>
  </div>
 );
}
