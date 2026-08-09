'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markInvoicePaid } from '@/server/actions/billing.actions';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BillingActions({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleMarkPaid() {
    startTransition(async () => {
      try {
        await markInvoicePaid({ id: invoiceId, paymentMethod: 'cash' });
        toast.success('Invoice marked as paid.');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update invoice.');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleMarkPaid}
      disabled={isPending}
      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      Mark Paid
    </button>
  );
}
