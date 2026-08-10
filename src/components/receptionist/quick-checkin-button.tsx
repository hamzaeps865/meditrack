'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateAppointmentStatus } from '@/server/actions/appointments.actions';
import { UserCheck, Loader2 } from 'lucide-react';

export default function QuickCheckinButton({ appointmentId }: { appointmentId: string }) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();

 function handleCheckin() {
  startTransition(async () => {
   try {
    await updateAppointmentStatus({ id: appointmentId, status: 'checked_in' });
    router.refresh();
   } catch (err: any) {
    alert(err?.message ?? 'Failed to check in patient.');
   }
  });
 }

 return (
  <button
   type="button"
   onClick={handleCheckin}
   disabled={isPending}
   className="h-8 px-3 bg-amber-500 text-white text-xs font-bold
    hover:bg-amber-600 transition-colors disabled:opacity-50
    flex items-center gap-1.5 shadow-sm shrink-0"
  >
   {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
   {isPending ? 'Checking in...' : 'Check-in'}
  </button>
 );
}
