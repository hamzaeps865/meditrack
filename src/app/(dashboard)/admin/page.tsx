import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { users, patients, appointments, doctors, auditLogs } from '@/server/db/schema';
import { isNull, count, eq, gte, lte, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { format, startOfDay, endOfDay } from 'date-fns';
import {
  Search, HelpCircle, Plus,
  Users, Calendar, UserCheck, ShieldAlert,
  Eye, ClipboardEdit, Trash2, PlusCircle, Sparkles, Activity, Award
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function getStats() {
  const today = new Date();

  const [[totalPatients], [totalDoctors], [todayAppts], [totalUsers]] =
    await Promise.all([
      db.select({ count: count() })
        .from(patients)
        .where(isNull(patients.deletedAt)),

      db.select({ count: count() })
        .from(doctors),

      db.select({ count: count() })
        .from(appointments)
        .where(
          and(
            gte(appointments.scheduledAt, startOfDay(today)),
            lte(appointments.scheduledAt, endOfDay(today)),
          ),
        ),

      db.select({ count: count() })
        .from(users),
    ]);

  return {
    patients:   totalPatients.count,
    doctors:   totalDoctors.count,
    todayAppts:  todayAppts.count,
    users:    totalUsers.count,
  };
}

async function getTodayAppointments() {
  const today = new Date();

  return db
    .select({
      id:          appointments.id,
      scheduledAt: appointments.scheduledAt,
      status:      appointments.status,
      reason:      appointments.reason,
      patientName: patients.name,
      doctorName:  users.name,
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(doctors,  eq(appointments.doctorId, doctors.id))
    .leftJoin(users,    eq(doctors.userId,     users.id))
    .where(
      and(
        gte(appointments.scheduledAt, startOfDay(today)),
        lte(appointments.scheduledAt, endOfDay(today)),
      ),
    )
    .orderBy(appointments.scheduledAt)
    .limit(6);
}

async function getRecentAuditLogs() {
  return db
    .select({
      id:        auditLogs.id,
      action:    auditLogs.action,
      tableName: auditLogs.tableName,
      recordId:  auditLogs.recordId,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      userName:  users.name,
      userRole:  users.role,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(5);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  scheduled:   'bg-emerald-50/80 text-emerald-800 border border-emerald-200',
  checked_in:  'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold',
  in_progress: 'bg-amber-50 text-amber-800 border border-amber-200 font-bold',
  completed:   'bg-emerald-50 text-emerald-800 border border-emerald-200',
  cancelled:   'bg-red-50 text-red-700 border border-red-200',
  no_show:     'bg-gray-100 text-gray-700 border border-gray-200',
};

const auditActionStyle: Record<string, { bg: string; icon: typeof Eye }> = {
  view:   { bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: Eye },
  create: { bg: 'bg-emerald-100 text-emerald-800 border border-emerald-300', icon: PlusCircle },
  update: { bg: 'bg-amber-50 text-amber-700 border border-amber-200',   icon: ClipboardEdit },
  delete: { bg: 'bg-red-50 text-red-700 border border-red-200',       icon: Trash2 },
};

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [stats, todayAppts, recentLogs] = await Promise.all([
    getStats(),
    getTodayAppointments(),
    getRecentAuditLogs(),
  ]);

  const adminInitials = getInitials(session.user.name ?? 'Admin');

  const statCards = [
    {
      label:        'Total Patients',
      value:        stats.patients,
      caption:       'Active registered patients',
      captionColor: 'text-emerald-700 font-medium',
      icon:         Users,
      iconColor:    'text-[#01411C]',
      iconBg:       'bg-emerald-100/70',
      href:         '/admin/patients',
    },
    {
      label:        "Today's Appointments",
      value:        stats.todayAppts,
      caption:       format(new Date(), 'EEEE, MMM d'),
      captionColor: 'text-emerald-700 font-medium',
      icon:         Calendar,
      iconColor:    'text-[#01411C]',
      iconBg:       'bg-emerald-100/70',
      href:         '/admin/appointments',
    },
    {
      label:        'Active Doctors',
      value:        stats.doctors,
      caption:       'Registered in system roster',
      captionColor: 'text-amber-700 font-medium',
      icon:         UserCheck,
      iconColor:    'text-amber-700',
      iconBg:       'bg-amber-100/70',
      href:         '/admin/doctors',
    },
    {
      label:        'System Users',
      value:        stats.users,
      caption:       'Across all user roles',
      captionColor: 'text-emerald-800 font-medium',
      icon:         ShieldAlert,
      iconColor:    'text-[#01411C]',
      iconBg:       'bg-emerald-100/70',
      href:         '/admin/users',
    },
  ];

  return (
    <div className="space-y-6 relative pb-10">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-700/70" />
          <input
            type="text"
            placeholder="Search patients, medical records, doctors..."
            className="w-full h-10 pl-10 pr-4 rounded-none border border-emerald-200/80 bg-white text-sm text-gray-900 placeholder:text-gray-400  focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <NotificationBell />
          <button
            type="button"
            aria-label="Help"
            className="h-10 w-10 rounded-none bg-white border border-emerald-200/70  flex items-center justify-center text-emerald-800 hover:bg-emerald-50 transition-colors"
          >
            <HelpCircle className="h-4.5 w-4.5" />
          </button>

          <div className="flex items-center gap-3 pl-3 border-l border-emerald-200/80">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-none">
                {session.user.name}
              </p>
              <p className="text-[10px] font-extrabold text-[#01411C] mt-1 uppercase tracking-wider">
                Administrator
              </p>
            </div>
            <div className="h-10 w-10 rounded-none bg-[#01411C] text-white flex items-center justify-center text-xs font-black  border border-emerald-600/30 shrink-0">
              {adminInitials}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`bg-white/90 backdrop-blur-md rounded-none p-5  border border-emerald-100 hover: hover:-translate-y-0.5 transition-all duration-200 block group`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="text-3xl font-black text-gray-900 mt-1.5 tracking-tight group-hover:text-[#01411C] transition-colors">
                    {card.value}
                  </p>
                </div>
                <div className={`${card.iconBg} ${card.iconColor} p-3 rounded-none shrink-0 `}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className={`text-xs mt-3.5 ${card.captionColor}`}>{card.caption}</p>
            </Link>
          );
        })}
      </div>

      {/* ── Schedule + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 relative z-10">

        {/* Today's Schedule Card */}
        <div className="bg-white rounded-none  border border-emerald-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-emerald-50/40">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-none bg-[#01411C] text-white flex items-center justify-center ">
                <Calendar className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-gray-900">
                  Today&apos;s Schedule
                </h2>
                <p className="text-[11px] font-medium text-gray-500">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <Link
              href="/admin/appointments"
              className="px-3.5 py-1.5 rounded-none border border-emerald-200 bg-white text-xs font-bold text-[#01411C] hover:bg-emerald-50 transition-colors "
            >
              View All
            </Link>
          </div>

          {todayAppts.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">
              <Calendar className="h-8 w-8 text-emerald-300 mx-auto mb-2 opacity-60" />
              No appointments scheduled for today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-left">
                    {['Time', 'Patient', 'Doctor', 'Status'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider ${
                          i === 3 ? 'text-right' : ''
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {todayAppts.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-emerald-50/30 transition-colors"
                    >
                      <td className="px-5 py-4 text-gray-900 font-bold whitespace-nowrap">
                        {format(new Date(row.scheduledAt), 'hh:mm a')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-none bg-[#01411C]/10 text-[#01411C] flex items-center justify-center text-xs font-extrabold shrink-0">
                            {getInitials(row.patientName)}
                          </div>
                          <span className="text-gray-900 font-bold">
                            {row.patientName ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 font-medium">
                        {row.doctorName ? `Dr. ${row.doctorName}` : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs rounded-none font-bold capitalize ${
                            statusStyles[row.status]
                          }`}
                        >
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/30 text-center">
            <Link
              href="/admin/appointments"
              className="text-xs text-[#01411C] font-extrabold hover:underline inline-flex items-center gap-1"
            >
              View All Appointments →
            </Link>
          </div>
        </div>

        {/* Recent Audit Activity Card */}
        <div className="bg-white rounded-none  border border-emerald-100 flex flex-col overflow-hidden">
          <div className="px-6 py-4.5 border-b border-gray-100 bg-emerald-50/40 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-none bg-[#01411C] text-white flex items-center justify-center ">
              <Activity className="h-4 w-4 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Recent Activity</h2>
              <p className="text-[11px] font-medium text-gray-500">
                Latest audit telemetry logs
              </p>
            </div>
          </div>

          <div className="flex-1 px-6 py-4 space-y-3.5">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No audit activity recorded yet.
              </p>
            ) : (
              recentLogs.map((log) => {
                const style = auditActionStyle[log.action] ?? auditActionStyle.view;
                const Icon = style.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <div className={`h-8 w-8 rounded-none flex items-center justify-center shrink-0  ${style.bg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-900 font-semibold leading-snug">
                        <span className="font-extrabold text-[#01411C]">{log.userName ?? 'Unknown'}</span>
                        {' '}
                        <span className="capitalize">{log.action}d</span>
                        {' a '}
                        <span className="font-bold text-gray-700">{log.tableName}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[11px] text-gray-400 font-medium">
                          {format(new Date(log.createdAt), 'MMM d, hh:mm a')}
                        </p>
                        {log.ipAddress && (
                          <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">
                            {log.ipAddress}
                          </code>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/30 text-center mt-auto">
            <Link
              href="/admin/audit-logs"
              className="text-xs text-[#01411C] font-extrabold hover:underline inline-flex items-center gap-1"
            >
              Full Audit History →
            </Link>
          </div>
        </div>

      </div>

      {/* Floating Action Button */}
      <Link
        href="/admin/appointments/new"
        aria-label="New appointment"
        className="fixed bottom-8 right-8 h-12 w-12 rounded-none bg-[#01411C] text-white flex items-center justify-center  hover:bg-[#013517] transition-all hover:scale-105 border border-emerald-400/40 z-50 cursor-pointer"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
