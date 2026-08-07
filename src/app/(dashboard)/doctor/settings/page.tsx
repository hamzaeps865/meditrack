import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { doctors, users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  Search, User, ShieldCheck,
  Stethoscope, Lock, LogOut, Bell,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';

export default async function DoctorSettingsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'doctor') redirect('/login');

  const [doctorRow] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, session.user.id));

  const doctorName  = session.user.name  ?? '';
  const doctorEmail = session.user.email ?? '';

  const sections = [
    {
      id:    'profile',
      icon:  User,
      title: 'Profile Information',
      description: 'Your name, email address, and contact details.',
    },
    {
      id:    'clinical',
      icon:  Stethoscope,
      title: 'Clinical Profile',
      description: 'Specialization and license information.',
    },
    {
      id:    'security',
      icon:  Lock,
      title: 'Password & Security',
      description: 'Change your password and manage account security.',
    },
    {
      id:    'notifications',
      icon:  Bell,
      title: 'Notifications',
      description: 'Control which alerts and reminders you receive.',
    },
  ];

  return (
    <div className="min-h-full bg-[#f5f7fa]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-6 py-3
        flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
            text-muted-foreground" />
          <input type="text" placeholder="Search patients, records..."
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-muted/40
              text-sm placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white" />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>

      <div className="px-6 py-5 max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your account, preferences, and clinical profile.
          </p>
        </div>

        {/* Profile banner */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm mb-4
          flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 text-primary
            flex items-center justify-center text-lg font-bold shrink-0">
            {doctorName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground">Dr. {doctorName}</p>
            <p className="text-sm text-muted-foreground">{doctorEmail}</p>
            {doctorRow && (
              <p className="text-xs text-primary mt-0.5">{doctorRow.specialization}</p>
            )}
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
            bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-3 w-3" />
            Active
          </span>
        </div>

        {/* Settings sections */}
        <div className="space-y-3 mb-4">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id}
                className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center
                      justify-center shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>

                      {/* Read-only field previews */}
                      {s.id === 'profile' && (
                        <div className="mt-3 space-y-2">
                          {[
                            { label: 'Full Name',  value: `Dr. ${doctorName}` },
                            { label: 'Email',      value: doctorEmail },
                          ].map((f) => (
                            <div key={f.label}
                              className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-20 shrink-0">
                                {f.label}
                              </span>
                              <span className="text-sm text-foreground">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {s.id === 'clinical' && doctorRow && (
                        <div className="mt-3 space-y-2">
                          {[
                            { label: 'Specialty',  value: doctorRow.specialization },
                            { label: 'License #',  value: doctorRow.licenseNumber },
                          ].map((f) => (
                            <div key={f.label}
                              className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-20 shrink-0">
                                {f.label}
                              </span>
                              <span className="text-sm text-foreground">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {s.id === 'security' && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground">
                            Password last changed: unknown
                          </p>
                        </div>
                      )}

                      {s.id === 'notifications' && (
                        <div className="mt-3 space-y-2">
                          {[
                            'Appointment reminders',
                            'New patient check-in alerts',
                            'Schedule changes',
                          ].map((item) => (
                            <label key={item}
                              className="flex items-center gap-2.5 cursor-pointer">
                              <div className="h-4 w-8 rounded-full bg-primary flex
                                items-center px-0.5">
                                <div className="h-3 w-3 rounded-full bg-white
                                  shadow-sm ml-auto" />
                              </div>
                              <span className="text-xs text-foreground">{item}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button type="button"
                    className="shrink-0 h-8 px-3 rounded-lg border border-border
                      text-xs font-medium text-foreground hover:bg-muted transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">
            Account
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Sign out</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sign out of MediTrack on this device.
              </p>
            </div>
            <button type="button"
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg border
                border-red-200 text-sm font-medium text-red-600
                hover:bg-red-50 transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
