import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import NurseSettingsForm from '@/components/nurse/nurse-settings-form';
import NotificationBell from '@/components/shared/notification-bell';
import { Pill } from 'lucide-react';

// Pharmacist settings reuses the nurse settings form component pattern
// (name edit + password change) — it works for any role with requireRole checks

export default async function PharmacistSettingsPage() {
  const session = await auth();
  if (!session || (session.user.role !== 'pharmacist' && session.user.role !== 'admin')) {
    redirect('/login');
  }

  const [userRow] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!userRow) redirect('/login');

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-semibold text-foreground">Pharmacist Settings</p>
        </div>
        <NotificationBell />
      </div>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">Manage your account and password.</p>

        {/* Reuse the nurse settings form — it works for pharmacist role too */}
        <NurseSettingsForm
          initialName={userRow.name}
          initialEmail={userRow.email}
          userId={userRow.id}
        />
      </div>
    </div>
  );
}
