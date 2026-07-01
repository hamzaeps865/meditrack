'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Users, Calendar, ClipboardList,
  FileText, BarChart2, LogOut, Shield
} from 'lucide-react';

type Role = 'admin' | 'doctor' | 'receptionist' | 'patient';

const navItems: Record<Role, { label: string; href: string; icon: any }[]> = {
  admin: [
    { label: 'Dashboard',   href: '/admin',             icon: BarChart2 },
    { label: 'Doctors',     href: '/admin/doctors',     icon: Users },
    { label: 'Patients',    href: '/admin/patients',    icon: ClipboardList },
    { label: 'Audit Logs',  href: '/admin/audit-logs',  icon: Shield },
  ],
  doctor: [
    { label: 'Dashboard',     href: '/doctor',               icon: BarChart2 },
    { label: 'Appointments',  href: '/doctor/appointments',  icon: Calendar },
    { label: 'Patients',      href: '/doctor/patients',      icon: Users },
    { label: 'Availability',  href: '/doctor/availability',  icon: ClipboardList },
  ],
  receptionist: [
    { label: 'Dashboard',     href: '/receptionist',                  icon: BarChart2 },
    { label: 'Patients',      href: '/receptionist/patients',         icon: Users },
    { label: 'Appointments',  href: '/receptionist/appointments',     icon: Calendar },
  ],
  patient: [
    { label: 'My Appointments',  href: '/patient/appointments',   icon: Calendar },
    { label: 'Prescriptions',    href: '/patient/prescriptions',  icon: FileText },
  ],
};

export default function Sidebar({ role, userName }: { role: Role; userName?: string | null }) {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-cyan-700">MediTrack</h1>
        <p className="text-xs text-gray-500 mt-1 capitalize">{role} Portal</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems[role].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${active
                  ? 'bg-cyan-50 text-cyan-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="p-4 border-t">
        <p className="text-sm font-medium text-gray-700 truncate">{userName}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 mt-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}