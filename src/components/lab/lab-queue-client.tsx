'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { collectSample, submitLabResult } from '@/server/actions/lab-actions';
import { Clock, CheckCircle2, FlaskConical, Zap, Loader2, X, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface QueueItem {
 id: string;
 testName: string;
 priority: string;
 status: string;
 instructions: string | null;
 createdAt: string;
 collectedAt: string | null;
 patientName: string;
 patientId: string;
 doctorName: string | null;
 visitId: string;
 referenceRange?: string | null;
}

export default function LabQueueClient({ queue }: { queue: QueueItem[] }) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();
 const [resultModal, setResultModal] = useState<QueueItem | null>(null);
 const [resultText, setResultText] = useState('');

 function handleCollect(id: string) {
  startTransition(async () => {
   try {
    await collectSample(id);
    toast.success('Sample collected.');
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed.');
   }
  });
 }

 function openResultModal(item: QueueItem) {
  setResultModal(item);
  setResultText('');
 }

 function handleSubmitResult() {
  if (!resultModal || !resultText.trim()) { toast.error('Enter the result.'); return; }
  startTransition(async () => {
   try {
    await submitLabResult({ labOrderId: resultModal.id, result: resultText });
    toast.success('Result submitted. Patient and doctor notified.');
    setResultModal(null);
    setResultText('');
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed.');
   }
  });
 }

 const priorityConfig: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  stat:  { bg: 'bg-rose-50', text: 'text-rose-600', icon: Zap },
  urgent: { bg: 'bg-orange-50', text: 'text-orange-600', icon: Zap },
  routine: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Clock },
 };

 const statusConfig: Record<string, { label: string; cls: string }> = {
  ordered:     { label: 'Awaiting Sample', cls: 'bg-amber-50 text-amber-700' },
  sample_collected: { label: 'Sample Collected', cls: 'bg-emerald-50 text-emerald-700' },
  in_progress:   { label: 'In Progress', cls: 'bg-emerald-50 text-emerald-700' },
 };

 return (
  <div>
   {queue.length === 0 ? (
    <div className="bg-white border border-border p-12 text-center ">
     <FlaskConical className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
     <p className="text-sm font-medium text-foreground">Queue is empty</p>
     <p className="text-xs text-muted-foreground mt-1">New lab orders from doctors will appear here.</p>
    </div>
   ) : (
    <div className="space-y-3">
     {queue.map((item) => {
      const pCfg = priorityConfig[item.priority] ?? priorityConfig.routine;
      const sCfg = statusConfig[item.status] ?? statusConfig.ordered;
      const PIcon = pCfg.icon;
      return (
       <div key={item.id} className="bg-white border border-border p-4 ">
        <div className="flex items-start justify-between gap-3 mb-3">
         <div className="flex items-start gap-3">
          <div className={`h-9 w-9 ${pCfg.bg} flex items-center justify-center shrink-0`}>
           <PIcon className={`h-4 w-4 ${pCfg.text}`} />
          </div>
          <div>
           <p className="text-sm font-bold text-foreground">{item.testName}</p>
           <p className="text-xs text-muted-foreground">{item.patientName} · Dr. {item.doctorName ?? '—'}</p>
           <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Ordered {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            {item.collectedAt && ` · Collected ${format(new Date(item.collectedAt), 'h:mm a')}`}
           </p>
          </div>
         </div>
         <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${sCfg.cls}`}>
          {sCfg.label}
         </span>
        </div>

        {item.instructions && (
         <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 mb-3">
          ⚠ {item.instructions}
         </p>
        )}

        <div className="flex items-center gap-2 border-t border-border pt-3">
         {item.status === 'ordered' && (
          <button type="button" onClick={() => handleCollect(item.id)} disabled={isPending}
           className="flex items-center gap-1.5 h-8 px-3 border border-border text-xs font-medium text-foreground hover:bg-muted">
           {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
           Collect Sample
          </button>
         )}
         {(item.status === 'sample_collected' || item.status === 'in_progress' || item.status === 'ordered') && (
          <button type="button" onClick={() => openResultModal(item)}
           className="flex items-center gap-1.5 h-8 px-3 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
           <CheckCircle2 className="h-3 w-3" /> Enter Result
          </button>
         )}
        </div>
       </div>
      );
     })}
    </div>
   )}

   {/* Result entry modal */}
   {resultModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
     <div className="bg-white  border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
       <div>
        <h3 className="text-base font-bold text-foreground">Enter Lab Result</h3>
        <p className="text-xs text-muted-foreground">{resultModal.testName} — {resultModal.patientName}</p>
       </div>
       <button type="button" onClick={() => setResultModal(null)} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted">
        <X className="h-4 w-4" />
       </button>
      </div>
      <div className="p-5 space-y-4">
       {resultModal.referenceRange && (
        <div className="bg-emerald-50 border border-emerald-200 px-3 py-2">
         <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Reference Range</p>
         <p className="text-xs text-emerald-800 whitespace-pre-line">{resultModal.referenceRange}</p>
        </div>
       )}
       <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Result *</label>
        <textarea
         className="w-full px-3 py-2.5 border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
         rows={6}
         value={resultText}
         onChange={(e) => setResultText(e.target.value)}
         placeholder={resultModal.referenceRange
          ? `Enter values (reference range shown above)...\n\ne.g. Hb: 14.5 g/dL\nWBC: 6.8 ×10⁹/L`
          : 'Type the lab result here...'
         }
        />
       </div>
       <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => setResultModal(null)} className="h-10 px-4 border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button type="button" onClick={handleSubmitResult} disabled={isPending || !resultText.trim()} className="h-10 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
         {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
         Submit Result
        </button>
       </div>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}
