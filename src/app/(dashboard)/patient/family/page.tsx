import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getFamilyMembers } from '@/server/actions/family.actions';
import { getActivePatient } from '@/server/actions/active-patient';
import FamilyMembersList from '@/components/patient/family-members-list';
import NotificationBell from '@/components/shared/notification-bell';
import { Users, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

export default async function FamilyPage() {
  const session = await auth();
  if (!session || session.user.role !== 'patient') redirect('/login');

  const [members, active] = await Promise.all([
    getFamilyMembers(),
    getActivePatient(),
  ]);

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-none">{session.user.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Family Management</p>
          </div>
        </div>
        <NotificationBell />
      </div>

      <div className="px-6 py-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Family Members</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage health profiles for your spouse, children, and parents.
            </p>
          </div>
        </div>

        {/* Active profile indicator */}
        {active?.isManaged && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600 shrink-0" />
            <p className="text-sm text-violet-700">
              You are currently viewing as <strong>{active.name}</strong>.
              Use the profile switcher (top of sidebar) to switch back to your profile.
            </p>
          </div>
        )}

        {/* Members list + add button (client component handles the modal) */}
        <FamilyMembersList
          members={members.map((m) => ({
            id: m.id,
            name: m.name,
            dob: m.dob,
            gender: m.gender,
            bloodGroup: m.bloodGroup,
            allergies: m.allergies,
            city: m.city,
          }))}
        />
      </div>
    </div>
  );
}
