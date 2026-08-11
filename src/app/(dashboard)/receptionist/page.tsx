import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import {
 appointments, patients, doctors, users,
} from '@/server/db/schema';
import {
 eq, and, gte, lte, isNull, desc, asc,
} from 'drizzle-orm';
import Link from 'next/link';
import { format, startOfDay, endOfDay } from 'date-fns';
import {
 Users, Calendar, UserCheck, Clock, CheckCircle2,
 AlertCircle, Search, UserPlus, CalendarPlus,
 Stethoscope, ChevronRight, Activity, ArrowUpRight,
 Building, Check, XCircle, Sparkles,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import QuickCheckinButton from '@/components/receptionist/quick-checkin-button';
import WalkInModal from '@/components/receptionist/walk-in-modal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
 if (!name) return '?';
 return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const statusBadgeConfig: Record<string, { label: string; badge: string; dot: string }> = {
 scheduled:  { label: 'Scheduled',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',     dot: 'bg-emerald-400' },
 checked_in: { label: 'Waiting',   badge: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400' },
 in_progress: { label: 'In Visit',  badge: 'bg-orange-50 text-orange-700 border-orange-200',  dot: 'bg-orange-400' },
 completed:  { label: 'Completed',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
 cancelled:  { label: 'Cancelled',  badge: 'bg-red-50 text-red-600 border-red-200',       dot: 'bg-red-400' },
 no_show:   { label: 'No-show',   badge: 'bg-emerald-50/30 text-emerald-800/60 border-emerald-100',     dot: 'bg-muted-foreground' },
};

export default async function ReceptionistDashboardPage() {
 const session = await auth();
 if (!session || (session.user.role !== 'receptionist' && session.user.role !== 'admin')) {
  redirect('/login');
 }

 const today = new Date();
 const dayStart = startOfDay(today);
 const dayEnd  = endOfDay(today);

 // Load all today's appointments
 const todayAppointments = await db
  .select({
   id:     appointments.id,
   scheduledAt: appointments.scheduledAt,
   status:   appointments.status,
   reason:   appointments.reason,
   patientId:  appointments.patientId,
   patientName: patients.name,
   patientPhone:patients.phone,
   doctorId:  appointments.doctorId,
   doctorName: users.name,
   doctorSpec: doctors.specialization,
  })
  .from(appointments)
  .innerJoin(patients, eq(appointments.patientId, patients.id))
  .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
  .leftJoin(users,  eq(doctors.userId, users.id))
  .where(
   and(
    gte(appointments.scheduledAt, dayStart),
    lte(appointments.scheduledAt, dayEnd),
   ),
  )
  .orderBy(asc(appointments.scheduledAt));

 // Counts
 const totalToday = todayAppointments.length;
 const checkedIn  = todayAppointments.filter((a) => a.status === 'checked_in');
 const inProgress = todayAppointments.filter((a) => a.status === 'in_progress');
 const scheduled  = todayAppointments.filter((a) => a.status === 'scheduled');
 const completed  = todayAppointments.filter((a) => a.status === 'completed');

 // Load all active doctors with count of today's appointments
 const activeDoctors = await db
  .select({
   id:       doctors.id,
   specialization: doctors.specialization,
   name:      users.name,
  })
  .from(doctors)
  .leftJoin(users, eq(doctors.userId, users.id))
  .orderBy(users.name);

 const doctorOccupancy = activeDoctors.map((doc) => {
  const docAppts = todayAppointments.filter((a) => a.doctorId === doc.id);
  const activeVisit = docAppts.find((a) => a.status === 'in_progress');
  const waiting   = docAppts.filter((a) => a.status === 'checked_in').length;
  return {
   ...doc,
   totalToday: docAppts.length,
   activeVisitPatient: activeVisit?.patientName ?? null,
   waitingCount: waiting,
  };
 });

 return (
  <div className="min-h-full bg-[#f0f7f3]">

   {/* ── Top Bar ── */}
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
     <div
      className="h-8 w-8 flex items-center justify-center shrink-0 text-white text-xs font-bold"
      style={{ background: 'linear-gradient(135deg, #01411C, #0a5c3a)' }}
     >
      {getInitials(session.user.name)}
     </div>
     <div className="hidden sm:block">
      <p className="text-sm font-semibold text-foreground leading-none">{session.user.name}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
       Front Desk Operations
      </p>
     </div>
    </div>

    <div className="flex items-center gap-3">
     <span className="text-xs font-medium text-muted-foreground hidden md:block">
      {format(today, 'EEEE, MMMM d, yyyy')}
     </span>
     <NotificationBell />
    </div>
   </div>

   <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">

    {/* ── Header Banner ── */}
    <div className="flex flex-wrap items-center justify-between gap-4">
     <div>
      <h1 className="text-xl font-bold text-foreground">Reception Desk Overview</h1>
      <p className="text-sm text-muted-foreground mt-0.5">
       Live clinic queue, patient intake shortcuts, and doctor occupancy
      </p>
     </div>

     <div className="flex items-center gap-2.5">
      <Link
       href="/receptionist/patients/new"
       className="h-9 px-3.5 bg-white border border-border text-xs font-bold text-foreground
        hover:bg-muted/40 transition-colors flex items-center gap-1.5 "
      >
       <UserPlus className="h-3.5 w-3.5 text-primary" />
       Register Patient
      </Link>

      <Link
       href="/receptionist/appointments"
       className="h-9 px-4 text-xs font-bold text-white flex items-center gap-1.5 hover:opacity-90 transition-opacity "
       style={{ backgroundColor: '#01411C' }}
      >
       <CalendarPlus className="h-3.5 w-3.5" />
       Manage Schedule
      </Link>
      <WalkInModal doctors={activeDoctors} />
     </div>
    </div>

    {/* ── Metrics Row ── */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
     <MetricCard
      title="Total Scheduled Today"
      value={totalToday}
      subtitle="Appointments on record"
      icon={Calendar}
      color="text-emerald-700"
      bg="bg-emerald-50"
     />

     <MetricCard
      title="Waiting Room Queue"
      value={checkedIn.length}
      subtitle="Patients checked in"
      icon={UserCheck}
      color="text-amber-600"
      bg="bg-amber-50"
      highlight={checkedIn.length > 0}
     />

     <MetricCard
      title="In Consultation"
      value={inProgress.length}
      subtitle="Visits currently in progress"
      icon={Clock}
      color="text-orange-600"
      bg="bg-orange-50"
     />

     <MetricCard
      title="Completed Today"
      value={completed.length}
      subtitle="Visits finished"
      icon={CheckCircle2}
      color="text-emerald-600"
      bg="bg-emerald-50"
     />
    </div>

    {/* ── Main 2-Column Grid ── */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

     {/* ── Left Column: Live Queue & Today's Schedule (2 cols wide) ── */}
     <div className="lg:col-span-2 space-y-6">

      {/* Waiting Room Queue */}
      <div className="bg-white border border-border  overflow-hidden">
       <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-amber-50/40">
        <div className="flex items-center gap-2">
         <div className="h-2.5 w-2.5 bg-amber-500 animate-pulse" />
         <h2 className="text-sm font-bold text-foreground">Waiting Room Queue</h2>
        </div>
        <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
         {checkedIn.length} waiting
        </span>
       </div>

       {checkedIn.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
         <UserCheck className="h-8 w-8 opacity-30 mx-auto mb-2" />
         <p className="text-sm font-medium">Waiting room is empty</p>
         <p className="text-xs text-muted-foreground/80 mt-0.5">Checked-in patients will appear here for doctor call-in.</p>
        </div>
       ) : (
        <ul className="divide-y divide-border">
         {checkedIn.map((appt) => (
          <li key={appt.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
           <div className="flex items-center gap-3 min-w-0">
            <div
             className="h-9 w-9 flex items-center justify-center text-xs font-bold text-white shrink-0"
             style={{ background: 'linear-gradient(135deg, #01411C, #0a5c3a)' }}
            >
             {getInitials(appt.patientName)}
            </div>
            <div className="min-w-0">
             <p className="text-sm font-bold text-foreground truncate">{appt.patientName}</p>
             <p className="text-xs text-muted-foreground">
              Doctor: <span className="font-semibold text-foreground/80">Dr. {appt.doctorName}</span>
              {appt.scheduledAt && (
               <span className="ml-2 text-muted-foreground/70">· {format(new Date(appt.scheduledAt), 'h:mm a')}</span>
              )}
             </p>
            </div>
           </div>

           <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            Checked-in
           </span>
          </li>
         ))}
        </ul>
       )}
      </div>

      {/* Today's Full Schedule */}
      <div className="bg-white border border-border  overflow-hidden">
       <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
         <Calendar className="h-4 w-4 text-primary" />
         <h2 className="text-sm font-bold text-foreground">Today's Appointment Schedule</h2>
        </div>
        <Link
         href="/receptionist/appointments"
         className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
         Full Grid <ArrowUpRight className="h-3 w-3" />
        </Link>
       </div>

       {todayAppointments.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
         <Calendar className="h-8 w-8 opacity-30 mx-auto mb-2" />
         <p className="text-sm font-medium">No appointments scheduled for today</p>
        </div>
       ) : (
        <ul className="divide-y divide-border">
         {todayAppointments.map((appt) => {
          const cfg = statusBadgeConfig[appt.status] ?? statusBadgeConfig.scheduled;
          return (
           <li key={appt.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
             <span className="text-xs font-bold text-foreground w-16 shrink-0">
              {format(new Date(appt.scheduledAt), 'h:mm a')}
             </span>

             <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{appt.patientName}</p>
              <p className="text-xs text-muted-foreground truncate">
               Dr. {appt.doctorName} {appt.reason ? `· ${appt.reason}` : ''}
              </p>
             </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
             {appt.status === 'scheduled' && (
              <QuickCheckinButton appointmentId={appt.id} />
             )}

             <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border ${cfg.badge}`}>
              {cfg.label}
             </span>
            </div>
           </li>
          );
         })}
        </ul>
       )}
      </div>

     </div>

     {/* ── Right Column: Doctors Status & Quick Shortcuts ── */}
     <div className="space-y-6">

      {/* Quick Action Shortcuts */}
      <div className="premium-card premium-card-pad space-y-3">
       <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        Quick Actions
       </h3>

       <ShortcutLink
        href="/receptionist/patients/new"
        title="Register New Patient"
        subtitle="Create a patient record"
        icon={UserPlus}
        bg="bg-emerald-50"
        color="text-emerald-600"
       />

       <ShortcutLink
        href="/receptionist/appointments"
        title="Book / Reschedule"
        subtitle="Manage clinic appointments"
        icon={CalendarPlus}
        bg="bg-emerald-50"
        color="text-emerald-700"
       />

       <ShortcutLink
        href="/receptionist/patients"
        title="Search Patient Records"
        subtitle="Lookup medical profiles"
        icon={Search}
        bg="bg-emerald-50"
        color="text-emerald-700"
       />
      </div>

      {/* Today's Doctor Roster */}
      <div className="premium-card overflow-hidden">
       <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
         <Stethoscope className="h-4 w-4 text-primary" />
         <h3 className="text-sm font-bold text-foreground">Attending Doctors</h3>
        </div>
        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 ">
         {doctorOccupancy.length}
        </span>
       </div>

       {doctorOccupancy.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">No doctors configured.</div>
       ) : (
        <ul className="divide-y divide-border">
         {doctorOccupancy.map((doc) => (
          <li key={doc.id} className="p-4 space-y-1.5">
           <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Dr. {doc.name}</p>
            <span className="text-xs font-medium text-muted-foreground">
             {doc.totalToday} appt{doc.totalToday !== 1 ? 's' : ''}
            </span>
           </div>
           <p className="text-xs text-muted-foreground">{doc.specialization ?? 'General Medicine'}</p>

           {doc.activeVisitPatient ? (
            <div className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 px-2.5 py-1 border border-orange-100 font-medium">
             <div className="h-2 w-2 bg-orange-500 animate-pulse" />
             <span>In visit with: <strong className="font-semibold">{doc.activeVisitPatient}</strong></span>
            </div>
           ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-100 font-medium">
             <div className="h-2 w-2 bg-emerald-500" />
             <span>Available / No active visit</span>
            </div>
           )}
          </li>
         ))}
        </ul>
       )}
      </div>

     </div>

    </div>

   </div>
  </div>
 );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function MetricCard({
 title, value, subtitle, icon: Icon, color, bg, highlight = false,
}: {
 title: string; value: number; subtitle: string; icon: typeof Calendar;
 color: string; bg: string; highlight?: boolean;
}) {
 return (
  <div className={`premium-card premium-card-pad transition-all
   ${highlight ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-border'}`}>
   <div className="flex items-center justify-between mb-3">
    <div className={`h-10 w-10 ${bg} flex items-center justify-center`}>
     <Icon className={`h-5 w-5 ${color}`} />
    </div>
   </div>
   <p className="text-3xl font-bold text-foreground leading-none">{value}</p>
   <p className="text-xs font-bold text-foreground mt-2">{title}</p>
   <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
  </div>
 );
}

function ShortcutLink({
 href, title, subtitle, icon: Icon, bg, color,
}: {
 href: string; title: string; subtitle: string; icon: typeof UserPlus;
 bg: string; color: string;
}) {
 return (
  <Link
   href={href}
   className="premium-card flex items-center gap-3 p-3
    hover:border-primary/30 hover:bg-muted/30 transition-all group"
  >
   <div className={`h-9 w-9 ${bg} flex items-center justify-center shrink-0`}>
    <Icon className={`h-4.5 w-4.5 ${color}`} style={{ width: '1.125rem', height: '1.125rem' }} />
   </div>
   <div className="flex-1 min-w-0">
    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{title}</p>
    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
   </div>
   <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
  </Link>
 );
}
