'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Plus, MoreVertical,
  ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertCircle,
  CalendarDays, Lightbulb,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import { format, isSameDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminAppointment {
  id:           string;
  scheduledAt:  string;
  status:       string;
  reason:       string | null;
  patientName:  string | null;
  doctorName:   string | null;
  doctorId:     string;
  bookedByName: string | null;
  isLiveNow:    boolean;
  liveStartedAgo?: string;
}

export interface DoctorUtilization {
  doctorId:          string;
  doctorName:        string | null;
  apptThisMonth:     number;
  cancellationRate:  number;
}

interface Props {
  appointments:      AdminAppointment[];
  utilization:       DoctorUtilization[];
  adminName:         string;
  totalAll:          number;
  completedAll:      number;
  cancelledAll:      number;
  noShowAll:         number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type TimeFilter = 'today' | 'week' | 'month' | 'custom';

const statusConfig: Record<string, {
  label: string; badge: string; dot?: string;
}> = {
  scheduled:   { label: 'Scheduled',   badge: 'text-blue-600 font-semibold',                          dot: 'bg-blue-400' },
  checked_in:  { label: 'Checked-in',  badge: 'bg-amber-100 text-amber-700 rounded-full px-2.5 py-0.5 text-xs font-semibold' },
  in_progress: { label: 'In-progress', badge: 'bg-gray-200 text-gray-700 rounded-md px-2 py-0.5 text-xs font-semibold' },
  completed:   { label: 'Completed',   badge: 'text-emerald-600 font-semibold',                       dot: 'bg-emerald-400' },
  cancelled:   { label: 'Cancelled',   badge: 'text-red-500 font-semibold italic',                    dot: 'bg-red-400' },
  no_show:     { label: 'No-show',     badge: 'text-gray-400 font-semibold' },
};

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function pageNums(cur: number, total: number): (number | 'ellipsis')[] {
  const nums: (number | 'ellipsis')[] = [1];
  if (cur > 3) nums.push('ellipsis');
  for (let n = Math.max(2, cur - 1); n <= Math.min(total - 1, cur + 1); n++) nums.push(n);
  if (cur < total - 2) nums.push('ellipsis');
  if (total > 1) nums.push(total);
  return nums;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppointmentsTable({
  appointments: allAppts,
  utilization,
  adminName,
  totalAll,
  completedAll,
  cancelledAll,
  noShowAll,
}: Props) {
  const now = new Date();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [search,     setSearch]     = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page,       setPage]       = useState(1);
  const [openMenu,   setOpenMenu]   = useState<string | null>(null);

  // Unique doctors for dropdown
  const doctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of allAppts) {
      if (a.doctorId && a.doctorName) map.set(a.doctorId, a.doctorName);
    }
    return [...map.entries()];
  }, [allAppts]);

  // Derived stats based on full dataset
  const cancellationRate = totalAll > 0
    ? (((cancelledAll + noShowAll) / totalAll) * 100).toFixed(1)
    : '0.0';

  // Time-filter helper
  function inTimeRange(appt: AdminAppointment): boolean {
    const d = new Date(appt.scheduledAt);
    if (timeFilter === 'today') return isSameDay(d, now);
    if (timeFilter === 'week')  return isWithinInterval(d, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
    if (timeFilter === 'month') return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
    return true;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allAppts.filter((a) => {
      if (!inTimeRange(a)) return false;
      if (doctorFilter !== 'all' && a.doctorId !== doctorFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (q) {
        const pn = (a.patientName ?? '').toLowerCase();
        const dn = (a.doctorName  ?? '').toLowerCase();
        if (!pn.includes(q) && !dn.includes(q)) return false;
      }
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAppts, timeFilter, search, doctorFilter, statusFilter]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart   = (currentPage - 1) * PAGE_SIZE;
  const pageItems   = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // Stats for top cards (full dataset, not filtered)
  const statCards = [
    {
      label:   'Total Appointments',
      value:   totalAll,
      sub:     '+12% vs last month',
      subColor:'text-emerald-600',
      icon:    CalendarDays,
      iconBg:  'bg-blue-50 text-blue-500',
    },
    {
      label:   'Completed',
      value:   completedAll,
      sub:     `${totalAll > 0 ? ((completedAll / totalAll) * 100).toFixed(1) : 0}% fulfilment rate`,
      subColor:'text-muted-foreground',
      icon:    CheckCircle2,
      iconBg:  'bg-emerald-50 text-emerald-500',
    },
    {
      label:   'Cancelled/No-Show',
      value:   cancelledAll + noShowAll,
      sub:     `${cancelledAll} Cancelled · ${noShowAll} No-show`,
      subColor:'text-muted-foreground',
      icon:    XCircle,
      iconBg:  'bg-red-50 text-red-400',
      valueColor: 'text-red-600',
    },
    {
      label:   'Cancellation Rate',
      value:   `${cancellationRate}%`,
      sub:     '↓ 2.1% improvement',
      subColor:'text-emerald-600',
      icon:    AlertCircle,
      iconBg:  'bg-rose-50 text-rose-400',
      valueColor: 'text-red-600',
    },
  ];

  return (
    <div className="min-h-full bg-[#f5f7fa]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-6 py-3
        flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
            text-muted-foreground" />
          <input
            type="text"
            placeholder="Global search..."
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-muted/40
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <NotificationBell />
          <div className="pl-2.5 border-l border-border flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-none">{adminName}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                Administrator
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary
              flex items-center justify-center text-xs font-bold shrink-0">
              {getInitials(adminName)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="px-6 py-5 max-w-7xl mx-auto">

        {/* Page header + time filter */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Clinic-wide scheduling overview
            </p>
          </div>

          {/* Today / This Week / This Month / Custom */}
          <div className="flex items-center rounded-xl border border-border
            bg-white overflow-hidden shadow-sm">
            {([
              { key: 'today', label: 'Today' },
              { key: 'week',  label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'custom', label: 'Custom 📅' },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setTimeFilter(t.key); setPage(1); }}
                className={`px-4 py-2 text-xs font-semibold transition-colors border-r
                  border-border last:border-r-0
                  ${timeFilter === t.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {statCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label}
                className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground leading-tight">
                    {c.label}
                  </p>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center
                    shrink-0 ${c.iconBg}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${c.valueColor ?? 'text-foreground'}`}>
                  {c.value}
                </p>
                <p className={`text-[11px] mt-1 ${c.subColor}`}>{c.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5
              text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by patient or ID"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-white
                text-sm text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Doctor filter */}
          <select
            value={doctorFilter}
            onChange={(e) => { setDoctorFilter(e.target.value); setPage(1); }}
            className="h-9 pl-3 pr-8 rounded-lg border border-border bg-white text-sm
              text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Doctors</option>
            {doctorOptions.map(([id, name]) => (
              <option key={id} value={id}>Dr. {name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 pl-3 pr-8 rounded-lg border border-border bg-white text-sm
              text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Statuses</option>
            {Object.entries(statusConfig).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <div className="ml-auto">
            <Link href="/admin/appointments/new"
              type="button"
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-white
                text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              <Plus className="h-4 w-4" />
              Book Appointment
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm mb-4">

          {/* Header */}
          <div className="grid grid-cols-[130px_1fr_1fr_120px_1fr_120px_50px]
            px-5 py-3 border-b border-border bg-muted/20">
            {['DATE/TIME', 'PATIENT NAME', 'DOCTOR', 'STATUS', 'REASON', 'BOOKED BY', 'ACTIONS'].map((h) => (
              <p key={h}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20
              text-muted-foreground gap-2">
              <p className="text-sm font-medium">No appointments found</p>
              <p className="text-xs">Try adjusting your filters.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pageItems.map((appt) => {
                const cfg        = statusConfig[appt.status] ?? statusConfig.scheduled;
                const isLive     = appt.isLiveNow;
                const isCancelled = appt.status === 'cancelled' || appt.status === 'no_show';
                const scheduledDate = new Date(appt.scheduledAt);

                return (
                  <li key={appt.id}
                    className={`grid grid-cols-[130px_1fr_1fr_120px_1fr_120px_50px]
                      items-center px-5 py-4 relative transition-colors
                      ${isLive ? 'bg-primary/[0.03] border-l-4 border-l-primary' : ''}
                      ${isCancelled ? 'opacity-60' : 'hover:bg-muted/20'}`}>

                    {/* Date / Time */}
                    <div>
                      {isLive ? (
                        <div>
                          <p className="text-xs font-bold text-primary">Live Now</p>
                          {appt.liveStartedAgo && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Started {appt.liveStartedAgo}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className={`text-sm font-medium leading-tight
                            ${isCancelled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {format(scheduledDate, 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(scheduledDate, 'hh:mm a')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Patient */}
                    <div>
                      <p className={`text-sm font-semibold
                        ${isCancelled ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {appt.patientName ?? '—'}
                      </p>
                    </div>

                    {/* Doctor */}
                    <div>
                      <p className={`text-sm
                        ${isCancelled ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                        {appt.doctorName ? `Dr. ${appt.doctorName}` : '—'}
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      <span className={cfg.badge}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Reason */}
                    <div className="pr-3 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {appt.reason ?? '—'}
                      </p>
                    </div>

                    {/* Booked By */}
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {appt.bookedByName ?? '—'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenu(openMenu === appt.id ? null : appt.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-md
                          text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openMenu === appt.id && (
                        <div className="absolute right-0 top-8 z-20 w-44 bg-white
                          border border-border rounded-xl shadow-lg py-1 overflow-hidden">
                          <Link
                            href={`/admin/appointments/${appt.id}`}
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                            onClick={() => setOpenMenu(null)}
                          >
                            View Details
                          </Link>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2 text-sm
                              text-foreground hover:bg-muted"
                            onClick={() => setOpenMenu(null)}
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2 text-sm
                              text-red-600 hover:bg-red-50"
                            onClick={() => setOpenMenu(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3.5
            border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : pageStart + 1} of{' '}
              {filtered.length.toLocaleString()} appointments
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 rounded-lg border border-border bg-white text-sm
                  font-medium text-foreground hover:bg-muted transition-colors
                  disabled:opacity-40"
              >
                Previous
              </button>
              {pageNums(currentPage, totalPages).map((n, i) =>
                n === 'ellipsis' ? (
                  <span key={`e-${i}`}
                    className="h-7 px-1 flex items-center text-xs text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center
                      rounded-lg text-xs font-semibold border transition-colors
                      ${n === currentPage
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 rounded-lg border border-border bg-white text-sm
                  font-medium text-foreground hover:bg-muted transition-colors
                  disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Doctor Utilization */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Doctor Utilization</h3>
              <button type="button"
                className="text-xs font-medium text-primary hover:underline">
                View Detailed Report
              </button>
            </div>

            {utilization.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No data available.
              </p>
            ) : (
              <div className="space-y-4">
                {utilization.slice(0, 4).map((doc) => (
                  <div key={doc.doctorId}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Dr. {doc.doctorName ?? 'Unknown'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {doc.apptThisMonth} Appointments this month
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-red-500">
                        {doc.cancellationRate.toFixed(1)}% Cancellation
                      </span>
                    </div>
                    {/* Bar — total appointments normalised to max */}
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(
                            (doc.apptThisMonth / Math.max(...utilization.map((u) => u.apptThisMonth), 1)) * 100,
                            100,
                          )}%`,
                          background: 'linear-gradient(90deg, #1E3A5F, #ef4444)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Efficiency Insight */}
          <div className="rounded-2xl p-6 flex flex-col justify-between text-white"
            style={{ backgroundColor: '#1E3A5F' }}>
            <div>
              <div className="h-9 w-9 rounded-full bg-white/10 flex items-center
                justify-center mb-4">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Efficiency Insight</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Appointments booked via the Patient Portal have a 15% lower cancellation
                rate than phone-in bookings. Consider promoting the portal during follow-up
                calls.
              </p>
            </div>
            <button
              type="button"
              className="mt-6 w-full h-10 rounded-xl bg-white text-sm font-bold
                text-[#1E3A5F] hover:bg-white/90 transition-colors"
            >
              Run Portal Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
