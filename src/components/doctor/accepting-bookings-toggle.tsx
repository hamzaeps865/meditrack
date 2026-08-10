'use client';

import { useTransition } from 'react';
import { toggleAcceptingBookings } from '@/server/actions/doctors.actions';
import { toast } from 'sonner';

interface AcceptingBookingsToggleProps {
  initialValue: boolean;
}

export function AcceptingBookingsToggle({ initialValue }: AcceptingBookingsToggleProps) {
  const [isPending, startTransition] = useTransition();
  // Use a local state that's seeded from the server value
  const [accepting, setAccepting] = useOptimisticToggle(initialValue);

  function handleToggle() {
    startTransition(async () => {
      // Optimistic flip
      setAccepting((prev) => !prev);
      try {
        const result = await toggleAcceptingBookings();
        setAccepting(result.acceptingBookings);
        toast.success(
          result.acceptingBookings
            ? 'Now accepting bookings'
            : 'Bookings paused',
        );
      } catch {
        // Revert on error
        setAccepting((prev) => !prev);
        toast.error('Failed to update booking status');
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={accepting}
      aria-label="Toggle accepting bookings"
      disabled={isPending}
      onClick={handleToggle}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        disabled:opacity-60 disabled:cursor-not-allowed
        ${accepting ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${accepting ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

// ─── Minimal optimistic state hook ───────────────────────────────────────────
// A thin wrapper so we can both update the state directly (from the server
// response) and also do a functional update (for the optimistic flip).

import { useState } from 'react';

function useOptimisticToggle(initial: boolean) {
  const [value, setValue] = useState(initial);
  return [value, setValue] as const;
}
