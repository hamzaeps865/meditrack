import { auth } from '@/server/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/server/db';
import {
 patients, appointments, doctors, users, visits,
} from '@/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { format } from 'date-fns';
import {
 ArrowLeft, Search, ChevronRight,
 User, Phone, Mail, MapPin, AlertTriangle,
 CalendarClock, IdCard, Printer, Activity,
 FileText,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import EditPatientModal from '@/components/admin/edit-patient-modal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
 if (!name) return '?';
 return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const statusStyles: Record<string, string> = {
 scheduled:  'bg-emerald-50 text-emerald-700',
 checked_in: 'bg-amber-50 text-amber-700',
 in_progress: 'bg-orange-50 text-orange-700',
 completed:  'bg-emerald-50 text-emerald-700',
 cancelled:  'bg-red-50 text-red-600',
 no_show:   'bg-muted text-emerald-800/60',
};

const statusLabels: Record<string, string> = {
 scheduled: 'Scheduled', checked_in: 'Checked-in',
 in_progress: 'In Progress', completed: 'Completed',
 cancelled: 'Cancelled', no_show: 'No-show',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPatientProfilePage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const session = await auth();
 if (!session || session.user.role !== 'admin') redirect('/login');

 const { id } = await params;

 // Patient
 const [patient] = await db
  .select()
  .from(patients)
  .where(eq(patients.id, id));

 if (!patient || patient.deletedAt) notFound();

 // All appointments for this patient
 const allAppointments = await db
  .select({
   id:     appointments.id,
   scheduledAt: appointments.scheduledAt,
   status:   appointments.status,
   reason:   appointments.reason,
   doctorId:  appointments.doctorId,
  })
  .from(appointments)
  .where(eq(appointments.patientId, id))
  .orderBy(desc(appointments.scheduledAt));

 // Doctor name map
 const allDoctors = await db
  .select({ id: doctors.id, name: users.name })
  .from(doctors)
  .leftJoin(users, eq(doctors.userId, users.id));

 const doctorMap = Object.fromEntries(allDoctors.map((d) => [d.id, d.name ?? 'Unknown']));

 // Recent visits (last 3)
 const recentVisits = await db
  .select({
   id:       visits.id,
   createdAt:   visits.createdAt,
   diagnosis:   visits.diagnosis,
   chiefComplaint: visits.chiefComplaint,
   doctorId:    visits.doctorId,
  })
  .from(visits)
  .where(eq(visits.patientId, id))
  .orderBy(desc(visits.createdAt))
  .limit(3);

 // Who registered this patient
 const [registeredBy] = await db
  .select({ name: users.name })
  .from(users)
  .where(eq(users.id, patient.createdBy));

 const now     = new Date();
 const upcoming   = allAppointments.filter((a) => new Date(a.scheduledAt) >= now);
 const past     = allAppointments.filter((a) => new Date(a.scheduledAt) < now);
 const dobDate   = patient.dob ? new Date(patient.dob) : null;
 const age     = dobDate
  ? Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  : null;
 const patientCode = id.slice(0, 8).toUpperCase();
 const allergyList = patient.allergies
  ? patient.allergies.split(',').map((a) => a.trim()).filter(Boolean)
  : [];

 return (
  <div className="min-h-full bg-[#f0f7f3]">

   {/* ── Top bar ── */}
   <div className="bg-white border-b border-border px-6 py-3
    flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-md">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
      text-muted-foreground" />
     <input type="text" placeholder="Search patients, records..."
      className="w-full h-9 pl-9 pr-4 border border-border
       bg-muted/40 text-sm placeholder:text-muted-foreground
       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white" />
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-5 max-w-5xl mx-auto">

    {/* Breadcrumb */}
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
     <Link href="/admin/patients"
      className="flex items-center gap-1.5 hover:text-foreground transition-colors">
      <ArrowLeft className="h-3.5 w-3.5" />
      Patients
     </Link>
     <ChevronRight className="h-3.5 w-3.5" />
     <span className="text-foreground font-medium">{patient.name}</span>
    </div>

    {/* ── Patient header ── */}
    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
     <div className="flex items-center gap-4">
      <div className="h-14 w-14 bg-primary/10 text-primary
       flex items-center justify-center text-lg font-bold shrink-0">
       {getInitials(patient.name)}
      </div>
      <div>
       <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">{patient.name}</h1>
        <span className="inline-flex items-center gap-1 px-2 py-0.5
          bg-muted text-xs font-medium text-muted-foreground">
         <IdCard className="h-3 w-3" />
         ID: #{patientCode}
        </span>
        {patient.deletedAt === null ? (
         <span className="px-2 py-0.5 bg-emerald-50
          text-emerald-700 border border-emerald-100 text-[10px] font-bold">
          Active
         </span>
        ) : (
         <span className="px-2 py-0.5 bg-red-50
          text-red-600 border border-red-100 text-[10px] font-bold">
          Inactive
         </span>
        )}
       </div>
       <p className="text-sm text-muted-foreground mt-1">
        {age !== null && <span>Age {age} · </span>}
        {dobDate && <span>{format(dobDate, 'MM/dd/yyyy')} · </span>}
        <span className="capitalize">{patient.gender}</span>
        {patient.bloodGroup && (
         <span className="ml-2 text-red-500 font-semibold">
          {patient.bloodGroup}
         </span>
        )}
       </p>
      </div>
     </div>

     <div className="flex items-center gap-2">
      <EditPatientModal
       patientId={patient.id}
       initialName={patient.name}
       initialPhone={patient.phone}
       initialEmail={patient.email}
       initialAddress={patient.address}
       initialEmergencyContact={patient.emergencyContact}
       initialBloodGroup={patient.bloodGroup}
       initialAllergies={patient.allergies}
      />
      <Link href={`/admin/appointments/new?patientId=${id}`}
       className="flex items-center gap-1.5 h-9 px-4 text-sm
        font-bold text-white hover:opacity-90 transition-opacity"
       style={{ backgroundColor: '#01411C' }}>
       Book Appointment
      </Link>
     </div>
    </div>

    {/* ── Content grid ── */}
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

     {/* LEFT column */}
     <div className="space-y-4 min-w-0">

      {/* Demographics */}
      <div className="premium-card premium-card-pad">
       <div className="flex items-center gap-2 mb-4">
        <User className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Demographics</h2>
       </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
         <p className="flex items-center gap-1.5 text-xs text-muted-foreground
          uppercase tracking-wide">
          <Phone className="h-3 w-3" /> Phone
         </p>
         <p className="text-sm font-medium text-foreground mt-1">
          {patient.phone}
         </p>
        </div>
        <div>
         <p className="flex items-center gap-1.5 text-xs text-muted-foreground
          uppercase tracking-wide">
          <Mail className="h-3 w-3" /> Email
         </p>
         <p className="text-sm font-medium text-primary mt-1">
          {patient.email ?? '—'}
         </p>
        </div>
       </div>
       {patient.address && (
        <div className="mt-4">
         <p className="flex items-center gap-1.5 text-xs text-muted-foreground
          uppercase tracking-wide">
          <MapPin className="h-3 w-3" /> Address
         </p>
         <p className="text-sm font-medium text-foreground mt-1">
          {patient.address}
         </p>
        </div>
       )}
       <div className="mt-4 border border-border p-3">
        <p className="text-xs font-semibold text-foreground mb-1">
         Emergency Contact
        </p>
        <p className="text-sm text-foreground">
         {patient.emergencyContact ?? 'Not recorded'}
        </p>
       </div>
      </div>

      {/* Allergies & Conditions */}
      <div className="premium-card premium-card-pad">
       <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-foreground">
         Allergies &amp; Medical Info
        </h2>
       </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
         <p className="text-xs text-muted-foreground uppercase
          tracking-wide mb-2">
          Allergies
         </p>
         <div className="flex flex-wrap gap-1.5">
          {allergyList.length === 0 ? (
           <span className="text-sm text-muted-foreground">
            None recorded
           </span>
          ) : (
           allergyList.map((a) => (
            <span key={a} className="px-2.5 py-1 
             bg-red-50 text-red-600 text-xs font-medium border
             border-red-100">
             {a}
            </span>
           ))
          )}
         </div>
        </div>
        <div>
         <p className="text-xs text-muted-foreground uppercase
          tracking-wide mb-2">
          Blood Group
         </p>
         <span className="px-2.5 py-1 bg-primary/10
          text-primary text-xs font-semibold">
          {patient.bloodGroup ?? 'Unknown'}
         </span>
        </div>
       </div>
      </div>

      {/* Recent Visits */}
      {recentVisits.length > 0 && (
       <div className="bg-white border border-border
        overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4
         border-b border-border">
         <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
           Recent Visits
          </h2>
         </div>
        </div>
        <ul className="divide-y divide-border">
         {recentVisits.map((v) => (
          <li key={v.id}
           className="flex items-center gap-4 px-5 py-3.5
            hover:bg-muted/20 transition-colors">
           <div className="w-24 shrink-0">
            <p className="text-xs font-semibold text-primary">
             {format(new Date(v.createdAt), 'MMM d, yyyy')}
            </p>
           </div>
           <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">
             {v.diagnosis ?? v.chiefComplaint ?? 'No diagnosis recorded'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
             Dr. {doctorMap[v.doctorId] ?? 'Unknown'}
            </p>
           </div>
          </li>
         ))}
        </ul>
       </div>
      )}

      {/* Appointment History */}
      <div className="bg-white border border-border
       overflow-hidden shadow-sm">
       <div className="flex items-center justify-between px-5 py-4
        border-b border-border">
        <div className="flex items-center gap-2">
         <CalendarClock className="h-4 w-4 text-primary" />
         <h2 className="text-sm font-semibold text-foreground">
          Appointment History
         </h2>
        </div>
       </div>

       <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
         <thead>
          <tr className="border-b border-border bg-muted/20 text-left">
           {['Date', 'Time', 'Doctor', 'Status', 'Reason'].map((h) => (
            <th key={h}
             className="px-5 py-2.5 text-[10px] font-bold uppercase
              tracking-widest text-muted-foreground">
             {h}
            </th>
           ))}
          </tr>
         </thead>
         <tbody>
          {upcoming.length > 0 && (
           <>
            <tr>
             <td colSpan={5}
              className="px-5 py-1.5 bg-primary/5 text-[10px] font-bold
               text-primary uppercase tracking-wide">
              Upcoming
             </td>
            </tr>
            {upcoming.map((a) => (
             <tr key={a.id} className="border-b border-border
              hover:bg-muted/10 transition-colors">
              <td className="px-5 py-3 font-medium whitespace-nowrap">
               {format(new Date(a.scheduledAt), 'MMM d, yyyy')}
              </td>
              <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
               {format(new Date(a.scheduledAt), 'hh:mm a')}
              </td>
              <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
               {doctorMap[a.doctorId]
                ? `Dr. ${doctorMap[a.doctorId]}`
                : '—'}
              </td>
              <td className="px-5 py-3">
               <span className={`px-2 py-0.5 text-[10px]
                font-medium ${statusStyles[a.status]}`}>
                {statusLabels[a.status]}
               </span>
              </td>
              <td className="px-5 py-3 text-muted-foreground">
               {a.reason ?? '—'}
              </td>
             </tr>
            ))}
           </>
          )}
          {past.slice(0, 6).map((a, i) => (
           <tr key={a.id}
            className={`hover:bg-muted/10 transition-colors
             ${i < past.slice(0, 6).length - 1 ? 'border-b border-border' : ''}`}>
            <td className="px-5 py-3 font-medium whitespace-nowrap">
             {format(new Date(a.scheduledAt), 'MMM d, yyyy')}
            </td>
            <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
             {format(new Date(a.scheduledAt), 'hh:mm a')}
            </td>
            <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
             {doctorMap[a.doctorId]
              ? `Dr. ${doctorMap[a.doctorId]}`
              : '—'}
            </td>
            <td className="px-5 py-3">
             <span className={`px-2 py-0.5 text-[10px]
              font-medium ${statusStyles[a.status]}`}>
              {statusLabels[a.status]}
             </span>
            </td>
            <td className="px-5 py-3 text-muted-foreground">
             {a.reason ?? '—'}
            </td>
           </tr>
          ))}
          {allAppointments.length === 0 && (
           <tr>
            <td colSpan={5}
             className="px-5 py-8 text-center text-sm text-muted-foreground">
             No appointment history found.
            </td>
           </tr>
          )}
         </tbody>
        </table>
       </div>
      </div>
     </div>

     {/* RIGHT column */}
     <div className="space-y-4">

      {/* Registration Summary */}
      <div className=" p-5 text-white"
       style={{ backgroundColor: '#01411C' }}>
       <p className="text-[10px] font-semibold uppercase tracking-widest
        text-white/60 mb-3">
        Registration Summary
       </p>
       <div className="space-y-2.5">
        {[
         {
          label: 'Registered Since',
          value: format(new Date(patient.createdAt), 'MMM d, yyyy'),
         },
         {
          label: 'Registered By',
          value: registeredBy?.name ?? '—',
         },
         {
          label: 'Total Appointments',
          value: allAppointments.length,
         },
         {
          label: 'Last Appointment',
          value: past.length > 0
           ? format(new Date(past[0].scheduledAt), 'MMM d, yyyy')
           : 'None',
         },
        ].map((r) => (
         <div key={r.label}
          className="flex items-center justify-between text-sm">
          <span className="text-white/60">{r.label}</span>
          <span className="font-semibold">{r.value}</span>
         </div>
        ))}
       </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-border
       overflow-hidden shadow-sm">
       <p className="text-[10px] font-bold uppercase tracking-widest
        text-muted-foreground px-4 pt-4 pb-2">
        Quick Actions
       </p>
       {[
        {
         label: 'Book Appointment',
         icon: CalendarClock,
         href: `/admin/appointments/new?patientId=${id}`,
        },
        {
         label: 'View Audit Logs',
         icon: FileText,
         href: `/admin/audit-logs?recordId=${id}`,
        },
       ].map((action) => {
        const Icon = action.icon;
        return (
         <Link key={action.label} href={action.href}
          className="flex items-center justify-between gap-2 px-4 py-3
           text-sm text-foreground hover:bg-muted transition-colors">
          <span className="flex items-center gap-2.5">
           <Icon className="h-4 w-4 text-primary" />
           {action.label}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
         </Link>
        );
       })}
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
