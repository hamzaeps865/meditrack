'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateAppointmentStatus } from '@/server/actions/appointments.actions';
import { XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CancelAppointmentButton({
  appointmentId,
  variant = 'text',
}: {
  appointmentId: string;
  variant?: 'text' | 'button';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm('Cancel this appointment? This cannot be undone.')) return;
    startTransition(async () => {
      try {
        await updateAppointmentStatus({ id: appointmentId, status: 'cancelled' });
        toast.success('Appointment cancelled.');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to cancel.');
      }
    });
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-red-200
          text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors
          disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
        Cancel
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={isPending}
      className="inline-flex items-center gap-1 text-xs font-semibold text-red-500
        hover:text-red-600 disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
      Cancel
    </button>
  );
}
