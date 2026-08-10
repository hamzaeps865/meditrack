import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { appointments, doctors, patients, doctorAvailability } from '@/server/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import Link from 'next/link';
import {
  format,
  startOfDay, endOfDay,
  addDays, subDays, isSameDay,
  startOfWeek, endOfWeek, eachDayOfInterval,
  addWeeks, subWeeks,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Search, ChevronDown, ExternalLink } from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import DoctorDropdown from '@/components/doctor/doctor-dropdown';

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, {
  dot: string;
  label: string;
  badge: string;
  rowHighlight?: boolean;
  dim?: boolean;
}> = {
  scheduled:   { dot: 'bg-blue-500',    label: 'Scheduled',   badge: 'text-blue-600 font-semibold' },
  checked_in:  { dot: 'bg-amber-400',   label: 'Checked-in',  badge: 'bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2.5 py-0.5 text-xs font-semibold', rowHighlight: true },
  in_progress: { dot: 'bg-primary',     label: 'In-Progress', badge: 'bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold', rowHighlight: true },
  completed:   { dot: 'bg-emerald-500', label: 'Completed',   badge: 'text-emerald-600 font-semibold' },
  cancelled:   { dot: 'bg-red-400',     label: 'Cancelled',   badge: 'bg-red-50 text-red-500 border border-red-200 rounded-full px-2.5 py-0.5 text-xs font-semibold', dim: true },
  no_show:     { dot: 'bg-gray-400',    label: 'No-show',     badge: 'text-gray-400 font-semibold', dim: true },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function buildSlotsForDay(
  availability: { dayOfWeek: string; startTime: string; endTime: string }[],
  date: Date
) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  const dayAvail = availability.filter((a) => a.dayOfWeek === dayName);
  
  const slots: string[] = [];
  for (const block of dayAvail) {
    const [startH, startM] = block.startTime.split(':').map(Number);
    const [endH, endM] = block.endTime.split(':').map(Number);
    
    let currentH = startH;
    let currentM = startM;
    while (currentH < endH || (currentH === endH && currentM < endM)) {
      slots.push(`${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`);
      currentM += 30;
      if (currentM >= 60) {
        currentH += 1;
        currentM -= 60;
      }
    }
  }
  return Array.from(new Set(slots)).sort();
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

async function getDoctorAppointments(doctorId: string, from: Date, to: Date) {
  return db
    .select({
      id:          appointments.id,
      scheduledAt: appointments.scheduledAt,
      status:      appointments.status,
      reason:      appointments.reason,
      patientId:   appointments.patientId,
      patientName: patients.name,
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.scheduledAt, from),
        lte(appointments.scheduledAt, to),
      ),
    )
    .orderBy(appointments.scheduledAt);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DoctorAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== 'doctor') redirect('/login');

  const [doctorRow] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, session.user.id));

  if (!doctorRow) redirect('/doctor');

  const availability = await db
    .select()
    .from(doctorAvailability)
    .where(eq(doctorAvailability.doctorId, doctorRow.id));

  const params       = await searchParams;
  const view         = params.view === 'week' ? 'week' : 'day';
  const selectedDate = params.date ? new Date(params.date) : new Date();
  const isToday      = isSameDay(selectedDate, new Date());
  const fmt          = 'yyyy-MM-dd';

  const rangeStart = view === 'week'
    ? startOfWeek(selectedDate, { weekStartsOn: 1 })
    : startOfDay(selectedDate);
  const rangeEnd = view === 'week'
    ? endOfWeek(selectedDate, { weekStartsOn: 1 })
    : endOfDay(selectedDate);

  const allAppts = await getDoctorAppointments(doctorRow.id, rangeStart, rangeEnd);

  // Day-scoped appointments for the table and footer stats
  const dayAppts = view === 'week'
    ? allAppts
    : allAppts.filter((a) => isSameDay(new Date(a.scheduledAt), selectedDate));

  let unifiedSlots: { type: 'empty' | 'appt'; time: string; appt?: any }[] = [];
  
  if (view === 'day') {
    const timeSlots = buildSlotsForDay(availability, selectedDate);
    const apptsByTime = new Map<string, typeof dayAppts>();
    for (const appt of dayAppts) {
      const timeKey = format(new Date(appt.scheduledAt), 'HH:mm');
      if (!apptsByTime.has(timeKey)) apptsByTime.set(timeKey, []);
      apptsByTime.get(timeKey)!.push(appt);
    }
    
    for (const time of timeSlots) {
      if (apptsByTime.has(time)) {
        unifiedSlots.push(...apptsByTime.get(time)!.map(appt => ({ type: 'appt' as const, appt, time })));
        apptsByTime.delete(time);
      }
      // Empty slots are intentionally omitted — only booked appointments are shown
    }
    
    for (const [time, appts] of Array.from(apptsByTime.entries())) {
      unifiedSlots.push(...appts.map(appt => ({ type: 'appt' as const, appt, time })));
    }
    
    unifiedSlots.sort((a, b) => a.time.localeCompare(b.time));
  } else {
    unifiedSlots = dayAppts.map(appt => ({ type: 'appt' as const, appt, time: format(new Date(appt.scheduledAt), 'HH:mm') }));
  }

  const total     = dayAppts.length;
  const done      = dayAppts.filter((a) => a.status === 'completed').length;
  const remaining = dayAppts.filter((a) =>
    a.status === 'scheduled' || a.status === 'checked_in' || a.status === 'in_progress',
  ).length;

  // Week-view days
  const weekDays = view === 'week'
    ? eachDayOfInterval({ start: rangeStart, end: rangeEnd })
    : null;

  // Navigation
  const prevHref = view === 'week'
    ? `?view=week&date=${format(subWeeks(selectedDate, 1), fmt)}`
    : `?view=day&date=${format(subDays(selectedDate, 1), fmt)}`;
  const nextHref = view === 'week'
    ? `?view=week&date=${format(addWeeks(selectedDate, 1), fmt)}`
    : `?view=day&date=${format(addDays(selectedDate, 1), fmt)}`;
  const todayHref = `?view=${view}&date=${format(new Date(), fmt)}`;

  const doctorName = session.user.name ?? 'Doctor';

  return (
    <div className="min-h-full bg-[#f5f7fa]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search appointments or patients..."
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-muted/40
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />

          <DoctorDropdown doctorName={doctorName} />
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="px-6 py-6 max-w-4xl mx-auto">

        {/* ── Header row ── */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-base font-bold text-foreground">My Appointments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {view === 'week' && weekDays
                ? `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`
                : format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* View toggle + date nav */}
          <div className="flex items-center gap-2">
            {/* Day / Week toggle */}
            <div className="flex items-center rounded-lg border border-border bg-white overflow-hidden">
              <Link
                href={`?view=day&date=${format(selectedDate, fmt)}`}
                className={`px-4 py-1.5 text-sm font-medium transition-colors
                  ${view === 'day'
                    ? 'bg-foreground text-white'
                    : 'text-muted-foreground hover:text-foreground'}`}
              >
                Day
              </Link>
              <Link
                href={`?view=week&date=${format(selectedDate, fmt)}`}
                className={`px-4 py-1.5 text-sm font-medium border-l border-border transition-colors
                  ${view === 'week'
                    ? 'bg-foreground text-white'
                    : 'text-muted-foreground hover:text-foreground'}`}
              >
                Week
              </Link>
            </div>

            {/* Prev / Today / Next */}
            <div className="flex items-center gap-0.5">
              <Link
                href={prevHref}
                aria-label="Previous"
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border
                  bg-white text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={todayHref}
                className={`h-8 px-3 flex items-center justify-center rounded-lg border border-border
                  bg-white text-sm font-medium transition-colors
                  ${isToday && view === 'day'
                    ? 'text-primary border-primary/30'
                    : 'text-foreground hover:bg-muted'}`}
              >
                Today
              </Link>
              <Link
                href={nextHref}
                aria-label="Next"
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border
                  bg-white text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Week day picker (week view only) ── */}
        {view === 'week' && weekDays && (
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {weekDays.map((day) => {
              const count  = allAppts.filter((a) => isSameDay(new Date(a.scheduledAt), day)).length;
              const active = isSameDay(day, selectedDate);
              const today  = isSameDay(day, new Date());
              return (
                <Link
                  key={day.toISOString()}
                  href={`?view=week&date=${format(day, fmt)}`}
                  className={`flex flex-col items-center py-2 rounded-xl text-center
                    transition-colors
                    ${active ? 'bg-primary text-primary-foreground' : 'bg-white border border-border hover:bg-muted/50'}`}
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-wide
                    ${active ? 'text-primary-foreground/70' : today ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={`text-lg font-bold mt-0.5
                    ${active ? 'text-white' : today ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  {count > 0 && (
                    <span className={`text-[10px] mt-0.5
                      ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {count} appt{count !== 1 ? 's' : ''}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Appointments table ── */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">

          {/* Table header */}
          <div className="grid grid-cols-[100px_1fr_1fr_160px_140px] gap-4
            px-6 py-3 border-b border-border bg-muted/30">
            {['TIME', 'PATIENT NAME', 'REASON', 'STATUS', 'ACTION'].map((h, i) => (
              <p key={h}
                className={`text-[11px] font-semibold text-muted-foreground uppercase
                  tracking-widest ${i === 4 ? 'text-right' : ''}`}>
                {h}
              </p>
            ))}
          </div>
           
          {/* Rows */}
          {unifiedSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20
              text-muted-foreground gap-2">
              <p className="text-sm font-medium">No appointments or slots</p>
              <p className="text-xs">
                {isToday
                  ? 'Your schedule is clear for today.'
                  : `Nothing scheduled for ${format(selectedDate, 'MMM d')}.`}
              </p>
            </div>
          ) : (
            <ul>
              {unifiedSlots.map((item, idx) => {
                const isLast = idx === unifiedSlots.length - 1;

                const appt = item.appt;
                const cfg         = statusConfig[appt.status] ?? statusConfig.scheduled;
                const isDone      = appt.status === 'completed';
                const isCancelled = appt.status === 'cancelled' || appt.status === 'no_show';
                const isCheckedIn = appt.status === 'checked_in';
                const isInProgress = appt.status === 'in_progress';

                return (
                  <li
                    key={appt.id}
                    className={`grid grid-cols-[100px_1fr_1fr_160px_140px] gap-4
                      items-center px-6 py-4
                      ${!isLast ? 'border-b border-border' : ''}
                      ${cfg.rowHighlight ? 'bg-primary/[0.025] border-l-2 border-l-primary' : ''}
                      ${isCancelled ? 'opacity-55' : ''}`}
                  >
                    {/* Time */}
                    <div>
                      <p className={`text-sm font-mono font-semibold tabular-nums
                        ${cfg.rowHighlight ? 'text-primary' : isCancelled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {format(new Date(appt.scheduledAt), 'hh:mm a')}
                      </p>
                    </div>

                    {/* Patient name */}
                    <div>
                      <p className={`text-sm font-bold
                        ${isCancelled ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {appt.patientName ?? '—'}
                      </p>
                    </div>

                    {/* Reason */}
                    <div>
                      <p className={`text-sm
                        ${isCancelled
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground'}`}>
                        {appt.reason ?? '—'}
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      {/* Simple text statuses */}
                      {(appt.status === 'scheduled' || appt.status === 'completed') && (
                        <div className="flex flex-col gap-0.5">
                          <span className={`flex items-center gap-1.5 text-sm ${cfg.badge}`}>
                            <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          {appt.status === 'scheduled' && (
                            <span className="text-[10px] text-muted-foreground uppercase
                              tracking-wide pl-3.5">
                              NOT CHECKED IN
                            </span>
                          )}
                        </div>
                      )}

                      {/* Pill statuses */}
                      {(appt.status === 'checked_in' || appt.status === 'in_progress' || appt.status === 'cancelled' || appt.status === 'no_show') && (
                        <span className={`inline-flex items-center gap-1.5 ${cfg.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex justify-end">
                      {isDone && (
                        <Link
                          href={`/doctor/appointments/${appt.id}`}
                          className="flex items-center gap-1.5 text-sm font-medium
                            text-foreground hover:text-primary transition-colors"
                        >
                          View Record
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}

                      {isInProgress && (
                        <Link
                          href={`/doctor/appointments/${appt.id}`}
                          className="h-9 px-4 rounded-lg bg-foreground text-white text-sm
                            font-semibold hover:bg-foreground/90 transition-colors
                            flex items-center"
                        >
                          Complete Visit
                        </Link>
                      )}

                      {isCheckedIn && (
                        <Link
                          href={`/doctor/appointments/${appt.id}`}
                          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground
                            text-sm font-semibold hover:bg-primary/90 transition-colors
                            flex items-center"
                        >
                          Start Visit
                        </Link>
                      )}

                      {appt.status === 'scheduled' && (
                        <span className="text-sm text-muted-foreground">Pending</span>
                      )}

                      {isCancelled && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Footer stats ── */}
        {dayAppts.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-0">
            {[
              { value: total,     label: 'TOTAL',     color: 'text-primary' },
              { value: done,      label: 'DONE',      color: 'text-emerald-600' },
              { value: remaining, label: 'REMAINING', color: 'text-foreground' },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-col items-center px-10
                  ${i < 2 ? 'border-r border-border' : ''}`}
              >
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-semibold text-muted-foreground
                  uppercase tracking-widest mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
