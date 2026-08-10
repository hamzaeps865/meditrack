'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markDoseTaken } from '@/server/actions/medication-reminders.actions';
import { Pill, Clock, Check, Loader2, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, isPast } from 'date-fns';

interface Reminder {
 id: string;
 medicineName: string;
 dosage: string;
 frequency: string;
 nextDoseAt: Date;
}

export default function MedicationReminders({ reminders }: { reminders: Reminder[] }) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();
 const [takenIds, setTakenIds] = useState<Set<string>>(new Set());

 function handleTaken(id: string, name: string) {
  setTakenIds((prev) => new Set([...prev, id]));
  startTransition(async () => {
   try {
    await markDoseTaken(id);
    toast.success(`${name} marked as taken. Next dose scheduled.`);
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update.');
   }
  });
 }

 if (reminders.length === 0) return null;

 const overdue = reminders.filter((r) => isPast(new Date(r.nextDoseAt)));

 return (
    <div className="premium-card premium-card-pad">
   <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
     <BellRing className="h-4 w-4 text-primary" />
     <h2 className="text-sm font-bold text-foreground">Medication Reminders</h2>
    </div>
    {overdue.length > 0 && (
     <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700">
      {overdue.length} overdue
     </span>
    )}
   </div>

   <div className="space-y-2">
    {reminders.map((r) => {
     const isOverdue = isPast(new Date(r.nextDoseAt));
     const isTaken = takenIds.has(r.id);
     return (
      <div
       key={r.id}
       className={`flex items-center gap-3 px-3 py-2.5 border transition-colors ${
        isTaken ? 'bg-emerald-50 border-emerald-200 opacity-70' :
        isOverdue ? 'bg-rose-50 border-rose-200' : 'bg-muted/30 border-border'
       }`}
      >
       <div className={`h-8 w-8 flex items-center justify-center shrink-0 ${
        isTaken ? 'bg-emerald-100' : isOverdue ? 'bg-rose-100' : 'bg-primary/10'
       }`}>
        {isTaken ? (
         <Check className="h-4 w-4 text-emerald-600" />
        ) : (
         <Pill className={`h-4 w-4 ${isOverdue ? 'text-rose-600' : 'text-primary'}`} />
        )}
       </div>

       <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{r.medicineName}</p>
        <p className="text-xs text-muted-foreground">{r.dosage} · {r.frequency}</p>
       </div>

       <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}`}>
         <Clock className="h-2.5 w-2.5" />
         {isTaken ? 'Done' : formatDistanceToNow(new Date(r.nextDoseAt), { addSuffix: true })}
        </span>
        {!isTaken && (
         <button
          type="button"
          onClick={() => handleTaken(r.id, r.medicineName)}
          disabled={isPending}
          className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
         >
          {isPending && isPending ? '...' : 'Taken ✓'}
         </button>
        )}
       </div>
      </div>
     );
    })}
   </div>
  </div>
 );
}
