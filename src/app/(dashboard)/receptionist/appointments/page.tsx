import { getAllAppointments } from '@/server/actions/appointments.actions';
import { getAllDoctors } from '@/server/actions/doctors.actions';
import Link from 'next/link';
import { format, startOfDay, endOfDay, addDays, subDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import BookAppointmentButton from '@/components/receptionist/book-appointment-button';

// ─── Config ───────────────────────────────────────────────────────────────────

const SLOT_START_HOUR = 8;
const SLOT_END_HOUR   = 18;
const SLOT_MINUTES    = 30;
const ROW_HEIGHT_PX   = 52;

function buildTimeSlots() {
  const slots: { hour: number; minute: number }[] = [];
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push({ hour: h, minute: m });
    }
  }
  return slots;
}

const statusStyles: Record<string, {
  bg: string; border: string; badge: string; label: string; dot: string;
}> = {
  scheduled:   { bg: 'bg-blue-50',    border: 'border-l-blue-400',    badge: 'bg-blue-100 text-blue-700',    label: 'Scheduled',   dot: 'bg-blue-400' },
  checked_in:  { bg: 'bg-amber-50',   border: 'border-l-amber-400',   badge: 'bg-amber-100 text-amber-700',  label: 'Checked In',  dot: 'bg-amber-400' },
  in_progress: { bg: 'bg-orange-50',  border: 'border-l-orange-400',  badge: 'bg-orange-100 text-orange-700',label: 'In Progress', dot: 'bg-orange-400' },
  completed:   { bg: 'bg-emerald-50', border: 'border-l-emerald-400', badge: 'bg-emerald-100 text-emerald-700', label: 'Completed', dot: 'bg-emerald-400' },
  cancelled:   { bg: 'bg-red-50',     border: 'border-l-red-400',     badge: 'bg-red-100 text-red-600',      label: 'Cancelled',   dot: 'bg-red-400' },
  no_show:     { bg: 'bg-gray-50',    border: 'border-l-gray-300',    badge: 'bg-gray-100 text-gray-500',    label: 'No Show',     dot: 'bg-gray-300' },
};

