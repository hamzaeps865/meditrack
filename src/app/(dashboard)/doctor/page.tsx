import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import {
  appointments, doctors, patients, visits,
} from '@/server/db/schema';
import {
  eq, and, gte, lte, desc, count, isNull,
} from 'drizzle-orm';
import Link from 'next/link';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import {
  Search, Settings, Calendar, ChevronRight,
  ClipboardList, BarChart2, Clock, CheckCircle2, Printer, Star,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import { getDoctorRatingSummary, getReviewsForDoctor } from '@/server/actions/reviews.actions';
import { StarRating } from '@/components/shared/star-rating';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, {
  badge: string;
  label: string;
  rowBg?: string;
  strikethrough?: boolean;
}> = {
  scheduled:   { badge: 'bg-blue-100 text-blue-700',    label: 'Scheduled' },
  checked_in:  { badge: 'bg-amber-100 text-amber-700',  label: 'Checked-in',  rowBg: 'bg-primary/5' },
  in_progress: { badge: 'bg-orange-100 text-orange-700',label: 'In Progress', rowBg: 'bg-orange-50' },
  completed:   { badge: 'bg-emerald-100 text-emerald-700', label: 'Completed', strikethrough: true },
  cancelled:   { badge: 'bg-red-100 text-red-600',      label: 'Cancelled',   strikethrough: true },
  no_show:     { badge: 'bg-gray-100 text-gray-500',    label: 'No-show',     strikethrough: true },
};

const reasonIcons: Record<string, string> = {
  'Follow-up':    '🗓',
  'Consultation': '📋',
  'Routine Check':'✅',
};

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function getDoctorProfile(userId: string) {
  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, userId));
  return doctor ?? null;
}

async function getTodayAppointments(doctorId: string) {
  const today = new Date();
  const rows = await db
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
        gte(appointments.scheduledAt, startOfDay(today)),
        lte(appointments.scheduledAt, endOfDay(today)),
      ),
    )
    .orderBy(appointments.scheduledAt);
  return rows;
}

async function getWeekPatientCount(doctorId: string) {
  const now = new Date();
  const [row] = await db
    .select({ count: count() })
    .from(visits)
    .where(
      and(
        eq(visits.doctorId, doctorId),
        gte(visits.createdAt, startOfWeek(now, { weekStartsOn: 1 })),
        lte(visits.createdAt, endOfWeek(now, { weekStartsOn: 1 })),
      ),
    );
  return row?.count ?? 0;
}

async function getRecentPatients(doctorId: string) {
  // Most recently visited patients via the visits table
  const rows = await db
    .select({
      patientId:   visits.patientId,
      patientName: patients.name,
      visitedAt:   visits.createdAt,
    })
    .from(visits)
    .leftJoin(patients, eq(visits.patientId, patients.id))
    .where(eq(visits.doctorId, doctorId))
    .orderBy(desc(visits.createdAt))
    .limit(10);

  // De-duplicate by patientId, keep only the most recent visit per patient
  const seen = new Set<string>();
  const unique: typeof rows = [];
  for (const row of rows) {
    if (!seen.has(row.patientId)) {
      seen.add(row.patientId);
      unique.push(row);
      if (unique.length === 3) break;
    }
  }
  return unique;
}

