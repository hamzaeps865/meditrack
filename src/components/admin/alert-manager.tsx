'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createHealthAlert, deleteHealthAlert } from '@/server/actions/health-alerts.actions';
import { Plus, Trash2, Loader2, Megaphone, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AlertItem {
 id: string;
 title: string;
 message: string;
 disease: string | null;
 severity: 'low' | 'medium' | 'high' | 'critical';
 city: string | null;
 createdAt: string;
 expiresAt: string | null;
 expired: boolean;
}

const severityConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
 low:   { bg: 'bg-emerald-50',  border: 'border-emerald-200',  text: 'text-emerald-700',  label: 'Low' },
 medium:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  label: 'Medium' },
 high:   { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'High' },
 critical: { bg: 'bg-rose-50',  border: 'border-rose-200',  text: 'text-rose-700',  label: 'Critical' },
};

export default function AlertManager({ alerts: initial }: { alerts: AlertItem[] }) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();
 const [showForm, setShowForm] = useState(false);

 // Form state
 const [title, setTitle] = useState('');
 const [message, setMessage] = useState('');
 const [disease, setDisease] = useState('');
 const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
 const [city, setCity] = useState('');
 const [expiresAt, setExpiresAt] = useState('');

 function handleCreate(e: React.FormEvent) {
  e.preventDefault();
  if (!title.trim() || !message.trim()) {
   toast.error('Title and message are required.');
   return;
  }
  startTransition(async () => {
   try {
    await createHealthAlert({
     title, message,
     disease: disease || undefined,
     severity,
     city: city || undefined,
     expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });
    toast.success('Health alert published.');
    setTitle(''); setMessage(''); setDisease(''); setCity(''); setExpiresAt(''); setSeverity('medium');
    setShowForm(false);
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create alert.');
   }
  });
 }

 function handleDelete(id: string) {
  if (!confirm('Delete this alert? This cannot be undone.')) return;
  startTransition(async () => {
   try {
    await deleteHealthAlert(id);
    toast.success('Alert deleted.');
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to delete alert.');
   }
  });
 }

 const inputCls = 'w-full h-10 px-3 border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';
 const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5';

 return (
  <>
   {/* Create button */}
   {!showForm && (
    <button
     type="button"
     onClick={() => setShowForm(true)}
     className="w-full mb-4 h-12 border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
    >
     <Plus className="h-4 w-4" />
     Create Health Alert
    </button>
   )}

   {/* Create form (modal) */}
   {showForm && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
     <div className="bg-white shadow-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
       <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold text-foreground">New Health Alert</h3>
       </div>
       <button type="button" onClick={() => setShowForm(false)} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted">
        <X className="h-4 w-4" />
       </button>
      </div>
      <form onSubmit={handleCreate} className="p-5 space-y-4">
       <div>
        <label className={labelCls}>Title *</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dengue Outbreak Warning" required />
       </div>
       <div>
        <label className={labelCls}>Message *</label>
        <textarea className={`${inputCls} h-auto py-2.5 resize-none`} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the alert and prevention tips..." required />
       </div>
       <div className="grid grid-cols-2 gap-4">
        <div>
         <label className={labelCls}>Disease</label>
         <input className={inputCls} value={disease} onChange={(e) => setDisease(e.target.value)} placeholder="e.g. Dengue" />
        </div>
        <div>
         <label className={labelCls}>Severity</label>
         <select className={inputCls} value={severity} onChange={(e) => setSeverity(e.target.value as 'low' | 'medium' | 'high' | 'critical')}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
         </select>
        </div>
       </div>
       <div className="grid grid-cols-2 gap-4">
        <div>
         <label className={labelCls}>Target City (blank = all)</label>
         <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Karachi" />
        </div>
        <div>
         <label className={labelCls}>Expires (optional)</label>
         <input type="datetime-local" className={inputCls} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
       </div>
       <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={() => setShowForm(false)} className="h-10 px-4 border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
         Cancel
        </button>
        <button type="submit" disabled={isPending} className="h-10 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
         {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
         Publish Alert
        </button>
       </div>
      </form>
     </div>
    </div>
   )}

   {/* Alert list */}
   {initial.length === 0 ? (
    <div className="bg-white border border-border p-10 text-center shadow-sm">
     <Megaphone className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
     <p className="text-sm font-medium text-foreground">No health alerts yet</p>
     <p className="text-xs text-muted-foreground mt-1">Create an alert to warn patients about outbreaks in their area.</p>
    </div>
   ) : (
    <div className="space-y-3">
     {initial.map((alert) => {
      const cfg = severityConfig[alert.severity] ?? severityConfig.medium;
      return (
       <div key={alert.id} className={`bg-white border p-5 shadow-sm ${alert.expired ? 'opacity-60' : cfg.border}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
         <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${cfg.bg} ${cfg.text}`}>
           {cfg.label}
          </span>
          {alert.disease && (
           <span className="text-[10px] font-medium px-2 py-0.5 bg-muted text-muted-foreground">
            {alert.disease}
           </span>
          )}
          {alert.city ? (
           <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" /> {alert.city}
           </span>
          ) : (
           <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700">
            All Cities
           </span>
          )}
          {alert.expired && (
           <span className="text-[10px] font-medium px-2 py-0.5 bg-muted text-muted-foreground">
            Expired
           </span>
          )}
         </div>
         <button
          type="button"
          onClick={() => handleDelete(alert.id)}
          disabled={isPending}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
          aria-label="Delete"
         >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
         </button>
        </div>
        <p className="text-sm font-bold text-foreground">{alert.title}</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{alert.message}</p>
        <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
         <span>Created {format(new Date(alert.createdAt), 'MMM d, yyyy')}</span>
         {alert.expiresAt && (
          <span>· Expires {format(new Date(alert.expiresAt), 'MMM d, yyyy')}</span>
         )}
        </div>
       </div>
      );
     })}
    </div>
   )}
  </>
 );
}
