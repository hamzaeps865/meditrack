import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import AdminSettings from '@/components/admin/admin-settings';

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/login');

  return (
    <AdminSettings
      adminName={session.user.name ?? 'Admin'}
      adminEmail={session.user.email ?? ''}
    />
  );
}