function slotIndexForTime(date: Date): number {
  const totalMinutes = (date.getHours() - SLOT_START_HOUR) * 60 + date.getMinutes();
  return Math.floor(totalMinutes / SLOT_MINUTES);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  // Next.js 15+: searchParams is a Promise
  const params = await searchParams;

  const view         = params.view === 'week' ? 'week' : 'day';
  const selectedDate = params.date ? new Date(params.date) : new Date();
  const dayStart     = startOfDay(selectedDate);
  const dayEnd       = endOfDay(selectedDate);
  const isToday      = isSameDay(selectedDate, new Date());

  // Fetch all data in parallel
  const [allAppointments, allDoctors] = await Promise.all([
    getAllAppointments(),
    getAllDoctors(),
  ]);

  // Filter appointments to the selected day
  const dayAppointments = allAppointments.filter((a) => {
    const t = new Date(a.scheduledAt);
    return t >= dayStart && t <= dayEnd;
  });

  // Stats for the header strip
  const totalToday     = dayAppointments.length;
  const completedToday = dayAppointments.filter((a) => a.status === 'completed').length;
  const scheduledToday = dayAppointments.filter((a) => a.status === 'scheduled').length;
  const checkedIn      = dayAppointments.filter((a) => a.status === 'checked_in').length;

  // Build doctor columns — ALL doctors from DB, not just those with appointments today
  // This matches the design in your screenshot (Dr. Sterling, Dr. Jenkins columns always visible)
  const doctorColumns = allDoctors.map((d) => ({
    id:             d.id,
    name:           d.name ?? 'Unknown',
    specialization: d.specialization,
  }));

  const slots = buildTimeSlots();

  // Nav hrefs
  const fmt        = 'yyyy-MM-dd';
  const prevHref   = `?view=${view}&date=${format(subDays(selectedDate, 1), fmt)}`;
  const nextHref   = `?view=${view}&date=${format(addDays(selectedDate, 1), fmt)}`;
  const todayHref  = `?view=${view}&date=${format(new Date(), fmt)}`;
  const dayHref    = `?view=day&date=${format(selectedDate, fmt)}`;
  const weekHref   = `?view=week&date=${format(selectedDate, fmt)}`;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Top toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-bold text-foreground">Appointments</h1>

          {/* Day / Week toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {(['day', 'week'] as const).map((v) => (
              <Link
                key={v}
                href={v === 'day' ? dayHref : weekHref}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors
                  ${view === v
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'}`}
              >
                {v}
              </Link>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <Link
              href={prevHref}
              aria-label="Previous day"
              className="h-7 w-7 flex items-center justify-center rounded-md
                text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={todayHref}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Today
            </Link>
            <Link
              href={nextHref}
              aria-label="Next day"
              className="h-7 w-7 flex items-center justify-center rounded-md
                text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <span className="text-sm font-semibold text-foreground whitespace-nowrap">
            {format(selectedDate, 'EEEE, MMM d, yyyy')}
          </span>
        </div>

        <BookAppointmentButton doctors={allDoctors} />
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Today',  value: totalToday,     color: 'text-foreground' },
          { label: 'Scheduled',    value: scheduledToday, color: 'text-blue-600' },
          { label: 'Checked In',   value: checkedIn,      color: 'text-amber-600' },
          { label: 'Completed',    value: completedToday, color: 'text-emerald-600' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
            <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      {doctorColumns.length === 0 ? (
        <div className="bg-card rounded-xl border border-border flex flex-col items-center
          justify-center py-24 text-muted-foreground gap-3">
          <Calendar className="h-10 w-10 opacity-30" />
          <p className="text-base font-medium">No doctors registered yet</p>
          <p className="text-sm">Add doctors from the admin panel to see their schedules here.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <div
            className="grid min-w-[640px]"
            style={{ gridTemplateColumns: `72px repeat(${doctorColumns.length}, 1fr)` }}
          >

            {/* ── Column headers ── */}
            <div className="border-b border-r border-border bg-muted/30 h-14" />
            {doctorColumns.map((doc, i) => (
              <div
                key={doc.id}
                className={`border-b border-border bg-muted/30 px-3 py-3 text-center
                  ${i < doctorColumns.length - 1 ? 'border-r' : ''}`}
              >
                <p className="text-sm font-semibold text-primary truncate">
                  Dr. {doc.name}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5 truncate">
                  {doc.specialization}
                </p>
              </div>
            ))}

            {/* ── Time rows ── */}
            {slots.map((slot, rowIndex) => {
              const isHour = slot.minute === 0;
              return (
                <>
                  {/* Time label */}
                  <div
                    key={`time-${rowIndex}`}
                    className={`border-r border-border px-2 flex items-start justify-end pt-1.5
                      ${rowIndex < slots.length - 1 ? 'border-b' : ''}`}
                    style={{ height: ROW_HEIGHT_PX }}
                  >
                    {isHour && (
                      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                        {format(new Date(2000, 0, 1, slot.hour, 0), 'h:mm a')}
                      </span>
                    )}
                  </div>

                  {/* Doctor cells */}
                  {doctorColumns.map((doc, colIndex) => {
                    const cellAppts = dayAppointments.filter(
                      (a) => a.doctorId === doc.id &&
                        slotIndexForTime(new Date(a.scheduledAt)) === rowIndex,
                    );

                    return (
                      <div
                        key={`${doc.id}-${rowIndex}`}
                        className={`relative
                          ${rowIndex < slots.length - 1 ? 'border-b' : ''}
                          ${colIndex < doctorColumns.length - 1 ? 'border-r' : ''}
                          border-border
                          ${isHour ? 'bg-muted/10' : ''}`}
                        style={{ height: ROW_HEIGHT_PX }}
                      >
                        {cellAppts.map((appt) => {
                          const s = statusStyles[appt.status] ?? statusStyles.scheduled;
                          return (
                            <Link
                              key={appt.id}
                              href={`/receptionist/appointments/${appt.id}`}
                              className={`absolute inset-1 rounded-md border-l-[3px]
                                ${s.bg} ${s.border} px-2 py-1
                                hover:shadow-sm hover:brightness-95 transition-all z-[1]
                                overflow-hidden`}
                            >
                              <div className="flex items-center gap-1.5">
                                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.dot}`} />
                                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                                  {appt.patientName ?? '—'}
                                </p>
                              </div>
                              {appt.reason && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5 pl-3">
                                  {appt.reason}
                                </p>
                              )}
                              <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full
                                text-[9px] font-medium uppercase tracking-wide ${s.badge}`}>
                                {s.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty day message (doctors exist but no appointments) ── */}
      {doctorColumns.length > 0 && dayAppointments.length === 0 && (
        <p className="text-center text-sm text-muted-foreground -mt-2">
          No appointments for {format(selectedDate, 'EEEE, MMMM d')} — the schedule is open.
        </p>
      )}
    </div>
  );
}
