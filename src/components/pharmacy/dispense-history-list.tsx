'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { undoDispensing } from '@/server/actions/pharmacy.actions';
import { Undo2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface HistoryItem {
 id: string;
 medicineName: string;
 quantityDispensed: number;
 dispensedAt: string;
 patientName: string | null;
 dispensedByName: string | null;
 notes: string | null;
}

export default function DispenseHistoryList({ history }: { history: HistoryItem[] }) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();

 function handleUndo(id: string, name: string) {
  if (!confirm(`Undo dispensing of ${name}? Stock will be restored and the prescription will become pending again.`)) return;
  startTransition(async () => {
   try {
    await undoDispensing(id);
    toast.success('Dispensing undone. Stock restored.');
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to undo.');
   }
  });
 }

 return (
    <div className="premium-card overflow-hidden">
   <table className="w-full text-sm">
    <thead><tr className="border-b border-border bg-muted/30 text-left">
     <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Medicine</th>
     <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Patient</th>
     <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Qty</th>
     <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">When</th>
     <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">By</th>
     <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-right">Action</th>
    </tr></thead>
    <tbody className="divide-y divide-border">
     {history.map((h) => (
      <tr key={h.id} className="hover:bg-muted/20">
       <td className="px-4 py-3 font-medium text-foreground">{h.medicineName}</td>
       <td className="px-4 py-3 text-muted-foreground">{h.patientName ?? '—'}</td>
       <td className="px-4 py-3 font-semibold text-foreground">{h.quantityDispensed}</td>
       <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(h.dispensedAt), 'MMM d, h:mm a')}</td>
       <td className="px-4 py-3 text-muted-foreground text-xs">{h.dispensedByName ?? '—'}</td>
       <td className="px-4 py-3 text-right">
        <button
         type="button"
         onClick={() => handleUndo(h.id, h.medicineName)}
         disabled={isPending}
         className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-50"
        >
         {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
         Undo
        </button>
       </td>
      </tr>
     ))}
    </tbody>
   </table>
  </div>
 );
}
