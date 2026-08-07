import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import NotificationBell from '@/components/shared/notification-bell';
import ReceptionistSettingsForm from '@/components/receptionist/receptionist-settings-form';
import { Settings, ShieldCheck, UserCheck } from 'lucide-react';

export default async function ReceptionistSettingsPage() {
  const session = await auth();
  if (!session || (session.user.role !== 'receptionist' && session.user.role !== 'admin')) {
    redirect('/login');
  }

  const [userRow] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  const userName  = userRow?.name  ?? session.user.name  ?? 'Receptionist';
  const userEmail = userRow?.email ?? session.user.email ?? '';

  function getInitials(n: string) {
    return n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #1E3A5F, #2d6a9f)' }}
          >
            {getInitials(userName)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-none">{userName}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
              Receptionist Portal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #1E3A5F, #2d6a9f)' }}
          >
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Receptionist Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage workstation preferences, profile information, and account security
            </p>
          </div>
        </div>

        {/* ── Staff Summary Card ── */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #1E3A5F, #2d6a9f)' }}
              >
                {getInitials(userName)}
              </div>
              <div>
                <p className="text-base font-bold text-foreground">{userName}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider
                    px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <UserCheck className="h-3 w-3" />
                    Reception Staff
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700
                    bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                    Verified Active
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right hidden md:block">
              <p className="text-xs text-muted-foreground">System Access Level</p>
              <p className="text-sm font-semibold text-foreground">Patient Intake & Scheduling</p>
            </div>
          </div>
        </div>

        {/* ── Settings Form Component ── */}
        <ReceptionistSettingsForm
          initialName={userName}
          initialEmail={userEmail}
        />

      </div>
    </div>
  );
}
