'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, Stethoscope, Users, Calendar,
  FileText, Settings, ClipboardList, HelpCircle, LogOut, ShieldCheck,
} from 'lucide-react';

type Role = 'admin' | 'doctor' | 'receptionist' | 'patient';

const navItems: Record<Role, { label: string; href: string; icon: any }[]> = {
  admin: [
    { label: 'Dashboard',   href: '/admin',             icon: LayoutDashboard },
    { label: 'Doctors',     href: '/admin/doctors',     icon: Stethoscope },
    { label: 'Patients',    href: '/admin/patients',    icon: Users },
    { label: 'Appointments',href: '/admin/appointments',icon: Calendar },
    { label: 'Audit Logs',  href: '/admin/audit-logs',  icon: FileText },
    { label: 'Settings',    href: '/admin/settings',    icon: Settings },
  ],
  doctor: [
    { label: 'Dashboard',     href: '/doctor',               icon: LayoutDashboard },
    { label: 'Appointments',  href: '/doctor/appointments',  icon: Calendar },
    { label: 'Patients',      href: '/doctor/patients',      icon: Users },
    { label: 'Availability',  href: '/doctor/availability',  icon: ClipboardList },
    { label: 'Settings',      href: '/doctor/settings',      icon: Settings },
  ],
  receptionist: [
    { label: 'Dashboard',     href: '/receptionist',                icon: LayoutDashboard },
    { label: 'Patients',      href: '/receptionist/patients',       icon: Users },
    { label: 'Appointments',  href: '/receptionist/appointments',   icon: Calendar },
    { label: 'Settings',      href: '/receptionist/settings',       icon: Settings },
  ],
  patient: [
    { label: 'My Appointments',  href: '/patient/appointments',   icon: Calendar },
    { label: 'Prescriptions',    href: '/patient/prescriptions',  icon: FileText },
    { label: 'Settings',         href: '/patient/settings',       icon: Settings },
  ],
};

const quickAction: Record<Role, { label: string; href: string } | null> = {
  admin: { label: 'New Appointment', href: '/admin/appointments/new' },
  doctor: { label: 'New Appointment', href: '/doctor/appointments/new' },
  receptionist: { label: 'New Appointment', href: '/receptionist/appointments/new' },
  patient: null,
};

export default function Sidebar({ role, userName }: { role: Role; userName?: string | null }) {
  const pathname = usePathname();
  const action = quickAction[role];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0" strokeWidth={2.25} />
        <div>
          <h1 className="text-base font-bold text-primary leading-none">MediTrack</h1>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{role} Portal</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems[role].map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto">
        {action && (
          <div className="px-4 pb-4">
            <Link
              href={action.href}
              className="flex items-center justify-center w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {action.label}
            </Link>
          </div>
        )}

        <div className="border-t border-border px-4 py-4 space-y-1">
          <Link
            href="/help"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            Help Center
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>

        {userName && (
          <div className="px-6 py-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground truncate">{userName}</p>
          </div>
        )}
      </div>
    </div>
  );
}