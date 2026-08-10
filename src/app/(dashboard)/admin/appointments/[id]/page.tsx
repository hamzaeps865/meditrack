import { auth } from '@/server/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/server/db';
import {
 appointments, doctors, patients, users, visits, prescriptions, prescriptionItems,
} from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';
import Link from 'next/link';
import {
 ArrowLeft, Search, Calendar, User,
 Clock, ClipboardList, Pill, ChevronRight,
 AlertTriangle, Activity,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import RescheduleModal from '@/components/admin/reschedule-modal';
import CancelAppointmentButton from '@/components/shared/cancel-appointment-button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
 if (!name) return '?';
 return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const statusConfig: Record<string, { badge: string; label: string; dot: string }> = {
 scheduled:  { badge: 'bg-emerald-100 text-emerald-700',    label: 'Scheduled',  dot: 'bg-emerald-500'  },
 checked_in: { badge: 'bg-amber-100 text-amber-700',   label: 'Checked-in', dot: 'bg-amber-500'  },
 in_progress: { badge: 'bg-orange-100 text-orange-700',  label: 'In Progress', dot: 'bg-orange-500' },
 completed:  { badge: 'bg-emerald-100 text-emerald-700', label: 'Completed',  dot: 'bg-emerald-500' },
 cancelled:  { badge: 'bg-red-100 text-red-600',     label: 'Cancelled',  dot: 'bg-red-500'   },
 no_show:   { badge: 'bg-muted text-emerald-800/60',    label: 'No-show',   dot: 'bg-muted-foreground'  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminAppointmentDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const session = await auth();
 if (!session || session.user.role !== 'admin') redirect('/login');

 const { id } = await params;

 // Load appointment with patient + doctor + bookedBy
 const [appt] = await db
  .select({
   id:      appointments.id,
   scheduledAt:  appointments.scheduledAt,
   status:    appointments.status,
   reason:    appointments.reason,
   createdAt:   appointments.createdAt,
   patientId:   appointments.patientId,
   doctorId:   appointments.doctorId,
   createdBy:   appointments.createdBy,
  })
  .from(appointments)
  .where(eq(appointments.id, id));

 if (!appt) notFound();

 // Patient
 const [patient] = await db
  .select()
  .from(patients)
  .where(eq(patients.id, appt.patientId));

 // Doctor + doctor's user (for name)
 const [doctorRow] = await db
  .select({
   id:       doctors.id,
   specialization: doctors.specialization,
   licenseNumber: doctors.licenseNumber,
   name:      users.name,
   email:     users.email,
  })
  .from(doctors)
  .leftJoin(users, eq(doctors.userId, users.id))
  .where(eq(doctors.id, appt.doctorId));

 // Booked by user
 const [bookedByUser] = await db
  .select({ name: users.name, email: users.email, role: users.role })
  .from(users)
  .where(eq(users.id, appt.createdBy));

 // Visit record (if exists)
 const [visitRow] = await db
  .select()
  .from(visits)
  .where(eq(visits.appointmentId, id));

 const allDoctors = await db.select({ id: doctors.id, name: users.name }).from(doctors).leftJoin(users, eq(doctors.userId, users.id));

  // Prescription items (if visit exists)
 let rxItems: { medicineName: string; dosage: string; frequency: string; duration: string; notes: string | null }[] = [];
 if (visitRow) {
  const [rxHeader] = await db
   .select()
   .from(prescriptions)
   .where(eq(prescriptions.visitId, visitRow.id))
   .limit(1);

  if (rxHeader) {
   rxItems = await db
    .select({
     medicineName: prescriptionItems.medicineName,
     dosage:    prescriptionItems.dosage,
     frequency:  prescriptionItems.frequency,
     duration:   prescriptionItems.duration,
     notes:    prescriptionItems.notes,
    })
    .from(prescriptionItems)
    .where(eq(prescriptionItems.prescriptionId, rxHeader.id));
  }
 }

 const cfg     = statusConfig[appt.status] ?? statusConfig.scheduled;
 const dobDate   = patient?.dob ? new Date(patient.dob) : null;
 const age     = dobDate
  ? Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  : null;
 const patientCode = patient ? `PAT-${patient.id.slice(0, 5).toUpperCase()}` : '—';
 const allergyList = patient?.allergies
  ? patient.allergies.split(',').map((a) => a.trim()).filter(Boolean)
  : [];

 return (
  <div className="min-h-full bg-[#f0f7f3]">

   {/* ── Top bar ── */}
   <div className="bg-white border-b border-border px-6 py-3
    flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-sm">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
      text-muted-foreground" />
     <input type="text" placeholder="Search..."
      className="w-full h-9 pl-9 pr-4 border border-border
       bg-muted/40 text-sm placeholder:text-muted-foreground
       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white" />
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-5 max-w-4xl mx-auto">

    {/* Breadcrumb */}
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
     <Link href="/admin/appointments"
      className="flex items-center gap-1.5 hover:text-foreground transition-colors">
      <ArrowLeft className="h-3.5 w-3.5" />
      Appointments
     </Link>
     <ChevronRight className="h-3.5 w-3.5" />
     <span className="text-foreground font-medium">
      {patient?.name ?? 'Appointment'} — {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
     </span>
    </div>

    {/* ── Header card ── */}
    <div className="premium-card premium-card-pad mb-4">
     <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
       <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">
         {patient?.name ?? '—'}
        </h1>
        <span className={`px-2.5 py-1 text-xs font-semibold
         ${cfg.badge}`}>
         {cfg.label}
        </span>
       </div>
       <p className="text-sm text-muted-foreground mt-1">
        {age !== null && <span>{age} yrs · </span>}
        {patient?.gender && <span className="capitalize">{patient.gender} · </span>}
        ID: #{patientCode}
        {patient?.bloodGroup && (
         <span className="ml-2 text-red-500 font-semibold">
          {patient.bloodGroup}
         </span>
        )}
       </p>
      </div>

      <div className="text-right">
       <p className="text-sm font-semibold text-foreground">
        {format(new Date(appt.scheduledAt), 'MMMM d, yyyy')}
       </p>
       <p className="text-sm text-muted-foreground">
        {format(new Date(appt.scheduledAt), 'hh:mm a')}
       </p>
       <div className="mt-3 flex items-center justify-end gap-2">
        <RescheduleModal appointmentId={id} currentScheduledAt={appt.scheduledAt.toISOString()} currentDoctorId={appt.doctorId} doctors={allDoctors.map(d => ({ id: d.id, name: d.name || '' }))} variant="button" triggerLabel="Reschedule Appointment" />
        <CancelAppointmentButton appointmentId={id} />
       </div>
       {appt.reason && (
        <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
         {appt.reason}
        </p>
       )}
      </div>
     </div>
    </div>

    {/* ── Two-column layout ── */}
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">

     {/* LEFT sidebar */}
     <div className="space-y-4">

      {/* Patient info */}
      <div className="bg-white border border-border p-4 shadow-sm">
       <div className="flex items-center gap-2 mb-3">
        <User className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-widest
         text-muted-foreground">
         Patient
        </h3>
       </div>
       <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 bg-primary/10 text-primary
         flex items-center justify-center text-xs font-bold shrink-0">
         {getInitials(patient?.name)}
        </div>
        <div className="min-w-0">
         <p className="text-sm font-semibold text-foreground truncate">
          {patient?.name ?? '—'}
         </p>
         <p className="text-xs text-muted-foreground">{patient?.phone}</p>
        </div>
       </div>
       {patient && (
        <Link href={`/admin/patients/${patient.id}`}
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
         text-muted-foreground">
         Doctor
        </h3>
       </div>
       <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 bg-emerald-100 text-emerald-700
         flex items-center justify-center text-xs font-bold shrink-0">
         {getInitials(doctorRow?.name)}
        </div>
        <div className="min-w-0">
         <p className="text-sm font-semibold text-foreground truncate">
          Dr. {doctorRow?.name ?? '—'}
         </p>
         <p className="text-xs text-muted-foreground">
          {doctorRow?.specialization}
         </p>
        </div>
       </div>
       {doctorRow && (
        <Link href={`/admin/doctors/${appt.doctorId}`}
         className="w-full flex items-center justify-center h-8 
          border border-border text-xs font-medium text-foreground
          hover:bg-muted transition-colors">
         View Doctor Profile
        </Link>
       )}
      </div>

      {/* Booking info */}
      <div className="bg-white border border-border p-4 shadow-sm">
       <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-widest
         text-muted-foreground">
         Booking Info
        </h3>
       </div>
       <div className="space-y-2">
        {[
         { label: 'Booked By', value: bookedByUser?.name ?? '—' },
         { label: 'Role',    value: bookedByUser?.role ?? '—' },
         { label: 'Booked On', value: format(new Date(appt.createdAt), 'MMM d, yyyy') },
         { label: 'Appt. ID',  value: id.slice(0, 8).toUpperCase() },
        ].map((r) => (
         <div key={r.label} className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground shrink-0">
           {r.label}
          </span>
          <span className="text-xs font-medium text-foreground
           text-right capitalize truncate">
           {r.value}
          </span>
         </div>
        ))}
       </div>
      </div>

      {/* Safety Info */}
      {(allergyList.length > 0 || patient?.bloodGroup) && (
       <div className="bg-white border border-red-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
         <AlertTriangle className="h-4 w-4 text-red-500" />
         <h3 className="text-[10px] font-bold uppercase tracking-widest
          text-red-500">
          Safety Info
         </h3>
        </div>
        {allergyList.length > 0 && (
         <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide
           text-muted-foreground mb-1.5">
           Allergies
          </p>
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
         <div className="flex items-center justify-between pt-2
          border-t border-border">
          <span className="text-[10px] font-semibold uppercase
           tracking-wide text-muted-foreground">
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

      {/* Visit Record */}
      <div className="premium-card premium-card-pad">
       <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
         Visit Record
        </h2>
        {visitRow && (
         <span className="ml-auto px-2 py-0.5 bg-emerald-50
          text-emerald-700 text-[10px] font-bold">
          Recorded
         </span>
        )}
       </div>

       {!visitRow ? (
        <p className="text-sm text-muted-foreground text-center py-6">
         No visit record yet.
         {appt.status === 'scheduled' || appt.status === 'checked_in'
          ? ' The doctor will fill this during the consultation.'
          : ''}
        </p>
       ) : (
        <div className="space-y-4">
         {/* Vitals */}
         {(visitRow.vitalsBp || visitRow.vitalsTemp || visitRow.vitalsWeight) && (
          <div className="grid grid-cols-3 gap-3">
           {[
            { label: 'Blood Pressure', value: visitRow.vitalsBp,  unit: 'mmHg' },
            { label: 'Temperature',  value: visitRow.vitalsTemp, unit: '°F'  },
            { label: 'Weight',     value: visitRow.vitalsWeight, unit: 'lbs' },
           ].map((v) => v.value ? (
            <div key={v.label}
             className=" bg-muted/40 px-3 py-2.5 text-center">
             <p className="text-[10px] text-muted-foreground">{v.label}</p>
             <p className="text-sm font-bold text-foreground mt-0.5">
              {v.value}
              <span className="text-[10px] font-normal
               text-muted-foreground ml-1">
               {v.unit}
              </span>
             </p>
            </div>
           ) : null)}
          </div>
         )}

         {/* Clinical fields */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
           <p className="text-[10px] font-semibold uppercase tracking-widest
            text-muted-foreground mb-1">
            Chief Complaint
           </p>
           <p className="text-sm text-foreground">
            {visitRow.chiefComplaint ?? <em className="text-muted-foreground">—</em>}
           </p>
          </div>
          <div>
           <p className="text-[10px] font-semibold uppercase tracking-widest
            text-muted-foreground mb-1">
            Diagnosis
           </p>
           <p className="text-sm text-foreground">
            {visitRow.diagnosis ?? <em className="text-muted-foreground">—</em>}
           </p>
          </div>
          {visitRow.notes && (
           <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest
             text-muted-foreground mb-1">
             Clinical Notes
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
             {visitRow.notes}
            </p>
           </div>
          )}
         </div>
        </div>
       )}
      </div>

      {/* Prescriptions */}
      <div className="premium-card premium-card-pad">
       <div className="flex items-center gap-2 mb-4">
        <Pill className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
         Prescriptions
        </h2>
       </div>

       {rxItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
         No prescriptions recorded.
        </p>
       ) : (
        <div className="overflow-x-auto">
         <table className="w-full min-w-[400px]">
          <thead>
           <tr className="border-b border-border">
            {['Medication', 'Dosage', 'Frequency', 'Duration'].map((h) => (
             <th key={h}
              className="pb-2 pr-4 text-left text-[10px] font-bold
               uppercase tracking-widest text-muted-foreground">
              {h}
             </th>
            ))}
           </tr>
          </thead>
          <tbody className="divide-y divide-border">
           {rxItems.map((item, i) => (
            <tr key={i}>
             <td className="py-2.5 pr-4 text-sm font-semibold
              text-foreground">
              {item.medicineName}
             </td>
             <td className="py-2.5 pr-4 text-sm text-muted-foreground">
              {item.dosage}
             </td>
             <td className="py-2.5 pr-4 text-sm text-muted-foreground">
              {item.frequency}
             </td>
             <td className="py-2.5 text-sm text-muted-foreground">
              {item.duration}
             </td>
            </tr>
           ))}
          </tbody>
         </table>
        </div>
       )}
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