async function getDoctorAvailabilityDays(doctorId: string) {
  const { doctorAvailability } = await import('@/server/db/schema');
  const rows = await db
    .select({ dayOfWeek: doctorAvailability.dayOfWeek })
    .from(doctorAvailability)
    .where(eq(doctorAvailability.doctorId, doctorId));

  const dayMap: Record<string, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
    friday: 4, saturday: 5, sunday: 6,
  };

  const activeDays = new Set(rows.map((r) => dayMap[r.dayOfWeek]));
  return activeDays;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DoctorDashboard() {
  const session = await auth();
  if (!session || session.user.role !== 'doctor') redirect('/login');

  const doctor = await getDoctorProfile(session.user.id);
  if (!doctor) {
    // User has doctor role but no doctor profile yet — show a setup prompt
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <ClipboardList className="h-12 w-12 text-muted-foreground opacity-40" />
        <h2 className="text-lg font-semibold text-foreground">Doctor profile not set up</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          An administrator needs to link your account to a doctor profile before you can access
          the dashboard.
        </p>
      </div>
    );
  }

  const [todayAppointments, weekPatients, recentPatients, availabilityDays, ratingSummary, recentReviews] =
    await Promise.all([
      getTodayAppointments(doctor.id),
      getWeekPatientCount(doctor.id),
      getRecentPatients(doctor.id),
      getDoctorAvailabilityDays(doctor.id),
      getDoctorRatingSummary(doctor.id),
      getReviewsForDoctor(doctor.id, 3),
    ]);

  const total     = todayAppointments.length;
  const completed = todayAppointments.filter((a) => a.status === 'completed').length;
  const remaining = todayAppointments.filter(
    (a) => a.status === 'scheduled' || a.status === 'checked_in' || a.status === 'in_progress',
  ).length;

  // Find the "next up" appointment (first checked_in, then scheduled)
  const nextUp =
    todayAppointments.find((a) => a.status === 'checked_in') ??
    todayAppointments.find((a) => a.status === 'scheduled') ??
    null;

  const doctorName = session.user.name ?? 'Doctor';
  const initials   = getInitials(doctorName);
  const today      = new Date();

  return (
    <div>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patients, records..."
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link
            href="/doctor/settings"
            aria-label="Settings"
            className="h-9 w-9 flex items-center justify-center rounded-full
              text-muted-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-none">
                Dr. {doctorName}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                {doctor.specialization}
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary
              flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero greeting ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, Dr. {doctorName.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {format(today, 'MMMM d, yyyy')}
            {total > 0 && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{total} appointment{total !== 1 ? 's' : ''} today</span>
                {remaining > 0 && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-primary font-medium">{remaining} remaining</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>

        <Link
          href="/doctor/appointments"
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border
            bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Daily Schedule
        </Link>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

        {/* ── LEFT: Today's timeline ── */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Today&apos;s Timeline
            </h2>
            <Link
              href="/doctor/appointments"
              className="text-xs font-medium text-primary hover:underline"
            >
              View Calendar
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Clock className="h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">No appointments today</p>
              <p className="text-xs">Your schedule is clear.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {todayAppointments.map((appt) => {
                const cfg        = statusConfig[appt.status] ?? statusConfig.scheduled;
                const isNextUp   = appt.id === nextUp?.id;
                const isComplete = appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'no_show';
                const apptInitials = getInitials(appt.patientName);

                return (
                  <li
                    key={appt.id}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors
                      ${isNextUp ? 'bg-primary/5 border-l-4 border-l-primary' : ''}
                      ${isComplete ? 'opacity-60' : ''}`}
                  >
                    {/* Time */}
                    <div className="w-16 shrink-0">
                      <p className={`text-xs font-semibold tabular-nums
                        ${isNextUp ? 'text-primary' : 'text-muted-foreground'}`}>
                        {format(new Date(appt.scheduledAt), 'hh:mm a')}
                      </p>
                    </div>

                    {/* Avatar */}
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center
                      text-xs font-bold shrink-0
                      ${isNextUp
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'}`}>
                      {apptInitials}
                    </div>

                    {/* Patient info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold text-foreground leading-tight
                        ${cfg.strikethrough ? 'line-through text-muted-foreground' : ''}`}>
                        {appt.patientName ?? '—'}
                      </p>
                      {appt.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <ClipboardList className="h-3 w-3 shrink-0" />
                          {appt.reason}
                        </p>
                      )}
                    </div>

                    {/* Next Up badge */}
                    {isNextUp && (
                      <span className="shrink-0 hidden sm:block px-2 py-1 rounded-md
                        bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide">
                        Next Up
                      </span>
                    )}

                    {/* Status badge */}
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold
                      uppercase tracking-wide ${cfg.badge}`}>
                      {cfg.label}
                    </span>

                    {/* Action */}
                    {isComplete ? (
                      <Link
                        href={`/doctor/appointments/${appt.id}`}
                        className="shrink-0 text-xs text-muted-foreground hover:text-primary
                          font-medium transition-colors whitespace-nowrap"
                      >
                        Summary
                      </Link>
                    ) : (
                      <Link
                        href={`/doctor/appointments/${appt.id}`}
                        className={`shrink-0 h-8 px-3 rounded-lg text-xs font-semibold
                          transition-colors whitespace-nowrap flex items-center
                          ${isNextUp
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'border border-border text-foreground hover:bg-muted'}`}
                      >
                        {isNextUp ? 'Start Visit' : 'View'}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── RIGHT column ── */}
        <div className="flex flex-col gap-4">

          {/* Quick Stats */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Quick Stats
              </h2>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </div>

            <p className="text-4xl font-bold text-foreground">{weekPatients}</p>
            <p className="text-sm text-muted-foreground mt-1">Patients seen this week</p>

            {/* Mini progress bar */}
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min((weekPatients / 60) * 100, 100)}%` }}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Accepting Bookings</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Visible on clinic portal</p>
                </div>
                {/* Toggle — visual only; wire to real action later */}
                <div className="h-6 w-11 rounded-full bg-primary flex items-center px-0.5 cursor-pointer">
                  <div className="h-5 w-5 rounded-full bg-white shadow-sm ml-auto" />
                </div>
              </div>
            </div>

            {/* Today summary chips */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Total',     value: total,     color: 'text-foreground' },
                { label: 'Done',      value: completed, color: 'text-emerald-600' },
                { label: 'Remaining', value: remaining, color: 'text-primary' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-muted/50 px-2 py-2 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor Rating & Recent Reviews */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Patient Rating
              </h2>
              <Star className="h-4 w-4 text-amber-400" />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <p className="text-4xl font-bold text-foreground leading-none">
                {ratingSummary.average > 0 ? ratingSummary.average.toFixed(1) : '—'}
              </p>
              <div>
                <StarRating rating={ratingSummary.average} size={16} />
                <p className="text-xs text-muted-foreground mt-1">
                  {ratingSummary.count > 0
                    ? `${ratingSummary.count} review${ratingSummary.count !== 1 ? 's' : ''}`
                    : 'No reviews yet'}
                </p>
              </div>
            </div>

            {recentReviews.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-border">
                {recentReviews.map((review) => (
                  <div key={review.id} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">
                        {review.patientName ?? 'Anonymous'}
                      </span>
                      <StarRating rating={review.rating} size={11} />
                    </div>
                    {review.comment && (
                      <p className="text-muted-foreground leading-relaxed line-clamp-2">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Patients */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Recent Patients
              </h2>
              <Link
                href="/doctor/patients"
                className="text-xs font-medium text-primary hover:underline"
              >
                View All
              </Link>
            </div>

            {recentPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No patients seen yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {recentPatients.map((p) => (
                  <li key={p.patientId}>
                    <Link
                      href={`/doctor/patients/${p.patientId}`}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg
                        hover:bg-muted transition-colors group"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary
                        flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(p.patientName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {p.patientName ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last visit: {format(new Date(p.visitedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground
                        opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Availability Summary */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Availability Summary
            </h2>

            <div className="flex items-center justify-between px-1 mb-3">
              {DAY_LABELS.map((label, i) => {
                const active = availabilityDays.has(i);
                return (
                  <div key={`${label}-${i}`} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center
                      transition-colors
                      ${active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground/40'}`}>
                      {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {availabilityDays.size > 0
                ? `Active ${availabilityDays.size} day${availabilityDays.size !== 1 ? 's' : ''} per week. `
                : 'No availability set. '}
              <Link href="/doctor/availability" className="text-primary font-medium hover:underline">
                Edit schedule →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
