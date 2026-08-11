import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/server/db';
import { appointments, patients } from '@/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getTriageForAppointment } from '@/server/actions/triage.actions';
import TriageForm from '@/components/nurse/triage-form';
import NotificationBell from '@/components/shared/notification-bell';
import { ArrowLeft, HeartPulse, AlertTriangle, Droplet } from 'lucide-react';

export default async function TriagePage({ params }: { params: Promise<{ appointmentId: string }> }) {
 const session = await auth();
 if (!session || (session.user.role !== 'nurse' && session.user.role !== 'admin')) {
  redirect('/login');
 }

 const { appointmentId } = await params;

 // Load the appointment + patient
 const [appt] = await db
  .select({
   id: appointments.id,
   patientId: appointments.patientId,
   patientName: patients.name,
   patientDob: patients.dob,
   patientGender: patients.gender,
   patientBloodGroup: patients.bloodGroup,
   patientAllergies: patients.allergies,
   reason: appointments.reason,
   isWalkIn: appointments.isWalkIn,
   createdAt: appointments.createdAt,
  })
  .from(appointments)
  .innerJoin(patients, eq(appointments.patientId, patients.id))
  .where(eq(appointments.id, appointmentId));

 if (!appt) {
  return (
   <div className="min-h-full flex items-center justify-center text-muted-foreground">
    <p className="text-sm">Appointment not found.</p>
   </div>
  );
 }

 // Check if already triaged
 const existingTriage = await getTriageForAppointment(appointmentId);

 const ageMs = Date.now() - new Date(appt.patientDob).getTime();
 const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   {/* Top bar */}
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
    <Link href="/nurse" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
     <ArrowLeft className="h-4 w-4" />
     Back to Queue
    </Link>
    <NotificationBell />
   </div>

   <div className="px-6 py-8 max-w-2xl mx-auto">
    {/* Patient header card */}
    <div className="bg-white border border-border p-5  mb-5">
     <div className="flex items-start gap-4">
      <div className="h-12 w-12 bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
       {appt.patientName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
      </div>
      <div className="flex-1">
       <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-lg font-bold text-foreground">{appt.patientName}</h1>
        {appt.isWalkIn && (
         <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700">WALK-IN</span>
        )}
       </div>
       <p className="text-sm text-muted-foreground capitalize mt-0.5">
        {appt.patientGender} · {age} years
        {appt.patientBloodGroup ? ` · ${appt.patientBloodGroup}` : ''}
       </p>
       {appt.reason && (
        <p className="text-xs text-muted-foreground/80 mt-1">Reason: {appt.reason}</p>
       )}
      </div>
     </div>

     {/* Safety flags */}
     {appt.patientAllergies && (
      <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2">
       <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
       <p className="text-xs text-amber-700 font-medium">Allergies: {appt.patientAllergies}</p>
      </div>
     )}
    </div>

    {/* Existing triage (if re-assessing) */}
    {existingTriage && (
     <div className="bg-white border border-border p-5  mb-5">
      <div className="flex items-center gap-2 mb-3">
       <HeartPulse className="h-4 w-4 text-emerald-700" />
       <h2 className="text-sm font-bold text-foreground">Previous Triage</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
       <div>
        <p className="text-xs text-muted-foreground">Severity</p>
        <p className="font-semibold capitalize text-foreground">{existingTriage.severity}</p>
       </div>
       <div>
        <p className="text-xs text-muted-foreground">Complaint</p>
        <p className="font-medium text-foreground">{existingTriage.chiefComplaint}</p>
       </div>
      </div>
     </div>
    )}

    {/* Triage form */}
    <div className="bg-white border border-border p-5 ">
     <div className="flex items-center gap-2 mb-5">
      <HeartPulse className="h-4 w-4 text-primary" />
      <h2 className="text-sm font-bold text-foreground">
       {existingTriage ? 'New Triage Assessment' : 'Triage Assessment'}
      </h2>
     </div>
     <TriageForm
      appointmentId={appointmentId}
      patientId={appt.patientId}
      patientName={appt.patientName}
      patientAge={age}
      patientGender={appt.patientGender}
      patientAllergies={appt.patientAllergies ?? undefined}
     />
    </div>
   </div>
  </div>
 );
}
