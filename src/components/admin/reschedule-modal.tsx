'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { rescheduleAppointment } from '@/server/actions/appointments.actions';
import { CalendarClock, Loader2, X, Calendar, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface DoctorOption {
  id: string;
  name: string;
}

interface RescheduleModalProps {
  appointmentId: string;
  currentScheduledAt?: string;
  currentDoctorId?: string;
  doctors?: DoctorOption[];
  variant?: 'menu' | 'button' | 'icon';
  triggerLabel?: string;
  onSuccess?: () => void;
}

export default function RescheduleModal({
  appointmentId,
  currentScheduledAt,
  currentDoctorId,
  doctors = [],
  variant = 'menu',
  triggerLabel = 'Reschedule',
  onSuccess,
}: RescheduleModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Helper to format ISO to datetime-local input string (YYYY-MM-DDTHH:mm)
  function toLocalISO(dateStr?: string) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  }

  const [newDateTime, setNewDateTime] = useState(() => toLocalISO(currentScheduledAt));
  const [selectedDoctorId, setSelectedDoctorId] = useState(currentDoctorId ?? '');

  useEffect(() => {
    if (open) {
      if (currentScheduledAt) setNewDateTime(toLocalISO(currentScheduledAt));
      if (currentDoctorId) setSelectedDoctorId(currentDoctorId);
    }
  }, [open, currentScheduledAt, currentDoctorId]);

  function handleReschedule() {
    if (!newDateTime) {
      toast.error('Select a new date and time.');
      return;
    }

    startTransition(async () => {
      try {
        await rescheduleAppointment({
          appointmentId,
          newScheduledAt: new Date(newDateTime).toISOString(),
          doctorId: selectedDoctorId || undefined,
        });
        toast.success('Appointment rescheduled successfully.');
        setOpen(false);
        if (onSuccess) onSuccess();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to reschedule appointment.');
      }
    });
  }

  return (
    <>
      {variant === 'menu' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer"
        >
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          {triggerLabel}
        </button>
      )}

      {variant === 'button' && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-9 px-4 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2  cursor-pointer"
        >
          <CalendarClock className="h-4 w-4" />
          {triggerLabel}
        </button>
      )}

      {variant === 'icon' && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Reschedule appointment"
          className="h-8 w-8 flex items-center justify-center border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <CalendarClock className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white  border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground leading-tight">
                    Reschedule Appointment
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Admin Custom Schedule Control
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Date & Time Picker */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Select Custom Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  className="w-full h-10 px-3 border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  required
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  As an admin, you can set any date and time for this appointment.
                </p>
              </div>

              {/* Doctor Reassignment (Optional) */}
              {doctors.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    Assign Doctor (Optional)
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full h-10 px-3 border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  >
                    <option value="">Keep current doctor</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 px-4 border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReschedule}
                  disabled={isPending}
                  className="h-10 px-5 bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center gap-2 cursor-pointer "
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarClock className="h-4 w-4" />
                  )}
                  {isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
