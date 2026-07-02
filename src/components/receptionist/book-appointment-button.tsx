'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import dynamic from 'next/dynamic';

const BookAppointmentModal = dynamic(
  () => import('./book-appointment-modal'),
  { ssr: false },
);

interface Doctor {
  id: string;
  name: string | null;
  specialization: string;
}

export default function BookAppointmentButton({ doctors }: { doctors: Doctor[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary
          text-primary-foreground text-sm font-medium
          hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Book Appointment
      </button>

      {open && (
        <BookAppointmentModal
          doctors={doctors}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
