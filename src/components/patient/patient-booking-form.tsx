'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Calendar, Clock, Stethoscope, User, FileText,
  CheckCircle2, AlertCircle, ArrowLeft, Loader2,
  CalendarDays, Info, Sparkles,
} from 'lucide-react';
import { bookAppointment } from '@/server/actions/appointments.actions';
import { getDoctorAvailability } from '@/server/actions/availability.actions';
import { format, addDays, isSameDay, isBefore, startOfDay } from 'date-fns';

interface DoctorOption {
  id: string;
  name: string | null;
  specialization: string | null;
}

interface Props {
  patientId: string;
  doctors: DoctorOption[];
}

const inputCls =
  'w-full h-10 px-3 rounded-xl border border-border bg-white text-sm ' +
  'text-foreground placeholder:text-muted-foreground/60 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';

// Standard 30-minute clinic slots between 08:00 and 17:30
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30',
];

export default function PatientBookingForm({ patientId, doctors }: Props) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    doctors.length > 0 ? doctors[0].id : '',
  );
  const [selectedDateStr, setSelectedDateStr]   = useState<string>(
    format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:00');
  const [reason, setReason]                     = useState<string>('');
  const [errorMsg, setErrorMsg]                 = useState<string | null>(null);
  const [success, setSuccess]                   = useState<boolean>(false);
  const [isPending, startTransition]            = useTransition();

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Quick 7-day selector dates
  const nextDays = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i + 1));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedDoctorId) {
      setErrorMsg('Please select a doctor.');
      return;
    }
    if (!selectedDateStr || !selectedTimeSlot) {
      setErrorMsg('Please select a date and time slot.');
      return;
    }

    // Construct ISO 8601 datetime: e.g. "2026-08-01T09:00:00.000Z"
    const scheduledAtIso = `${selectedDateStr}T${selectedTimeSlot}:00.000Z`;

    startTransition(async () => {
      try {
        await bookAppointment({
          patientId,
          doctorId: selectedDoctorId,
          scheduledAt: scheduledAtIso,
          reason: reason || undefined,
        });
        setSuccess(true);
      } catch (err: any) {
        setErrorMsg(err?.message ?? 'Failed to book appointment. Slot may be taken.');
      }
    });
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm text-center max-w-lg mx-auto space-y-4">
        <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Appointment Booked!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your appointment with <span className="font-semibold text-foreground">Dr. {selectedDoctor?.name}</span> has been scheduled for{' '}
            <span className="font-semibold text-foreground">{format(new Date(selectedDateStr), 'EEEE, MMMM d, yyyy')}</span> at{' '}
            <span className="font-semibold text-foreground">{selectedTimeSlot}</span>.
          </p>
        </div>

        <div className="pt-4 flex items-center justify-center gap-3">
          <a
            href="/patient/appointments"
            className="h-10 px-6 rounded-xl text-sm font-bold text-white flex items-center justify-center"
            style={{ backgroundColor: '#1E3A5F' }}
          >
            View My Appointments
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* ── 1. Doctor Selection ── */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">1. Select Doctor</h3>
            <p className="text-xs text-muted-foreground">Choose a specialist or physician</p>
          </div>
        </div>

        {doctors.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No doctors available for booking.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {doctors.map((doc) => {
              const isSelected = doc.id === selectedDoctorId;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all
                    ${isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-white hover:border-muted-foreground/30 hover:bg-muted/20'}`}
                >
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #1E3A5F, #2d6a9f)' }}
                  >
                    {doc.name ? doc.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : 'DR'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">Dr. {doc.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{doc.specialization ?? 'General Medicine'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 2. Date & Time Selection ── */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">2. Select Date & Time Slot</h3>
            <p className="text-xs text-muted-foreground">Pick an upcoming date and time slot</p>
          </div>
        </div>

        {/* Date pills */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">Select Date</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {nextDays.map((d) => {
              const dStr = format(d, 'yyyy-MM-dd');
              const isSel = dStr === selectedDateStr;
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => setSelectedDateStr(dStr)}
                  className={`shrink-0 flex flex-col items-center px-3.5 py-2 rounded-xl border text-center transition-all
                    ${isSel
                      ? 'border-primary bg-primary text-white font-semibold shadow-sm'
                      : 'border-border bg-white text-foreground hover:bg-muted/30'}`}
                >
                  <span className={`text-[10px] uppercase font-bold ${isSel ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {format(d, 'EEE')}
                  </span>
                  <span className="text-sm font-bold leading-none mt-1">
                    {format(d, 'MMM d')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom date fallback */}
        <div className="pt-1">
          <input
            type="date"
            min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
            value={selectedDateStr}
            onChange={(e) => setSelectedDateStr(e.target.value)}
            className={`${inputCls} max-w-xs`}
          />
        </div>

        {/* Time slots */}
        <div className="pt-2 border-t border-border">
          <label className="block text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Select Time Slot
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {TIME_SLOTS.map((slot) => {
              const isSel = slot === selectedTimeSlot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedTimeSlot(slot)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all text-center
                    ${isSel
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-border bg-white text-foreground hover:bg-muted/30'}`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. Reason for Visit ── */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border">
          <div className="h-8 w-8 rounded-xl bg-purple-50 flex items-center justify-center">
            <FileText className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">3. Reason for Visit (Optional)</h3>
            <p className="text-xs text-muted-foreground">Describe your symptoms or reason for appointment</p>
          </div>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Routine checkup, Follow-up consultation, Persistent headache..."
          rows={3}
          className={`${inputCls} h-auto py-2.5 resize-none`}
        />
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Submit button */}
      <div className="flex items-center justify-between pt-2">
        <a
          href="/patient/appointments"
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </a>

        <button
          type="submit"
          disabled={isPending || !selectedDoctorId || !selectedDateStr || !selectedTimeSlot}
          className="h-11 px-8 rounded-xl text-sm font-bold text-white
            hover:opacity-90 transition-opacity disabled:opacity-50
            flex items-center gap-2 shadow-sm"
          style={{ backgroundColor: '#1E3A5F' }}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? 'Booking Appointment...' : 'Confirm Appointment'}
        </button>
      </div>
    </form>
  );
}
