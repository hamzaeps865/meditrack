import { auth } from '@/server/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/server/db';
import {
 appointments, doctors, patients, users, visits,
} from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';
import Link from 'next/link';
import {
 ArrowLeft, ChevronRight, Search,
 User, Calendar, Clock, AlertTriangle,
 CheckCircle2, Activity, Phone, Mail,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import UpdateStatusButton from '@/components/receptionist/update-status-button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
 if (!name) return '?';
 return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const statusConfig: Record<string, { label: string; badge: string; dot: string }> = {
 scheduled:  { label: 'Scheduled',  badge: 'bg-emerald-100 text-emerald-700',    dot: 'bg-emerald-500'  },
 checked_in: { label: 'Checked-in', badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500'  },
 in_progress: { label: 'In Progress', badge: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-500' },
 completed:  { label: 'Completed',  badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
 cancelled:  { label: 'Cancelled',  badge: 'bg-red-100 text-red-600',     dot: 'bg-red-500'   },
 no_show:   { label: 'No-show',   badge: 'bg-muted text-emerald-800/60',    dot: 'bg-muted-foreground'  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReceptionistAppointmentDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const session = await auth();
 if (!session || session.user.role !== 'receptionist') redirect('/login');

 const { id } = await params;

 // Appointment with full joins
 const [appt] = await db
  .select({
   id:     appointments.id,
   scheduledAt: appointments.scheduledAt,
   status:   appointments.status,
   reason:   appointments.reason,
   createdAt:  appointments.createdAt,
   patientId:  appointments.patientId,
   doctorId:  appointments.doctorId,
   createdBy:  appointments.createdBy,
  })
  .from(appointments)
  .where(eq(appointments.id, id));

 if (!appt) notFound();

 // Patient
 const [patient] = await db
  .select()
  .from(patients)
  .where(eq(patients.id, appt.patientId));

 // Doctor + user name
 const [doctorRow] = await db
  .select({
   id:       doctors.id,
   specialization: doctors.specialization,
   name:      users.name,
  })
  .from(doctors)
  .leftJoin(users, eq(doctors.userId, users.id))
  .where(eq(doctors.id, appt.doctorId));

 // Booked by
 const [bookedBy] = await db
  .select({ name: users.name, role: users.role })
  .from(users)
  .where(eq(users.id, appt.createdBy));

 // Visit (read-only for receptionist)
 const [visitRow] = await db
  .select({
   chiefComplaint: visits.chiefComplaint,
   diagnosis:   visits.diagnosis,
   vitalsBp:    visits.vitalsBp,
   vitalsTemp:   visits.vitalsTemp,
   vitalsWeight:  visits.vitalsWeight,
  })
  .from(visits)
  .where(eq(visits.appointmentId, id));

 const cfg     = statusConfig[appt.status] ?? statusConfig.scheduled;
 const dobDate   = patient?.dob ? new Date(patient.dob) : null;
 const age     = dobDate
  ? Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  : null;
 const allergyList = patient?.allergies
  ? patient.allergies.split(',').map((a) => a.trim()).filter(Boolean)
  : [];

 // Which status transitions can the receptionist make?
 const nextStatuses: { label: string; status: string; style: string }[] = [];
 if (appt.status === 'scheduled') {
  nextStatuses.push({
   label: 'Check In Patient',
   status: 'checked_in',
   style: 'bg-amber-500 text-white hover:bg-amber-600',
  });
  nextStatuses.push({
   label: 'Mark No-show',
   status: 'no_show',
   style: 'bg-muted text-foreground hover:bg-muted-foreground/60',
  });
  nextStatuses.push({
   label: 'Cancel',
   status: 'cancelled',
   style: 'bg-red-100 text-red-600 hover:bg-red-200',
  });
 }
 if (appt.status === 'checked_in') {
  nextStatuses.push({
   label: 'Cancel',
   status: 'cancelled',
   style: 'bg-red-100 text-red-600 hover:bg-red-200',
  });
 }

 return (
  <div className="min-h-full bg-[#f0f7f3]">

   {/* ── Top bar ── */}
   <div className="bg-white border-b border-border px-6 py-3
    flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-md">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
      text-muted-foreground" />
     <input type="text" placeholder="Search patients, doctors, or records..."
      className="w-full h-9 pl-9 pr-4 border border-border
       bg-muted/40 text-sm placeholder:text-muted-foreground
       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white" />
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-5 max-w-4xl mx-auto">

    {/* Breadcrumb */}
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
     <Link href="/receptionist/appointments"
      className="flex items-center gap-1.5 hover:text-foreground transition-colors">
      <ArrowLeft className="h-3.5 w-3.5" />
      Appointments
     </Link>
     <ChevronRight className="h-3.5 w-3.5" />
     <span className="text-foreground font-medium">
      {patient?.name ?? 'Appointment'} — {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
     </span>
    </div>

    {/* Header card */}
    <div className="bg-white border border-border p-5 shadow-sm mb-4">
     <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
       <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">
         {patient?.name ?? '—'}
        </h1>
        <span className={`px-2.5 py-1 text-xs font-bold ${cfg.badge}`}>
         {cfg.label}
        </span>
       </div>
       <p className="text-sm text-muted-foreground mt-1">
        {age !== null && <span>{age} yrs · </span>}
        {patient?.gender && <span className="capitalize">{patient.gender} · </span>}
        {format(new Date(appt.scheduledAt), 'MMMM d, yyyy')}
        {' at '}
        {format(new Date(appt.scheduledAt), 'hh:mm a')}
       </p>
       {appt.reason && (
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
         {appt.reason}
        </p>
       )}
      </div>

      {/* Status action buttons */}
      {nextStatuses.length > 0 && (
       <div className="flex flex-wrap gap-2">
        {nextStatuses.map((ns) => (
         <UpdateStatusButton
          key={ns.status}
          appointmentId={appt.id}
          newStatus={ns.status}
          label={ns.label}
          style={ns.style}
         />
        ))}
       </div>
      )}
     </div>
    </div>

    {/* Two-column */}
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">

     {/* LEFT sidebar */}
     <div className="space-y-4">

      {/* Patient info */}
      <div className="bg-white border border-border p-4 shadow-sm">
       <div className="flex items-center gap-2 mb-3">
        <User className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-widest
         text-muted-foreground">Patient</h3>
       </div>
       <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 bg-primary/10 text-primary
         flex items-center justify-center text-xs font-bold shrink-0">
         {getInitials(patient?.name)}
        </div>
        <div>
         <p className="text-sm font-semibold text-foreground">
          {patient?.name ?? '—'}
         </p>
         <p className="text-xs text-muted-foreground">{patient?.phone}</p>
        </div>
       </div>
       {patient && (
        <Link href={`/receptionist/patients/${patient.id}`}
         className="w-full flex items-center justify-center h-8 
          border border-border text-xs font-medium text-foreground
          hover:bg-muted transition-colors">
         View Patient Profile
        </Link>
       )}
      </div>

      {/* Doctor info */}
      <div className="bg-white border border-border p-4 shadow-sm">
       <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-widest
         text-muted-foreground">Doctor</h3>
       </div>
       <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 bg-emerald-100 text-emerald-700
         flex items-center justify-center text-xs font-bold shrink-0">
         {getInitials(doctorRow?.name)}
        </div>
        <div>
         <p className="text-sm font-semibold text-foreground">
          Dr. {doctorRow?.name ?? '—'}
         </p>
         <p className="text-xs text-muted-foreground">
          {doctorRow?.specialization}
         </p>
        </div>
       </div>
      </div>

      {/* Booking info */}
      <div className="bg-white border border-border p-4 shadow-sm">
       <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-widest
         text-muted-foreground">Booking</h3>
       </div>
       <div className="space-y-2">
        {[
         { label: 'Booked By', value: bookedBy?.name ?? '—' },
         { label: 'Role',   value: bookedBy?.role ?? '—' },
         { label: 'Created',  value: format(new Date(appt.createdAt), 'MMM d, yyyy') },
         { label: 'Appt ID',  value: id.slice(0, 8).toUpperCase() },
        ].map((r) => (
         <div key={r.label}
          className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="font-medium text-foreground capitalize truncate">
           {r.value}
          </span>
         </div>
        ))}
       </div>
      </div>

      {/* Safety info */}
      {(allergyList.length > 0 || patient?.bloodGroup) && (
       <div className="bg-white border border-red-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
         <AlertTriangle className="h-4 w-4 text-red-500" />
         <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-500">
          Safety Info
         </h3>
        </div>
        {allergyList.length > 0 && (
         <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide
           text-muted-foreground mb-1.5">Allergies</p>
          <div className="flex flex-wrap gap-1">
           {allergyList.map((a) => (
            <span key={a} className="px-2 py-0.5 bg-red-50
             border border-red-200 text-[10px] font-medium text-red-600">
             {a}
            </span>
           ))}
          </div>
         </div>
        )}
        {patient?.bloodGroup && (
         <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">
           Blood Group
          </span>
          <span className="text-sm font-bold text-foreground">
           {patient.bloodGroup}
          </span>
         </div>
        )}
       </div>
      )}
     </div>

     {/* RIGHT column */}
     <div className="space-y-4">

      {/* Appointment summary */}
      <div className="bg-white border border-border p-5 shadow-sm">
       <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
         Appointment Details
        </h2>
       </div>
       <div className="grid grid-cols-2 gap-4">
        {[
         { label: 'Date',    value: format(new Date(appt.scheduledAt), 'MMMM d, yyyy') },
         { label: 'Time',    value: format(new Date(appt.scheduledAt), 'hh:mm a') },
         { label: 'Doctor',   value: doctorRow ? `Dr. ${doctorRow.name}` : '—' },
         { label: 'Speciality', value: doctorRow?.specialization ?? '—' },
         { label: 'Status',   value: cfg.label },
         { label: 'Reason',   value: appt.reason ?? 'Not specified' },
        ].map((f) => (
         <div key={f.label}>
          <p className="text-[10px] font-semibold uppercase tracking-widest
           text-muted-foreground mb-1">
           {f.label}
          </p>
          <p className="text-sm text-foreground">{f.value}</p>
         </div>
        ))}
       </div>
      </div>

      {/* Visit record (read-only for receptionist) */}
      <div className="bg-white border border-border p-5 shadow-sm">
       <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
         <Activity className="h-4 w-4 text-primary" />
         <h2 className="text-sm font-semibold text-foreground">
          Visit Record
         </h2>
        </div>
        {visitRow ? (
         <span className="px-2 py-0.5 bg-emerald-50
          text-emerald-700 text-[10px] font-bold border border-emerald-100">
          Recorded
         </span>
        ) : (
         <span className="px-2 py-0.5 bg-muted
          text-muted-foreground text-[10px] font-bold">
          Pending
         </span>
        )}
       </div>

       {!visitRow ? (
        <p className="text-sm text-muted-foreground text-center py-6">
         {appt.status === 'completed'
          ? 'No visit record was saved for this appointment.'
          : 'Visit notes will appear here once the doctor starts the consultation.'}
        </p>
       ) : (
        <div className="space-y-4">
         {/* Vitals */}
         {(visitRow.vitalsBp || visitRow.vitalsTemp || visitRow.vitalsWeight) && (
          <div className="grid grid-cols-3 gap-3">
           {[
            { label: 'Blood Pressure', value: visitRow.vitalsBp,   unit: 'mmHg' },
            { label: 'Temperature',  value: visitRow.vitalsTemp,  unit: '°F'  },
            { label: 'Weight',     value: visitRow.vitalsWeight, unit: 'lbs' },
           ].map((v) => v.value ? (
            <div key={v.label}
             className=" bg-muted/40 px-3 py-2.5 text-center">
             <p className="text-[10px] text-muted-foreground">{v.label}</p>
             <p className="text-sm font-bold text-foreground mt-0.5">
              {v.value}
              <span className="text-[10px] font-normal
               text-muted-foreground ml-1">{v.unit}</span>
             </p>
            </div>
           ) : null)}
          </div>
         )}

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
           <p className="text-[10px] font-semibold uppercase tracking-widest
            text-muted-foreground mb-1">Chief Complaint</p>
           <p className="text-sm text-foreground">
            {visitRow.chiefComplaint ?? <em className="text-muted-foreground">—</em>}
           </p>
          </div>
          <div>
           <p className="text-[10px] font-semibold uppercase tracking-widest
            text-muted-foreground mb-1">Diagnosis</p>
           <p className="text-sm text-foreground">
            {visitRow.diagnosis ?? <em className="text-muted-foreground">—</em>}
           </p>
          </div>
         </div>
        </div>
       )}
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
