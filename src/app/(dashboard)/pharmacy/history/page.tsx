import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getDispenseHistory } from '@/server/actions/pharmacy.actions';
import DispenseHistoryList from '@/components/pharmacy/dispense-history-list';
import NotificationBell from '@/components/shared/notification-bell';
import { Package } from 'lucide-react';

export default async function DispenseHistoryPage() {
  const session = await auth();
  if (!session || (session.user.role !== 'pharmacist' && session.user.role !== 'admin')) {
    redirect('/login');
  }

  const history = await getDispenseHistory(100);

  const serialized = history.map((h) => ({
    ...h,
    dispensedAt: h.dispensedAt.toISOString(),
  }));

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-semibold text-foreground">Dispense History</p>
        </div>
        <NotificationBell />
      </div>

      <div className="px-6 py-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Dispense History</h1>
        <p className="text-sm text-muted-foreground mb-6">{history.length} dispensings recorded</p>

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
            <Package className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No dispensings yet</p>
            <p className="text-xs text-muted-foreground mt-1">Completed dispensings will appear here.</p>
          </div>
        ) : (
          <DispenseHistoryList history={serialized} />
        )}
      </div>
    </div>
  );
}
