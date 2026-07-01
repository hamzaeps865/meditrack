import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={session.user.role} userName={session.user.name} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}