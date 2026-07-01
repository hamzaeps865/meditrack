import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { users, patients, appointments, doctors } from '@/server/db/schema';
import { isNull, count } from 'drizzle-orm';
import Link from 'next/link';
import { Users, Stethoscope, Calendar, Shield } from 'lucide-react';

async function getStats() {
  const [[totalPatients], [totalDoctors], [totalAppointments], [totalUsers]] =
    await Promise.all([
      db.select({ count: count() }).from(patients).where(isNull(patients.deletedAt)),
      db.select({ count: count() }).from(doctors),
      db.select({ count: count() }).from(appointments),
      db.select({ count: count() }).from(users),
    ]);

  return {
    patients: totalPatients.count,
    doctors: totalDoctors.count,
    appointments: totalAppointments.count,
    users: totalUsers.count,
  };
}

export default async function AdminDashboard() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/login');

  const stats = await getStats();

  const cards = [
    {
      label: 'Total Patients',
      value: stats.patients,
      icon: Users,
      href: '/admin/patients',
      color: 'text-cyan-700',
      bg: 'bg-cyan-50',
    },
    {
      label: 'Doctors',
      value: stats.doctors,
      icon: Stethoscope,
      href: '/admin/doctors',
      color: 'text-violet-700',
      bg: 'bg-violet-50',
    },
    {
      label: 'Appointments',
      value: stats.appointments,
      icon: Calendar,
      href: '/admin/appointments',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      label: 'System Users',
      value: stats.users,
      icon: Shield,
      href: '/admin/users',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back, {session.user.name}. Here&apos;s a system overview.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-xl border p-5 flex items-center gap-4 hover:shadow-sm transition-shadow"
            >
              <div className={`${card.bg} ${card.color} p-3 rounded-lg`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/admin/doctors/new"
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed text-sm text-gray-600 hover:border-cyan-400 hover:text-cyan-700 transition-colors"
          >
            <Stethoscope className="w-4 h-4" />
            Add a Doctor
          </Link>
          <Link
            href="/admin/audit-logs"
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed text-sm text-gray-600 hover:border-cyan-400 hover:text-cyan-700 transition-colors"
          >
            <Shield className="w-4 h-4" />
            View Audit Logs
          </Link>
          <Link
            href="/admin/patients"
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed text-sm text-gray-600 hover:border-cyan-400 hover:text-cyan-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            Manage Patients
          </Link>
        </div>
      </div>
    </div>
  );
}
