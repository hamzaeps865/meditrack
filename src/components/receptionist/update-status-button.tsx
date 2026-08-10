'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateAppointmentStatus } from '@/server/actions/appointments.actions';
import { Loader2 } from 'lucide-react';

interface Props {
 appointmentId: string;
 newStatus:   string;
 label:     string;
 style:     string;
}

export default function UpdateStatusButton({
 appointmentId, newStatus, label, style,
}: Props) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();

 function handleClick() {
  startTransition(async () => {
   try {
    await updateAppointmentStatus({ id: appointmentId, status: newStatus });
    router.refresh();
   } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to update status.');
   }
  });
 }

 return (
  <button
   type="button"
   onClick={handleClick}
   disabled={isPending}
   className={`h-9 px-4 text-sm font-semibold transition-colors
    disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2
    ${style}`}
  >
   {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
   {label}
  </button>
 );
}
