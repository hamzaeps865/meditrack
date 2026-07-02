'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { X, User, Clock, Calendar, FileText, Upload } from 'lucide-react';
import { bookAppointment } from '@/server/actions/appointments.actions';
import { searchPatients } from '@/server/actions/patients.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string | null;
  specialization: string;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  doctors: Doctor[];
  onClose: () => void;
}

// ─── Time slot helpers ────────────────────────────────────────────────────────

function buildTimeSlots() {
  const slots: string[] = [];
  for (let h = 8; h < 18; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

const ALL_SLOTS = buildTimeSlots();

function formatSlotLabel(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookAppointmentModal({ doctors, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);

  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id ?? '');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [reason, setReason] = useState('');

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Patient search with debounce
  useEffect(() => {
    if (patientQuery.length < 2) {
      setPatientResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearchingPatients(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchPatients(patientQuery);
        setPatientResults(results.slice(0, 5));
      } catch {
        setPatientResults([]);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
  }, [patientQuery]);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    if (!selectedDoctorId) {
      toast.error('Please select a doctor');
      return;
    }

    const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

    startTransition(async () => {
      try {
        await bookAppointment({
          patientId:   selectedPatient.id,
          doctorId:    selectedDoctorId,
          scheduledAt,
          reason:      reason || undefined,
        });
        toast.success('Appointment booked successfully');
        router.refresh();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Booking failed');
      }
    });
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-end
        bg-black/40 backdrop-blur-sm"
    >
      <div
        className="relative h-full w-full max-w-[480px] bg-card shadow-2xl
          overflow-y-auto flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Book Appointment"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Book Appointment</h2>
            <p className="text-sm text-muted-foreground mt-0.5">New patient consultation</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full
              text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-6 py-5 gap-5">

          {/* Patient Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Patient Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={selectedPatient ? selectedPatient.name : patientQuery}
                onChange={(e) => {
                  setSelectedPatient(null);
                  setPatientQuery(e.target.value);
                }}
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-background
                  text-sm text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Search results */}
            {!selectedPatient && patientResults.length > 0 && (
              <div className="mt-1 border border-border rounded-lg bg-card shadow-sm overflow-hidden">
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(p);
                      setPatientQuery('');
                      setPatientResults([]);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left
                      hover:bg-muted transition-colors text-sm"
                  >
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary
                      flex items-center justify-center text-xs font-semibold shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected patient chip */}
            {selectedPatient && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                bg-primary/10 text-primary text-xs font-medium">
                <User className="h-3 w-3" />
                {selectedPatient.name}
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="ml-1 hover:text-primary/60"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {searchingPatients && (
              <p className="mt-1 text-xs text-muted-foreground">Searching...</p>
            )}
          </div>

          {/* Assigned Doctor */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Assigned Doctor
            </label>
            <div className="relative">
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-background
                  text-sm text-foreground appearance-none
                  focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.name} ({d.specialization})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Select Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  min={todayISO()}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background
                    text-sm text-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Select Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background
                    text-sm text-foreground appearance-none
                    focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {ALL_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {formatSlotLabel(slot)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Available slots quick-pick */}
          <div>
            <div className="bg-muted/50 rounded-lg px-4 pt-3 pb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Available Slots Today
              </p>
              <div className="flex flex-wrap gap-2">
                {['09:00', '10:00', '11:30', '14:00', '15:30', '16:00'].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      setSelectedDate(todayISO());
                      setSelectedTime(slot);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                      ${selectedTime === slot && selectedDate === todayISO()
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/40'
                      }`}
                  >
                    {formatSlotLabel(slot)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reason for visit */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Reason for Visit
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe the symptoms or reason..."
                rows={3}
                maxLength={1000}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background
                  text-sm text-foreground placeholder:text-muted-foreground resize-none
                  focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Attach records (UI only — file upload not wired to storage) */}
          <div>
            <div className="flex flex-col items-center justify-center gap-1.5
              border border-dashed border-border rounded-lg py-5 px-4
              text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer">
              <Upload className="h-5 w-5" />
              <p className="text-sm">Attach medical records or referral</p>
              <p className="text-xs">(optional)</p>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-1 border-t border-border">
            <button
              type="submit"
              disabled={isPending || !selectedPatient}
              className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm
                font-semibold hover:bg-primary/90 disabled:opacity-50
                disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Booking...' : 'Confirm Booking'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-lg border border-border text-foreground text-sm
                font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
