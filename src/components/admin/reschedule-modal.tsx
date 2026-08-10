'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rescheduleAppointment } from '@/server/actions/appointments.actions';
import { CalendarClock, Clock, Loader2, X, Calendar, User, Stethoscope, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, addWeeks, setHours, setMinutes } from 'date-fns';

export interface RescheduleAppointmentDetails {
  id: string;
  patientName?: string | null;
  doctorName?: string | null;
  scheduledAt?: string;
  reason?: string | null;
}

interface RescheduleModalProps {
  appointment: RescheduleAppointmentDetails;
  onClose: () => void;
  onSuccess?: () => void;
}

const QUICK_TIME_SLOTS = [
  '09:00',
  '10:30',
  '11:30',
  '14:00',
  '15:30',
  '17:00',
];

export default function RescheduleModal({
  appointment,
  onClose,
  onSuccess,
}: RescheduleModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentDate = appointment.scheduledAt ? new Date(appointment.scheduledAt) : new Date();

  // Helper to format Date into YYYY-MM-DDTHH:mm for datetime-local
  const toLocalISO = (d: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [newDateTime, setNewDateTime] = useState<string>(toLocalISO(currentDate));

  // Quick Preset Handlers
  function applyPreset(daysToAdd: number, weeksToAdd = 0) {
    let target = new Date(currentDate);
    if (daysToAdd) target = addDays(target, daysToAdd);
    if (weeksToAdd) target = addWeeks(target, weeksToAdd);
    setNewDateTime(toLocalISO(target));
  }

  function applyTimeSlot(timeStr: string) {
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = newDateTime ? new Date(newDateTime) : new Date();
    const updated = setMinutes(setHours(dateObj, h), m);
    setNewDateTime(toLocalISO(updated));
  }

  function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!newDateTime) {
      toast.error('Please select a valid date and time.');
      return;
    }

    startTransition(async () => {
      try {
        await rescheduleAppointment({
          appointmentId: appointment.id,
          newScheduledAt: new Date(newDateTime).toISOString(),
        });
        toast.success(`Appointment rescheduled to ${format(new Date(newDateTime), 'PPP p')}`);
        if (onSuccess) onSuccess();
        onClose();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to reschedule appointment.');
      }
    });
  }

  const selectedDateObj = newDateTime ? new Date(newDateTime) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Easy Appointment Reschedule</h3>
              <p className="text-xs text-muted-foreground">Select a new date & time slot for the patient</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleReschedule} className="p-6 space-y-5">
          
          {/* Current Appointment Summary Card */}
          <div className="p-3.5 bg-muted/40 rounded-xl border border-border/80 grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <User className="h-3 w-3 text-primary" /> Patient
              </span>
              <p className="font-bold text-foreground truncate">{appointment.patientName || 'Unnamed Patient'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Stethoscope className="h-3 w-3 text-primary" /> Doctor
              </span>
              <p className="font-bold text-foreground truncate">
                {appointment.doctorName ? `Dr. ${appointment.doctorName}` : 'Assigned Doctor'}
              </p>
            </div>
            {appointment.scheduledAt && (
              <div className="col-span-2 pt-2 border-t border-border/60 flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Currently Scheduled:</span>
                <span className="font-semibold text-foreground bg-white px-2 py-0.5 rounded border border-border">
                  {format(new Date(appointment.scheduledAt), 'MMM dd, yyyy · hh:mm a')}
                </span>
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Quick Date Presets
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset(1)}
                className="h-8 px-2 rounded-lg border border-border bg-white text-xs font-medium text-foreground hover:bg-primary/5 hover:border-primary/40 transition-colors"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => applyPreset(2)}
                className="h-8 px-2 rounded-lg border border-border bg-white text-xs font-medium text-foreground hover:bg-primary/5 hover:border-primary/40 transition-colors"
              >
                +2 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 1)}
                className="h-8 px-2 rounded-lg border border-border bg-white text-xs font-medium text-foreground hover:bg-primary/5 hover:border-primary/40 transition-colors"
              >
                +1 Week
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 2)}
                className="h-8 px-2 rounded-lg border border-border bg-white text-xs font-medium text-foreground hover:bg-primary/5 hover:border-primary/40 transition-colors"
              >
                +2 Weeks
              </button>
            </div>
          </div>

          {/* Datetime Selection Input */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              New Date & Time
            </label>
            <input
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-border bg-white text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {/* Quick Time Slots */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Quick Time Slot Pick
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TIME_SLOTS.map((t) => {
                const label = format(setMinutes(setHours(new Date(), parseInt(t.split(':')[0])), parseInt(t.split(':')[1])), 'hh:mm a');
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => applyTimeSlot(t)}
                    className="h-7 px-3 rounded-full text-xs font-medium border border-border bg-muted/30 hover:bg-primary hover:text-white hover:border-primary transition-colors"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Box */}
          {selectedDateObj && !isNaN(selectedDateObj.getTime()) && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200/70 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold">Rescheduling to: </span>
                <span className="font-bold">{format(selectedDateObj, 'EEEE, MMMM dd, yyyy')}</span> at <span className="font-bold">{format(selectedDateObj, 'hh:mm a')}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-border bg-white text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-10 px-6 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2 shadow-sm"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
              Confirm Reschedule
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
