import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getPendingDispensings, getInventory } from '@/server/actions/pharmacy.actions';
import PharmacistDashboard from '@/components/pharmacy/pharmacist-dashboard';
import NotificationBell from '@/components/shared/notification-bell';
import { Pill, Package, AlertTriangle } from 'lucide-react';

export default async function PharmacyDashboardPage() {
  const session = await auth();
  if (!session || (session.user.role !== 'pharmacist' && session.user.role !== 'admin')) {
    redirect('/login');
  }

  const [pending, inventory] = await Promise.all([
    getPendingDispensings(),
    getInventory(),
  ]);

  // Serialize for client component
  const serializedPending = pending.map((d) => ({
    ...d,
    prescriptionCreatedAt: d.prescriptionCreatedAt.toISOString(),
  }));
  const serializedInventory = inventory.map((b) => ({ ...b }));
  const lowStockCount = inventory.filter((b) => b.quantityInStock <= 10).length;

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Pill className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-none">{session.user.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Pharmacy Station</p>
          </div>
        </div>
        <NotificationBell />
      </div>

      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Pharmacy Dispensing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pending.length} prescriptions awaiting dispensing
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
              <Pill className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">{pending.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending Dispense</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Stock Batches</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-2 ${lowStockCount > 0 ? 'bg-rose-50' : 'bg-muted'}`}>
              <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? 'text-rose-600' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{lowStockCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Low Stock (≤10)</p>
          </div>
        </div>

        {/* Dashboard (client component: patient search + dispensing queue + dispense action) */}
        <PharmacistDashboard
          pending={serializedPending}
          inventory={serializedInventory}
        />
      </div>
    </div>
  );
}
