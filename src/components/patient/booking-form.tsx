'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Search, ChevronDown,
  Loader2, CheckCircle2, AlertCircle,
  Calendar, Clock, Info,
} from 'lucide-react';
import { bookAppointment } from '@/server/actions/appointments.actions';
import NotificationBell from '@/components/shared/notification-bell';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoctorAvailability {
  dayOfWeek: string;
  startTime: string;
  endTime:   string;
}

interface Doctor {
  id:             string;
  name:           string | null;
  specialization: string;
  availability:   DoctorAvailability[];
}

interface Props {
  patientId:   string;
  patientName: string;
  doctors:     Doctor[];
}

// ─── Day helpers ──────────────────────────────────────────────────────────────

const DAY_JS_TO_NAME: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function buildSlots(
  availability: DoctorAvailability[],
  dateStr: string,
): string[] {
  if (!dateStr) return [];
  // Date-only strings are interpreted as UTC by JavaScript. Use midday local
  // time so the selected calendar day never shifts when deriving its weekday.
  const date    = new Date(`${dateStr}T12:00:00`);
  const dayName = DAY_JS_TO_NAME[date.getDay()];
  const windows = availability.filter((a) => a.dayOfWeek === dayName);
  if (windows.length === 0) return [];

  const now = new Date();
  const isToday = dateStr === todayISO();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: string[] = [];
  for (const w of windows) {
    const [sh, sm] = w.startTime.split(':').map(Number);
    const [eh, em] = w.endTime.split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur + 30 <= end) {
      if (!isToday || cur > currentMinutes) {
        const h = Math.floor(cur / 60);
        const m = cur % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
      cur += 30;
    }
  }
  return slots;
}

function fmtSlot(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatientBookingForm({
  patientId, patientName, doctors,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? '');
  const [date,     setDate]     = useState('');
  const [slot,     setSlot]     = useState('');
  const [reason,   setReason]   = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const slots = buildSlots(selectedDoctor?.availability ?? [], date);

  const isDoctorUnavailableOnDate =
    date !== '' && selectedDoctor !== undefined && slots.length === 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!doctorId) { setError('Please select a doctor.'); return; }
    if (!date)     { setError('Please select a date.');   return; }
    if (!slot)     { setError('Please select a time slot.'); return; }

    // Appointment availability is stored as the clinic's weekly wall-clock
    // schedule. Preserve the chosen date and time exactly for server-side
    // schedule validation instead of applying the browser's timezone offset.
    const scheduledAt = `${date}T${slot}:00.000Z`;

    startTransition(async () => {
      try {
        await bookAppointment({
          patientId,
          doctorId,
          scheduledAt,
          reason: reason || undefined,
        });
        setSuccess(true);
        setTimeout(() => router.push('/patient/appointments'), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
      }
    });
  }

  return (
    <div className="min-h-full bg-[#f5f7fa]">

      {/* Top bar */}
      <div className="bg-white border-b border-border px-6 py-3
        flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
            text-muted-foreground" />
          <input type="text" placeholder="Search..."
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border
              bg-muted/40 text-sm placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white" />
        </div>
        <NotificationBell />
      </div>

      <div className="px-6 py-5 max-w-2xl mx-auto">

        {/* Back + title */}
        <div className="mb-5">
          <Link href="/patient/appointments"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
              hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            My Appointments
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Book Appointment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Booking as <span className="font-semibold text-foreground">{patientName}</span>
          </p>
        </div>

        {/* Success state */}
        {success ? (
          <div className="bg-white rounded-2xl border border-emerald-200 p-10
            shadow-sm flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center
              justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Appointment Booked!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Redirecting to your appointments...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200
                bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Doctor */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Select Doctor
              </label>
              <div className="relative">
                <select
                  value={doctorId}
                  onChange={(e) => {
                    setDoctorId(e.target.value);
                    setDate('');
                    setSlot('');
                  }}
                  className="w-full h-11 pl-3 pr-9 rounded-xl border border-border
                    bg-muted/30 text-sm text-foreground appearance-none
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                >
                  <option value="">Choose a doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} — {d.specialization}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2
                  -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {selectedDoctor && selectedDoctor.availability.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  This doctor has not set their availability yet.
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Appointment Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
                  text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => { setDate(e.target.value); setSlot(''); }}
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-border
                    bg-muted/30 text-sm text-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                />
              </div>
              {isDoctorUnavailableOnDate && (
                <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Dr. {selectedDoctor?.name} is not available on this day.
                  Please choose a different date.
                </p>
              )}
            </div>

            {/* Time slots */}
            {slots.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground">
                    Available Time Slots
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {slots.length} slot{slots.length !== 1 ? 's' : ''} available
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={`h-10 rounded-xl text-xs font-semibold border
                        transition-colors
                        ${slot === s
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-white text-foreground border-border hover:border-primary/40'}`}
                    >
                      {fmtSlot(s)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-foreground">
                  Reason for Visit
                </label>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Annual check-up, follow-up, acute pain..."
                className="w-full h-11 px-3 rounded-xl border border-border bg-muted/30
                  text-sm text-foreground placeholder:text-muted-foreground/60
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
              />
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2.5 rounded-xl bg-muted/40
              border border-border px-4 py-3">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                After booking, please arrive 10 minutes early for check-in.
                Cancellations within 24 hours may require administrative override.
              </p>
            </div>

            <div className="border-t border-border pt-4 flex items-center
              justify-between gap-3">
              <Link href="/patient/appointments"
                className="text-sm font-medium text-muted-foreground
                  hover:text-foreground transition-colors">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isPending || !doctorId || !date || !slot}
                className="h-11 px-8 rounded-xl text-sm font-bold text-white
                  hover:opacity-90 transition-all disabled:opacity-50
                  disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: '#1E3A5F' }}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Booking
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
