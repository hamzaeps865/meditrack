'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addMedicine, updateMedicine, addStock, adjustStock,
  dispensePrescriptionItem,
} from '@/server/actions/pharmacy.actions';
import {
  Pill, Package, FlaskConical, AlertTriangle, Clock,
  Plus, Loader2, X, Check, ChevronDown, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isFuture, differenceInDays } from 'date-fns';

type Tab = 'inventory' | 'catalog' | 'dispensing' | 'alerts';

interface Medicine {
  id: string; name: string; genericName: string | null;
  category: string | null; form: string | null; strength: string | null;
  manufacturer: string | null; reorderLevel: number; unitPriceCents: number;
}
interface InventoryBatch {
  id: string; medicineId: string; medicineName: string; genericName: string | null;
  form: string | null; strength: string | null; batchNumber: string | null;
  quantityInStock: number; reorderLevel: number; expiryDate: string | null;
  costPriceCents: number; supplier: string | null; receivedAt: string | null;
  unitPriceCents: number;
}
interface PendingItem {
  id: string; medicineName: string; medicineId: string | null;
  dosage: string; frequency: string; duration: string;
  patientName: string | null; doctorName: string | null;
  prescriptionCreatedAt: string;
}
interface Summary {
  lowStock: { medicineId: string; medicineName: string; genericName: string | null; totalStock: number; reorderLevel: number }[];
  expiring: { id: string; medicineName: string; batchNumber: string | null; quantityInStock: number; expiryDate: string | null }[];
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5';

export default function PharmacyManager({
  catalog, inventory, pendingDispensings, summary,
}: {
  catalog: Medicine[];
  inventory: InventoryBatch[];
  pendingDispensings: PendingItem[];
  summary: Summary;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');

  const tabs: { key: Tab; label: string; icon: typeof Pill; badge?: number }[] = [
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'catalog', label: 'Catalog', icon: Pill, badge: catalog.length },
    { key: 'dispensing', label: 'Dispensing', icon: FlaskConical, badge: pendingDispensings.length },
    { key: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: summary.lowStock.length + summary.expiring.length },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'inventory' && <InventoryTab inventory={inventory} catalog={catalog} />}
      {activeTab === 'catalog' && <CatalogTab catalog={catalog} />}
      {activeTab === 'dispensing' && <DispensingTab pending={pendingDispensings} inventory={inventory} />}
      {activeTab === 'alerts' && <AlertsTab summary={summary} />}
    </div>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab({ inventory, catalog }: { inventory: InventoryBatch[]; catalog: Medicine[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [medicineId, setMedicineId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [supplier, setSupplier] = useState('');

  function handleAddStock(e: React.FormEvent) {
    e.preventDefault();
    if (!medicineId || !quantity) { toast.error('Medicine and quantity are required.'); return; }
    startTransition(async () => {
      try {
        await addStock({
          medicineId, batchNumber: batchNumber || undefined,
          quantityInStock: Number(quantity),
          expiryDate: expiryDate || undefined,
          costPriceCents: costPrice ? Number(costPrice) * 100 : 0,
          supplier: supplier || undefined,
        });
        toast.success('Stock added.');
        setShowAdd(false); setMedicineId(''); setBatchNumber(''); setQuantity(''); setExpiryDate(''); setCostPrice(''); setSupplier('');
        router.refresh();
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed.'); }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">Stock Batches ({inventory.length})</h2>
        <button type="button" onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> Add Stock
        </button>
      </div>

      {inventory.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-10 text-center shadow-sm">
          <Package className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No stock yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add a batch to start tracking inventory.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30 text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Medicine</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Batch</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Qty</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Expiry</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Supplier</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {inventory.map((b) => {
                const isExpired = b.expiryDate && isPast(new Date(b.expiryDate));
                const isExpiringSoon = b.expiryDate && isFuture(new Date(b.expiryDate)) && differenceInDays(new Date(b.expiryDate), new Date()) <= 30;
                const isLow = b.quantityInStock <= b.reorderLevel;
                return (
                  <tr key={b.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{b.medicineName}</p>
                      <p className="text-xs text-muted-foreground">{b.genericName} · {b.strength}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{b.batchNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${isLow ? 'text-rose-600' : 'text-foreground'}`}>{b.quantityInStock}</span>
                      {isLow && <span className="ml-1 text-[10px] text-rose-500">LOW</span>}
                    </td>
                    <td className="px-4 py-3">
                      {b.expiryDate ? (
                        <span className={`text-xs ${isExpired ? 'text-rose-600 font-semibold' : isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {format(new Date(b.expiryDate), 'MMM yyyy')}
                          {isExpired ? ' (EXPIRED)' : isExpiringSoon ? ' (SOON)' : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{b.supplier ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
              <h3 className="text-base font-bold text-foreground">Add Stock Batch</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleAddStock} className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Medicine *</label>
                <select className={inputCls} value={medicineId} onChange={(e) => setMedicineId(e.target.value)} required>
                  <option value="">Select medicine</option>
                  {catalog.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.genericName})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Batch Number</label><input className={inputCls} value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} /></div>
                <div><label className={labelCls}>Quantity *</label><input type="number" className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Expiry Date</label><input type="date" className={inputCls} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
                <div><label className={labelCls}>Cost Price (Rs)</label><input type="number" className={inputCls} value={costPrice} onChange={(e) => setCostPrice(e.target.value)} /></div>
              </div>
              <div><label className={labelCls}>Supplier</label><input className={inputCls} value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
                <button type="submit" disabled={isPending} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Catalog Tab ──────────────────────────────────────────────────────────────

function CatalogTab({ catalog }: { catalog: Medicine[] }) {
  const [search, setSearch] = useState('');
  const filtered = catalog.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.genericName ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">Medicine Catalog ({catalog.length})</h2>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input className={`${inputCls} pl-9`} placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.genericName ?? '—'}</p>
              </div>
              {m.form && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{m.form}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {m.category && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{m.category}</span>}
              {m.strength && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{m.strength}</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{m.manufacturer ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dispensing Tab ───────────────────────────────────────────────────────────

function DispensingTab({ pending, inventory }: { pending: PendingItem[]; inventory: InventoryBatch[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedBatch, setSelectedBatch] = useState<Record<string, string>>({});
  const [dispenseQty, setDispenseQty] = useState<Record<string, string>>({});

  function handleDispense(item: PendingItem) {
    const batchId = selectedBatch[item.id];
    const qty = Number(dispenseQty[item.id] ?? '0');
    if (!batchId) { toast.error('Select a batch.'); return; }
    if (!qty || qty < 1) { toast.error('Enter a quantity.'); return; }

    startTransition(async () => {
      try {
        await dispensePrescriptionItem({
          prescriptionItemId: item.id,
          inventoryBatchId: batchId,
          quantity: qty,
        });
        toast.success(`${item.medicineName} dispensed.`);
        router.refresh();
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed.'); }
    });
  }

  return (
    <div>
      <h2 className="text-sm font-bold text-foreground mb-4">Pending Dispensings ({pending.length})</h2>
      {pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-10 text-center shadow-sm">
          <FlaskConical className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No pending prescriptions</p>
          <p className="text-xs text-muted-foreground mt-1">Completed-visit prescriptions awaiting dispensing will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-bold text-foreground">{item.medicineName}</p>
                  <p className="text-xs text-muted-foreground">{item.dosage} · {item.frequency} · {item.duration}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {item.patientName ?? '—'} · Dr. {item.doctorName ?? '—'} · {format(new Date(item.prescriptionCreatedAt), 'MMM d')}
                  </p>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className={labelCls}>Select Batch</label>
                  <select className={inputCls} value={selectedBatch[item.id] ?? ''} onChange={(e) => setSelectedBatch((p) => ({ ...p, [item.id]: e.target.value }))}>
                    <option value="">Choose batch...</option>
                    {inventory.filter((b) => b.quantityInStock > 0).map((b) => (
                      <option key={b.id} value={b.id}>{b.medicineName} — Batch {b.batchNumber ?? 'N/A'} ({b.quantityInStock} in stock, exp {b.expiryDate ?? '—'})</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className={labelCls}>Qty</label>
                  <input type="number" min={1} className={inputCls} value={dispenseQty[item.id] ?? ''} onChange={(e) => setDispenseQty((p) => ({ ...p, [item.id]: e.target.value }))} placeholder="Qty" />
                </div>
                <button type="button" onClick={() => handleDispense(item)} disabled={isPending} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1.5">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Dispense
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Alerts Tab ───────────────────────────────────────────────────────────────

function AlertsTab({ summary }: { summary: Summary }) {
  return (
    <div className="space-y-5">
      {/* Low stock */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" /> Low Stock ({summary.lowStock.length})
        </h2>
        {summary.lowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">All medicines are above reorder level.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-border divide-y divide-border shadow-sm">
            {summary.lowStock.map((m) => (
              <div key={m.medicineId} className="flex items-center justify-between px-4 py-3">
                <div><p className="text-sm font-medium text-foreground">{m.medicineName}</p><p className="text-xs text-muted-foreground">{m.genericName}</p></div>
                <span className="text-sm font-bold text-rose-600">{m.totalStock} / {m.reorderLevel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Expiry */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" /> Expiring Soon ({summary.expiring.length})
        </h2>
        {summary.expiring.length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches expiring within 30 days.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-border divide-y divide-border shadow-sm">
            {summary.expiring.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                <div><p className="text-sm font-medium text-foreground">{b.medicineName}</p><p className="text-xs text-muted-foreground">Batch {b.batchNumber ?? 'N/A'} · {b.quantityInStock} units</p></div>
                <span className="text-sm font-medium text-amber-600">{b.expiryDate ? format(new Date(b.expiryDate), 'MMM yyyy') : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
