import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getPharmacySummary, getAllMedicines, getInventory, getPendingDispensings } from '@/server/actions/pharmacy.actions';
import PharmacyManager from '@/components/admin/pharmacy-manager';
import NotificationBell from '@/components/shared/notification-bell';
import { Pill, Package, AlertTriangle, Clock } from 'lucide-react';

function formatPrice(cents: number) {
 return `Rs ${(cents / 100).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
}

export default async function AdminPharmacyPage() {
 const session = await auth();
 if (!session || session.user.role !== 'admin') redirect('/login');

 const [summary, catalog, inventory, pendingDispensings] = await Promise.all([
  getPharmacySummary(),
  getAllMedicines(),
  getInventory(),
  getPendingDispensings(),
 ]);

 // Serialize dates for the client component
 const serializedCatalog = catalog.map((m) => ({
  ...m,
  createdAt: m.createdAt.toISOString(),
  updatedAt: m.updatedAt.toISOString(),
 }));
 const serializedInventory = inventory.map((b) => ({
  ...b,
  expiryDate: b.expiryDate,
  receivedAt: b.receivedAt,
 }));
 const serializedPending = pendingDispensings.map((d) => ({
  ...d,
  prescriptionCreatedAt: d.prescriptionCreatedAt.toISOString(),
 }));

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   {/* Top bar */}
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-2">
     <Pill className="h-4 w-4 text-primary" />
     <p className="text-sm font-semibold text-foreground">Pharmacy</p>
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-8 max-w-6xl mx-auto">
    {/* Header */}
    <div className="mb-6">
     <h1 className="text-2xl font-bold text-foreground">Pharmacy Management</h1>
     <p className="text-sm text-muted-foreground mt-1">
      Catalog, inventory, dispensing, and alerts.
     </p>
    </div>

    {/* Summary cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div className="premium-card premium-card-pad">
      <div className="h-10 w-10 bg-emerald-50 flex items-center justify-center mb-3">
       <Pill className="h-5 w-5 text-emerald-700" />
      </div>
      <p className="text-2xl font-bold text-foreground">{summary.totalMedicines}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Medicines in Catalog</p>
     </div>
    <div className="premium-card premium-card-pad">
      <div className="h-10 w-10 bg-emerald-50 flex items-center justify-center mb-3">
       <Package className="h-5 w-5 text-emerald-600" />
      </div>
      <p className="text-2xl font-bold text-foreground">{formatPrice(summary.stockValueCents)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Stock Value (cost)</p>
     </div>
    <div className="premium-card premium-card-pad">
      <div className={`h-10 w-10 flex items-center justify-center mb-3 ${summary.lowStockCount > 0 ? 'bg-rose-50' : 'bg-muted'}`}>
       <AlertTriangle className={`h-5 w-5 ${summary.lowStockCount > 0 ? 'text-rose-600' : 'text-muted-foreground'}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{summary.lowStockCount}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Low Stock</p>
     </div>
    <div className="premium-card premium-card-pad">
      <div className={`h-10 w-10 flex items-center justify-center mb-3 ${summary.expiringCount > 0 ? 'bg-amber-50' : 'bg-muted'}`}>
       <Clock className={`h-5 w-5 ${summary.expiringCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{summary.expiringCount}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Expiring (30 days)</p>
     </div>
    </div>

    {/* Manager with tabs */}
    <PharmacyManager
     catalog={serializedCatalog}
     inventory={serializedInventory}
     pendingDispensings={serializedPending}
     summary={summary}
    />
   </div>
  </div>
 );
}
