'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rescheduleAppointment } from '@/server/actions/appointments.actions';
import { CalendarClock, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function RescheduleModal({ appointmentId }: { appointmentId: string }) {
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [isPending, startTransition] = useTransition();
 const [newDateTime, setNewDateTime] = useState('');

 function handleReschedule() {
  if (!newDateTime) { toast.error('Select a new date and time.'); return; }
  startTransition(async () => {
   try {
    await rescheduleAppointment({
     appointmentId,
     newScheduledAt: new Date(newDateTime).toISOString(),
    });
    toast.success('Appointment rescheduled.');
    setOpen(false);
    setNewDateTime('');
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to reschedule.');
   }
  });
 }

 return (
  <>
   <button
    type="button"
    onClick={() => setOpen(true)}
    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
   >
    Reschedule
   </button>

   {open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
     <div className="bg-white shadow-xl border border-border w-full max-w-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
       <h3 className="text-base font-bold text-foreground">Reschedule Appointment</h3>
       <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted">
        <X className="h-4 w-4" />
       </button>
      </div>
      <div className="p-5 space-y-4">
       <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">New Date & Time</label>
        <input
         type="datetime-local"
         value={newDateTime}
         onChange={(e) => setNewDateTime(e.target.value)}
         className="w-full h-10 px-3 border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
       </div>
       <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button type="button" onClick={handleReschedule} disabled={isPending} className="h-10 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
         {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
         Reschedule
        </button>
       </div>
      </div>
     </div>
    </div>
   )}
  </>
 );
}
