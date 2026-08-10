'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
 Search, ArrowLeft, UserPlus,
 AlertCircle, ChevronDown, Info,
 Loader2, CheckCircle2,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import { bookAppointment } from '@/server/actions/appointments.actions';
import { searchPatients } from '@/server/actions/patients.actions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doctor {
 id:       string;
 name:      string | null;
 specialization: string;
}

interface Patient {
 id:  string;
 name: string;
 phone: string;
 dob:  string | null;
 gender: string;
}

interface Props {
 doctors:  Doctor[];
 adminName: string;
}

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function buildSlots(): string[] {
 const slots: string[] = [];
 for (let h = 8; h < 18; h++) {
  for (const m of [0, 30]) {
   slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
 }
 return slots;
}

const ALL_SLOTS = buildSlots();

function fmtSlot(t: string) {
 const [h, m] = t.split(':').map(Number);
 const ap = h >= 12 ? 'PM' : 'AM';
 const h12 = h % 12 || 12;
 return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function todayISO() {
 return new Date().toISOString().split('T')[0];
}

function getInitials(name: string | null | undefined) {
 if (!name) return '?';
 return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewAppointmentForm({ doctors, adminName }: Props) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();

 // Patient search
 const [patientQuery,  setPatientQuery]  = useState('');
 const [patientResults, setPatientResults] = useState<Patient[]>([]);
 const [searching,   setSearching]   = useState(false);
 const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
 const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 // Form fields
 const [doctorId,  setDoctorId]  = useState(doctors[0]?.id ?? '');
 const [date,    setDate]    = useState(todayISO());
 const [slotTime,  setSlotTime]  = useState('');
 const [reason,   setReason]   = useState('');
 const [note,    setNote]    = useState('');

 // Feedback
 const [slotError, setSlotError] = useState<string | null>(null);
 const [success,  setSuccess]  = useState(false);

 const isToday = date === todayISO();

 // Debounced patient search
 useEffect(() => {
  if (patientQuery.trim().length < 2) {
   setPatientResults([]);
   return;
  }
  if (searchRef.current) clearTimeout(searchRef.current);
  setSearching(true);
  searchRef.current = setTimeout(async () => {
   try {
    const res = await searchPatients(patientQuery);
    setPatientResults((res as Patient[]).slice(0, 6));
   } catch {
    setPatientResults([]);
   } finally {
    setSearching(false);
   }
  }, 300);
 }, [patientQuery]);

 // ── Submit ────────────────────────────────────────────────────────────────
 function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSlotError(null);

  if (!selectedPatient) { setSlotError('Please select a patient.'); return; }
  if (!doctorId)    { setSlotError('Please select a doctor.');  return; }
  if (!slotTime)    { setSlotError('Please select a time slot.'); return; }

  const scheduledAt = new Date(`${date}T${slotTime}:00`).toISOString();

  startTransition(async () => {
   try {
    await bookAppointment({
     patientId:  selectedPatient.id,
     doctorId,
     scheduledAt,
     reason:   reason || undefined,
    });
    setSuccess(true);
    setTimeout(() => router.push('/admin/appointments'), 1200);
   } catch (err) {
    setSlotError(
     err instanceof Error
      ? err.message
      : 'Booking failed. Please try again.',
    );
   }
  });
 }

 const selectedDoctor = doctors.find((d) => d.id === doctorId);

 return (
  <div className="min-h-full bg-[#f0f7f3]">

   {/* ── Top bar ── */}
   <div className="bg-white border-b border-border px-6 py-3
    flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-sm">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
      text-muted-foreground" />
     <input type="text" placeholder="Search patients, records..."
      className="w-full h-9 pl-9 pr-4 border border-border
       bg-muted/40 text-sm placeholder:text-muted-foreground
       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white" />
    </div>
    <div className="flex items-center gap-2.5">
     <NotificationBell />
     <div className="pl-2.5 border-l border-border flex items-center gap-2">
      <div className="text-right hidden sm:block">
       <p className="text-sm font-semibold text-foreground leading-none">
        {adminName}
       </p>
       <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
        System Administrator
       </p>
      </div>
      <div className="h-8 w-8 bg-primary flex items-center
       justify-center text-xs font-bold text-white shrink-0">
       {getInitials(adminName)}
      </div>
     </div>
    </div>
   </div>

   {/* ── Page body ── */}
   <div className="px-6 py-5 max-w-2xl mx-auto">

    {/* Back + title */}
    <div className="mb-5">
     <Link href="/admin/appointments"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
       hover:text-foreground transition-colors mb-2">
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to Appointments
     </Link>
     <h1 className="text-2xl font-bold text-foreground">New Appointment</h1>
    </div>

    {/* Form card */}
    <form onSubmit={handleSubmit}
     className="bg-white border border-border p-6 shadow-sm mb-4">

     {/* ── Select Patient ── */}
     <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
       <label className="text-sm font-semibold text-foreground">
        Select Patient
       </label>
       <Link href="/receptionist/patients/new"
        className="flex items-center gap-1 text-xs font-semibold text-primary
         hover:underline">
        <UserPlus className="h-3.5 w-3.5" />
        Register New Patient
       </Link>
      </div>

      {/* Search input */}
      {!selectedPatient ? (
       <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
         text-muted-foreground pointer-events-none" />
        <input
         type="text"
         value={patientQuery}
         onChange={(e) => setPatientQuery(e.target.value)}
         placeholder="Search patient by name or ID"
         className="w-full h-11 pl-10 pr-4 border border-border
          bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/60
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
          transition-colors"
        />
        {searching && (
         <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2
          h-4 w-4 text-muted-foreground animate-spin" />
        )}

        {/* Dropdown results */}
        {patientResults.length > 0 && (
         <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white
          border border-border shadow-lg overflow-hidden">
          {patientResults.map((p) => (
           <button
            key={p.id}
            type="button"
            onClick={() => {
             setSelectedPatient(p);
             setPatientQuery('');
             setPatientResults([]);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left
             hover:bg-muted transition-colors border-b border-border last:border-b-0"
           >
            <div className="h-8 w-8 bg-primary/10 text-primary
             flex items-center justify-center text-xs font-bold shrink-0">
             {getInitials(p.name)}
            </div>
            <div>
             <p className="text-sm font-semibold text-foreground">{p.name}</p>
             <p className="text-xs text-muted-foreground">{p.phone}</p>
            </div>
           </button>
          ))}
         </div>
        )}
       </div>
      ) : (
       /* Selected patient chip */
       <div className="flex items-center gap-3 p-3 
        bg-primary/5 border border-primary/15">
        <div className="h-9 w-9 bg-primary text-white
         flex items-center justify-center text-xs font-bold shrink-0">
         {getInitials(selectedPatient.name)}
        </div>
        <div className="flex-1 min-w-0">
         <p className="text-sm font-bold text-foreground">{selectedPatient.name}</p>
         <p className="text-xs text-muted-foreground">{selectedPatient.phone}</p>
        </div>
        <button
         type="button"
         onClick={() => setSelectedPatient(null)}
         className="text-xs text-muted-foreground hover:text-red-500
          transition-colors shrink-0"
        >
         Change
        </button>
       </div>
      )}
     </div>

     <div className="border-t border-border my-5" />

     {/* ── Doctor + Date ── */}
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
      <div>
       <label className="block text-sm font-semibold text-foreground mb-2">
        Consulting Doctor
       </label>
       <div className="relative">
        <select
         value={doctorId}
         onChange={(e) => { setDoctorId(e.target.value); setSlotTime(''); }}
         className="w-full h-11 pl-3 pr-9 border border-border
          bg-muted/30 text-sm text-foreground appearance-none
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
        >
         <option value="">Select Doctor</option>
         {doctors.map((d) => (
          <option key={d.id} value={d.id}>
           Dr. {d.name}
          </option>
         ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2
         -translate-y-1/2 h-4 w-4 text-muted-foreground" />
       </div>
       {selectedDoctor && (
        <p className="text-xs text-muted-foreground mt-1.5">
         {selectedDoctor.specialization}
        </p>
       )}
      </div>

      <div>
       <label className="block text-sm font-semibold text-foreground mb-2">
        Appointment Date
       </label>
       <input
        type="date"
        value={date}
        min={todayISO()}
        onChange={(e) => { setDate(e.target.value); setSlotTime(''); }}
        className="w-full h-11 px-3 border border-border
         bg-muted/30 text-sm text-foreground
         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
       />
      </div>
     </div>

     {/* ── Available Time Slots ── */}
     <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
       <label className="text-sm font-semibold text-foreground">
        Available Time Slots
       </label>
       <span className="text-xs text-muted-foreground">
        Showing slots for {isToday ? 'Today' : date}
       </span>
      </div>

      <div className="grid grid-cols-6 gap-2">
       {ALL_SLOTS.map((slot) => {
        const isPast = isToday &&
         slot < new Date().toTimeString().slice(0, 5);
        const isSelected = slot === slotTime;

        return (
         <button
          key={slot}
          type="button"
          disabled={isPast}
          onClick={() => {
           setSlotTime(slot);
           setSlotError(null);
          }}
          className={`h-10 text-xs font-semibold border
           transition-colors
           ${isPast
            ? 'opacity-30 cursor-not-allowed bg-muted text-muted-foreground border-border'
            : isSelected
             ? 'bg-primary text-primary-foreground border-primary shadow-sm'
             : 'bg-white text-foreground border-border hover:border-primary/40 hover:bg-primary/5'}`}
         >
          {fmtSlot(slot)}
         </button>
        );
       })}
      </div>

      {/* Slot conflict error */}
      {slotError && slotError.includes('slot') && (
       <div className="mt-3 flex items-start gap-2 
        bg-red-50 border border-red-200 px-3 py-2.5">
        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
        <p className="text-xs text-red-600">{slotError}</p>
       </div>
      )}
     </div>

     {/* General error */}
     {slotError && !slotError.includes('slot') && (
      <div className="mb-5 flex items-start gap-2 
       bg-red-50 border border-red-200 px-3 py-2.5">
       <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
       <p className="text-xs text-red-600">{slotError}</p>
      </div>
     )}

     <div className="border-t border-border my-5" />

     {/* ── Reason + Note ── */}
     <div className="space-y-4 mb-6">
      <div>
       <label className="block text-sm font-semibold text-foreground mb-2">
        Reason for visit
       </label>
       <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Annual physical, follow-up, acute chest pain"
        className="w-full h-11 px-3 border border-border bg-muted/30
         text-sm text-foreground placeholder:text-muted-foreground/60
         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
       />
      </div>

      <div>
       <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-foreground">
         Internal note
        </label>
        <span className="text-xs text-muted-foreground">Optional</span>
       </div>
       <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add details for the medical staff..."
        rows={3}
        className="w-full px-3 py-2.5 border border-border bg-muted/30
         text-sm text-foreground placeholder:text-muted-foreground/60 resize-none
         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
       />
      </div>
     </div>

     <div className="border-t border-border pt-5" />

     {/* ── Footer actions ── */}
     <div className="flex items-center justify-between mt-5">
      <Link href="/admin/appointments"
       className="text-sm font-medium text-muted-foreground hover:text-foreground
        transition-colors">
       Cancel
      </Link>

      <button
       type="submit"
       disabled={isPending || success}
       className="h-11 px-8 text-sm font-bold text-white
        hover:opacity-90 transition-all disabled:opacity-60
        disabled:cursor-not-allowed flex items-center gap-2"
       style={{ backgroundColor: '#01411C' }}
      >
       {success ? (
        <>
         <CheckCircle2 className="h-4 w-4" />
         Booked!
        </>
       ) : isPending ? (
        <>
         <Loader2 className="h-4 w-4 animate-spin" />
         Booking...
        </>
       ) : (
        'Book Appointment'
       )}
      </button>
     </div>
    </form>

    {/* ── Scheduling Policy card ── */}
    <div className="bg-white border border-border p-4 shadow-sm
     flex items-start gap-3">
     <div className="h-8 w-8 bg-muted flex items-center
      justify-center shrink-0 mt-0.5">
      <Info className="h-4 w-4 text-muted-foreground" />
     </div>
     <div>
      <p className="text-sm font-bold text-foreground">Scheduling Policy</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
       Confirmation emails and SMS alerts are sent automatically upon booking.
       Cancellations within 24 hours of the appointment time require
       administrative override.
      </p>
     </div>
    </div>
   </div>
  </div>
 );
}
