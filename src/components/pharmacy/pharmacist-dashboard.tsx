'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addMedicine, addStock, dispensePrescriptionItem } from '@/server/actions/pharmacy.actions';
import {
 Pill, Search, Check, Loader2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PendingItem {
 id: string;
 medicineName: string;
 medicineId: string | null;
 dosage: string;
 frequency: string;
 duration: string;
 patientName: string | null;
 doctorName: string | null;
 prescriptionCreatedAt: string;
}
interface InventoryBatch {
 id: string;
 medicineId: string;
 medicineName: string;
 batchNumber: string | null;
 quantityInStock: number;
 expiryDate: string | null;
}
interface CatalogMedicine { id: string; name: string; genericName: string | null; strength: string | null; }

export default function PharmacistDashboard({
 pending,
 inventory,
 catalog,
}: {
 pending: PendingItem[];
 inventory: InventoryBatch[];
 catalog: CatalogMedicine[];
}) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();
 const [search, setSearch] = useState('');
 const [selectedBatch, setSelectedBatch] = useState<Record<string, string>>({});
 const [dispenseQty, setDispenseQty] = useState<Record<string, string>>({});
 const [inventoryState, setInventoryState] = useState(inventory);
 const [medicineName, setMedicineName] = useState('');
 const [genericName, setGenericName] = useState('');
 const [strength, setStrength] = useState('');
 const [stockMedicineId, setStockMedicineId] = useState('');
 const [stockQuantity, setStockQuantity] = useState('');
 const [batchNumber, setBatchNumber] = useState('');

 // Filter by patient name or medicine name
 const filtered = pending.filter((p) => {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return (
   (p.patientName ?? '').toLowerCase().includes(q) ||
   p.medicineName.toLowerCase().includes(q)
  );
 });

 function handleDispense(item: PendingItem) {
  const batchId = selectedBatch[item.id];
  const qty = Number(dispenseQty[item.id] ?? '0');
  if (!batchId) { toast.error('Select a batch to dispense from.'); return; }
  if (!qty || qty < 1) { toast.error('Enter a valid quantity.'); return; }

  startTransition(async () => {
   try {
    await dispensePrescriptionItem({
     prescriptionItemId: item.id,
     inventoryBatchId: batchId,
     quantity: qty,
    });
    toast.success(`${item.medicineName} dispensed to ${item.patientName ?? 'patient'}.`);
    setInventoryState((current) => current.map((batch) => (batch.id === batchId ? { ...batch, quantityInStock: Math.max(0, batch.quantityInStock - qty) } : batch)));
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Dispensing failed.');
   }
  });
 }

 function handleAddMedicine(e: React.FormEvent) {
  e.preventDefault();
  startTransition(async () => {
   try {
    await addMedicine({ name: medicineName, genericName: genericName || undefined, strength: strength || undefined });
    toast.success('Medicine added to the catalog.');
    setMedicineName(''); setGenericName(''); setStrength(''); router.refresh();
   } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not add medicine.'); }
  });
 }

 function handleAddStock(e: React.FormEvent) {
  e.preventDefault();
  startTransition(async () => {
   try {
    await addStock({ medicineId: stockMedicineId, quantityInStock: Number(stockQuantity), batchNumber: batchNumber || undefined });
    toast.success('Stock batch added.');
    setStockMedicineId(''); setStockQuantity(''); setBatchNumber(''); router.refresh();
   } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not add stock.'); }
  });
 }

 // Available batches (stock > 0)
 const availableBatches = (item: PendingItem) => inventoryState.filter((b) =>
  b.quantityInStock > 0 && (!item.medicineId || b.medicineId === item.medicineId),
 );

 return (
  <div className="space-y-5">
   {/* Patient/Medicine search */}
   <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <input
     className="w-full h-11 pl-9 pr-4 border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 "
     placeholder="Search by patient name or medicine..."
     value={search}
     onChange={(e) => setSearch(e.target.value)}
    />
   </div>

   {/* Pending queue */}
   {filtered.length === 0 ? (
    <div className="premium-card p-12 text-center">
     <Pill className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
     <p className="text-sm font-medium text-foreground">
      {search ? 'No matching prescriptions found' : 'No pending prescriptions'}
     </p>
     <p className="text-xs text-muted-foreground mt-1">
      {search ? 'Try a different search.' : 'Completed-visit prescriptions will appear here for dispensing.'}
     </p>
    </div>
   ) : (
    <div className="space-y-3">
     {filtered.map((item) => (
      <div key={item.id} className="bg-white border border-border p-4 ">
       {/* Patient + medicine info */}
       <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
         <div className="h-9 w-9 bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {(item.patientName ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
         </div>
         <div>
          <p className="text-sm font-bold text-foreground">{item.patientName ?? 'Unknown patient'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
           Dr. {item.doctorName ?? '—'} · {format(new Date(item.prescriptionCreatedAt), 'MMM d, h:mm a')}
          </p>
         </div>
        </div>
        <div className="text-right">
         <p className="text-sm font-semibold text-foreground">{item.medicineName}</p>
         <p className="text-xs text-muted-foreground">{item.dosage} · {item.frequency} · {item.duration}</p>
        </div>
       </div>

       {/* Dispense controls */}
       <div className="flex items-end gap-2 border-t border-border pt-3">
        <div className="flex-1">
         <label className="block text-[10px] font-medium text-muted-foreground mb-1">Select Batch</label>
         <select
          className="w-full h-9 px-2 border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={selectedBatch[item.id] ?? ''}
          onChange={(e) => setSelectedBatch((p) => ({ ...p, [item.id]: e.target.value }))}
         >
          <option value="">Choose batch...</option>
          {availableBatches(item).map((b) => (
           <option key={b.id} value={b.id}>
            {b.medicineName} — {b.batchNumber ?? 'N/A'} ({b.quantityInStock} in stock
            {b.expiryDate ? `, exp ${format(new Date(b.expiryDate), 'MMM yyyy')}` : ''})
           </option>
          ))}
         </select>
        </div>
        <div className="w-20">
         <label className="block text-[10px] font-medium text-muted-foreground mb-1">Qty</label>
         <input
          type="number"
          min={1}
          className="w-full h-9 px-2 border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={dispenseQty[item.id] ?? ''}
          onChange={(e) => setDispenseQty((p) => ({ ...p, [item.id]: e.target.value }))}
          placeholder="Qty"
         />
        </div>
        <button
         type="button"
         onClick={() => handleDispense(item)}
         disabled={isPending}
         className="h-9 px-4 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1.5 shrink-0"
        >
         {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
         Dispense
        </button>
       </div>
      </div>
     ))}
    </div>
   )}

   {/* Low-stock warning */}
   {inventoryState.filter((b) => b.quantityInStock <= 10).length > 0 && (
    <div className="bg-rose-50 border border-rose-200 p-4">
     <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="h-4 w-4 text-rose-600" />
      <h3 className="text-sm font-bold text-rose-700">Low Stock Alert</h3>
     </div>
     <div className="space-y-1">
      {inventoryState.filter((b) => b.quantityInStock <= 10).slice(0, 5).map((b) => (
       <div key={b.id} className="flex items-center justify-between text-xs">
        <span className="text-rose-700">{b.medicineName} — Batch {b.batchNumber ?? 'N/A'}</span>
        <span className="font-bold text-rose-600">{b.quantityInStock} units</span>
       </div>
      ))}
     </div>
     <p className="text-[10px] text-rose-500 mt-2">
      These batches have 10 or fewer units. Contact admin to restock.
     </p>
    </div>
   )}

   <div className="grid gap-4 md:grid-cols-2">
    <form onSubmit={handleAddMedicine} className="bg-white border border-border p-4  space-y-3">
     <h2 className="text-sm font-bold text-foreground">Add Medicine to Catalog</h2>
     <input required value={medicineName} onChange={(e) => setMedicineName(e.target.value)} placeholder="Medicine name" className="w-full h-9 px-3 border border-border text-sm" />
     <div className="grid grid-cols-2 gap-2">
      <input value={genericName} onChange={(e) => setGenericName(e.target.value)} placeholder="Generic name" className="w-full h-9 px-3 border border-border text-sm" />
      <input value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="Strength" className="w-full h-9 px-3 border border-border text-sm" />
     </div>
     <button disabled={isPending} className="h-9 px-3 bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">Add Medicine</button>
    </form>
    <form onSubmit={handleAddStock} className="bg-white border border-border p-4  space-y-3">
     <h2 className="text-sm font-bold text-foreground">Receive Stock</h2>
     <select required value={stockMedicineId} onChange={(e) => setStockMedicineId(e.target.value)} className="w-full h-9 px-3 border border-border text-sm">
      <option value="">Select medicine</option>
      {catalog.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name}{medicine.strength ? ` ${medicine.strength}` : ''}</option>)}
     </select>
     <div className="grid grid-cols-2 gap-2">
      <input required min="0" type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="Quantity" className="w-full h-9 px-3 border border-border text-sm" />
      <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Batch number" className="w-full h-9 px-3 border border-border text-sm" />
     </div>
     <button disabled={isPending} className="h-9 px-3 bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">Add Stock</button>
    </form>
   </div>
  </div>
 );
}
