import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { patients, users } from '@/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import NotificationBell from '@/components/shared/notification-bell';
import PatientSettingsForm from '@/components/patient/settings-form';
import { LoyaltyBadge } from '@/components/shared/loyalty-badge';
import PhotoUpload from '@/components/shared/photo-upload';
import { getLoyaltyTier } from '@/server/actions/health-score.actions';
import { User, Settings } from 'lucide-react';

// ─── Page (server component — loads real data) ────────────────────────────────

export default async function PatientSettingsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'patient') redirect('/login');

  // Load user record
  const [userRow] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id));

  // Load linked patient record
  const [patientRow] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.email, session.user.email ?? ''),
        isNull(patients.deletedAt),
      ),
    );

  // Loyalty tier (best-effort)
  let loyalty: Awaited<ReturnType<typeof getLoyaltyTier>> | null = null;
  if (patientRow) {
    try { loyalty = await getLoyaltyTier(patientRow.id); } catch { /* non-critical */ }
  }

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #1E3A5F, #2d6a9f)' }}
          >
            <span className="text-white text-xs font-bold">
              {userRow?.name
                ? userRow.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
                : '?'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-none">
              {userRow?.name ?? session.user.name}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Patient</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1E3A5F, #2d6a9f)' }}>
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile and account preferences
            </p>
          </div>
        </div>

        {/* Profile summary card */}
        {patientRow && (
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm mb-5">
            <div className="flex items-center gap-4">
              <PhotoUpload
                name={userRow?.name ?? patientRow.name}
                initialAvatar={null}
                size={56}
              />
              <div className="min-w-0">
                <p className="text-base font-bold text-foreground truncate">
                  {userRow?.name ?? patientRow.name}
                </p>
                <p className="text-sm text-muted-foreground">{userRow?.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {patientRow.bloodGroup && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                      bg-red-50 text-red-600 border border-red-100">
                      {patientRow.bloodGroup}
                    </span>
                  )}
                  {patientRow.gender && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                      bg-muted text-muted-foreground border border-border capitalize">
                      {patientRow.gender}
                    </span>
                  )}
                  {patientRow.dob && (
                    <span className="text-[10px] text-muted-foreground">
                      DOB: {patientRow.dob}
                    </span>
                  )}
                  {loyalty && (
                    <LoyaltyBadge months={loyalty.activeMonths} tier={loyalty.tier} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings form (client component) */}
        <PatientSettingsForm
          initialName={userRow?.name ?? ''}
          initialPhone={patientRow?.phone ?? ''}
          initialAddress={patientRow?.address ?? ''}
          initialEmergencyContact={patientRow?.emergencyContact ?? ''}
          email={userRow?.email ?? session.user.email ?? ''}
        />
      </div>
    </div>
  );
}
