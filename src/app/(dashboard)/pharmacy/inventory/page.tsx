import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getInventory } from '@/server/actions/pharmacy.actions';
import NotificationBell from '@/components/shared/notification-bell';
import { Package, AlertTriangle } from 'lucide-react';
import { format, isPast, isFuture, differenceInDays } from 'date-fns';

export default async function PharmacyInventoryPage() {
 const session = await auth();
 if (!session || (session.user.role !== 'pharmacist' && session.user.role !== 'admin')) {
  redirect('/login');
 }

 const inventory = await getInventory();

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-2">
     <Package className="h-4 w-4 text-emerald-600" />
     <p className="text-sm font-semibold text-foreground">Pharmacy Inventory</p>
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-8 max-w-4xl mx-auto">
    <h1 className="text-2xl font-bold text-foreground mb-1">Inventory Overview</h1>
    <p className="text-sm text-muted-foreground mb-6">
     {inventory.length} batches · read-only view (contact admin to manage stock)
    </p>

    {inventory.length === 0 ? (
     <div className="bg-white border border-border p-12 text-center shadow-sm">
      <Package className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground">No stock in inventory</p>
     </div>
    ) : (
     <div className="bg-white border border-border overflow-hidden shadow-sm">
      <table className="w-full text-sm">
       <thead><tr className="border-b border-border bg-muted/30 text-left">
        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Medicine</th>
        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Batch</th>
        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Qty</th>
        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Expiry</th>
       </tr></thead>
       <tbody className="divide-y divide-border">
        {inventory.map((b) => {
         const isExpired = b.expiryDate && isPast(new Date(b.expiryDate));
         const isExpiringSoon = b.expiryDate && isFuture(new Date(b.expiryDate)) && differenceInDays(new Date(b.expiryDate), new Date()) <= 30;
         const isLow = b.quantityInStock <= 10;
         return (
          <tr key={b.id} className="hover:bg-muted/20">
           <td className="px-4 py-3">
            <p className="font-medium text-foreground">{b.medicineName}</p>
            <p className="text-xs text-muted-foreground">{b.genericName} · {b.strength}</p>
           </td>
           <td className="px-4 py-3 text-muted-foreground">{b.batchNumber ?? '—'}</td>
           <td className="px-4 py-3">
            <span className={`font-semibold ${isLow ? 'text-rose-600' : 'text-foreground'}`}>{b.quantityInStock}</span>
            {isLow && <AlertTriangle className="inline h-3 w-3 text-rose-500 ml-1" />}
           </td>
           <td className="px-4 py-3">
            {b.expiryDate ? (
             <span className={`text-xs ${isExpired ? 'text-rose-600 font-semibold' : isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {format(new Date(b.expiryDate), 'MMM yyyy')}
             </span>
            ) : '—'}
           </td>
          </tr>
         );
        })}
       </tbody>
      </table>
     </div>
    )}
   </div>
  </div>
 );
}
