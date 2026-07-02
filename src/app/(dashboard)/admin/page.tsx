import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { users, patients, appointments, doctors, auditLogs } from '@/server/db/schema';
import { isNull, count, eq, gte, lte, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { format, startOfDay, endOfDay } from 'date-fns';
import {
  Search, Bell, HelpCircle, Plus,
  Users, Calendar, UserCheck, ShieldAlert,
  Eye, ClipboardEdit, Trash2, PlusCircle,
} from 'lucide-react';

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
    patients:     totalPatients.count,
    doctors:      totalDoctors.count,
    todayAppts:   todayAppts.count,
    users:        totalUsers.count,
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
    .leftJoin(doctors,  eq(appointments.doctorId,  doctors.id))
    .leftJoin(users,    eq(doctors.userId,          users.id))
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
  scheduled:   'bg-gray-100 text-gray-600',
  checked_in:  'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  cancelled:   'bg-red-50 text-red-600',
  no_show:     'bg-gray-100 text-gray-500',
};

const auditActionStyle: Record<string, { bg: string; icon: typeof Eye }> = {
  view:   { bg: 'bg-blue-50 text-blue-600',    icon: Eye },
  create: { bg: 'bg-emerald-50 text-emerald-600', icon: PlusCircle },
  update: { bg: 'bg-amber-50 text-amber-600',  icon: ClipboardEdit },
  delete: { bg: 'bg-red-50 text-red-600',      icon: Trash2 },
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
      caption:      'Active registered patients',
      captionColor: 'text-muted-foreground',
      icon:         Users,
      iconColor:    'text-blue-600',
      iconBg:       'bg-blue-50',
      href:         '/admin/patients',
    },
    {
      label:        "Today's Appointments",
      value:        stats.todayAppts,
      caption:      format(new Date(), 'EEEE, MMM d'),
      captionColor: 'text-muted-foreground',
      icon:         Calendar,
      iconColor:    'text-indigo-600',
      iconBg:       'bg-indigo-50',
      href:         '/admin/appointments',
    },
    {
      label:        'Active Doctors',
      value:        stats.doctors,
      caption:      'Registered in the system',
      captionColor: 'text-muted-foreground',
      icon:         UserCheck,
      iconColor:    'text-amber-600',
      iconBg:       'bg-amber-50',
      href:         '/admin/doctors',
    },
    {
      label:        'System Users',
      value:        stats.users,
      caption:      'Across all roles',
      captionColor: 'text-muted-foreground',
      icon:         ShieldAlert,
      iconColor:    'text-primary',
      iconBg:       'bg-primary/10',
      href:         '/admin/users',
    },
  ];

  return (
    <div className="relative">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patients, records, doctors..."
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="h-9 w-9 flex items-center justify-center rounded-full
              text-muted-foreground hover:bg-muted transition-colors"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Help"
            className="h-9 w-9 flex items-center justify-center rounded-full
              text-muted-foreground hover:bg-muted transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 pl-3 ml-1 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-none">
                {session.user.name}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                Administrator
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary
              flex items-center justify-center text-xs font-semibold shrink-0">
              {adminInitials}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-card rounded-xl border border-border p-5
                hover:shadow-sm transition-shadow block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-2">
                    {card.value}
                  </p>
                </div>
                <div className={`${card.iconBg} ${card.iconColor} p-2.5 rounded-lg shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-xs mt-3 ${card.captionColor}`}>{card.caption}</p>
            </Link>
          );
        })}
      </div>

      {/* ── Schedule + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">

        {/* Today's Schedule */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-start justify-between px-6 py-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Today&apos;s Schedule
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <Link
              href="/admin/appointments"
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium
                text-foreground hover:bg-muted transition-colors"
            >
              View All
            </Link>
          </div>

          {todayAppts.length === 0 ? (
            <div className="px-6 pb-8 pt-4 text-center text-muted-foreground text-sm">
              No appointments scheduled for today.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/30 text-left">
                  {['Time', 'Patient', 'Doctor', 'Status'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-2.5 text-xs font-medium text-muted-foreground
                        uppercase tracking-wide ${i === 3 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayAppts.map((row, i) => (
                  <tr
                    key={row.id}
                    className={i !== todayAppts.length - 1 ? 'border-b border-border' : ''}
                  >
                    <td className="px-5 py-4 text-foreground font-medium whitespace-nowrap">
                      {format(new Date(row.scheduledAt), 'hh:mm a')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary
                          flex items-center justify-center text-xs font-semibold shrink-0">
                          {getInitials(row.patientName)}
                        </div>
                        <span className="text-foreground font-medium">
                          {row.patientName ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {row.doctorName ? `Dr. ${row.doctorName}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs
                        font-medium capitalize ${statusStyles[row.status]}`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="px-6 py-4 border-t border-border text-center">
            <Link
              href="/admin/appointments"
              className="text-sm text-primary font-medium hover:underline"
            >
              View All Appointments →
            </Link>
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="bg-card rounded-xl border border-border flex flex-col">
          <div className="px-6 py-5">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Latest audit log entries
            </p>
          </div>

          <div className="flex-1 px-6 space-y-4 pb-2">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No audit activity yet.
              </p>
            ) : (
              recentLogs.map((log) => {
                const style = auditActionStyle[log.action] ?? auditActionStyle.view;
                const Icon  = style.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center
                      justify-center shrink-0 ${style.bg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        <span className="font-medium">{log.userName ?? 'Unknown'}</span>
                        {' '}
                        <span className="capitalize">{log.action}d</span>
                        {' a '}
                        <span className="font-medium">{log.tableName}</span>
                        {' record'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), 'MMM d, hh:mm a')}
                        </p>
                        {log.ipAddress && (
                          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded
                            text-muted-foreground font-mono">
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

          <div className="px-6 py-4 border-t border-border text-center mt-4">
            <Link
              href="/admin/audit-logs"
              className="text-sm text-primary font-medium hover:underline"
            >
              Full Audit History →
            </Link>
          </div>
        </div>
      </div>

      {/* Floating action button */}
      <Link
        href="/receptionist/appointments/new"
        aria-label="New appointment"
        className="fixed bottom-8 right-8 h-12 w-12 rounded-full bg-primary
          text-primary-foreground flex items-center justify-center
          shadow-lg hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-5 h-5" />
      </Link>
    </div>
  );
}
