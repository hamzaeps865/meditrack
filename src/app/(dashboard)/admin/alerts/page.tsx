import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getAllHealthAlerts } from '@/server/actions/health-alerts.actions';
import AlertManager from '@/components/admin/alert-manager';
import NotificationBell from '@/components/shared/notification-bell';
import { ShieldAlert, Search } from 'lucide-react';
import { format, isPast } from 'date-fns';

export default async function AdminAlertsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/login');

  const alerts = await getAllHealthAlerts();

  // Serialize for the client component
  const serialized = alerts.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    disease: a.disease ?? null,
    severity: a.severity,
    city: a.city ?? null,
    createdAt: a.createdAt.toISOString(),
    expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
    expired: a.expiresAt ? isPast(a.expiresAt) : false,
  }));

  return (
    <div className="min-h-full bg-[#f0f7f3]">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Community Health Alerts</p>
        </div>
        <NotificationBell />
      </div>

      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Health Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Broadcast public-health warnings to patients based on their city.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Alerts</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">
              {serialized.filter((a) => !a.expired).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Active</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <p className="text-2xl font-bold text-rose-500">
              {serialized.filter((a) => a.severity === 'critical' && !a.expired).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Critical Active</p>
          </div>
        </div>

        {/* Manager (client component: list + create form + delete) */}
        <AlertManager alerts={serialized} />
      </div>
    </div>
  );
}
