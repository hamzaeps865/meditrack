import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';
import AiChatWidget from '@/components/ai/ai-chat-widget';
import { getSwitchableProfiles, getActivePatient } from '@/server/actions/active-patient';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  // For patients, fetch switchable profiles + active id for the profile switcher
  let profiles: { id: string; name: string; isManaged: boolean }[] | undefined;
  let activePatientId: string | null | undefined;
  if (session.user.role === 'patient') {
    try {
      const [profs, active] = await Promise.all([
        getSwitchableProfiles(),
        getActivePatient(),
      ]);
      profiles = profs;
      activePatientId = active?.id ?? null;
    } catch {
      // Non-critical — switcher just won't render
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        role={session.user.role}
        userName={session.user.name}
        profiles={profiles}
        activePatientId={activePatientId}
      />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>

      {/* AI Chat Widget — only for patients */}
      {session.user.role === 'patient' && (
        <AiChatWidget patientName={session.user.name ?? 'Patient'} />
      )}
    </div>
  );
}
