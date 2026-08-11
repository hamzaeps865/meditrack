import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import {
 appointments, doctors, users, patients,
} from '@/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { format, isFuture, isPast, differenceInDays, isToday, isTomorrow } from 'date-fns';
import {
 Calendar, Clock, CheckCircle2, XCircle, UserCheck,
 AlertCircle, Stethoscope, CalendarDays,
 Activity, Info,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import ReviewModal from '@/components/patient/review-modal';
import { getActivePatient } from '@/server/actions/active-patient';
import { getHealthScore } from '@/server/actions/health-score.actions';
import { getLoyaltyTier } from '@/server/actions/health-score.actions';
import { HealthScoreCard } from '@/components/shared/health-score-card';
import { LoyaltyBadge } from '@/components/shared/loyalty-badge';
import HealthAlertsBanner from '@/components/shared/health-alerts-banner';
import { getActiveAlertsForCity } from '@/server/actions/health-alerts.actions';
import CancelAppointmentButton from '@/components/shared/cancel-appointment-button';
import MedicationReminders from '@/components/patient/medication-reminders';
import { getMedicationReminders } from '@/server/actions/medication-reminders.actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
 if (!name) return '?';
 return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function getDateLabel(dateStr: Date | string) {
 const d = new Date(dateStr);
 if (isToday(d)) return 'Today';
 if (isTomorrow(d)) return 'Tomorrow';
 const days = differenceInDays(d, new Date());
 if (days > 0 && days < 7) return `In ${days} days`;
 return format(d, 'EEE, MMM d');
}

const statusConfig: Record<string, {
 label: string;
 badge: string;
 dot: string;
 icon: typeof Calendar;
}> = {
 scheduled:  { label: 'Scheduled',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',     dot: 'bg-emerald-400',  icon: Calendar   },
 checked_in: { label: 'Checked-in', badge: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400',  icon: UserCheck  },
 in_progress: { label: 'In Progress', badge: 'bg-orange-50 text-orange-700 border-orange-200',  dot: 'bg-orange-400', icon: Clock    },
 completed:  { label: 'Completed',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400', icon: CheckCircle2 },
 cancelled:  { label: 'Cancelled',  badge: 'bg-red-50 text-red-600 border-red-200',       dot: 'bg-red-400',   icon: XCircle   },
 no_show:   { label: 'No-show',   badge: 'bg-emerald-50/30 text-emerald-800/60 border-emerald-100',     dot: 'bg-muted-foreground',  icon: AlertCircle },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PatientAppointmentsPage() {
 const session = await auth();
 if (!session || session.user.role !== 'patient') redirect('/login');

 // Resolve the active patient (self via email, or a managed family member)
 const active = await getActivePatient();
 const patientId = active?.id ?? null;

 if (!patientId) {
  return (
   <PatientShell name={session.user.name}>
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
     <div className="h-16 w-16 bg-muted flex items-center justify-center">
      <Stethoscope className="h-8 w-8 opacity-30" />
     </div>
     <div className="text-center">
      <p className="text-base font-semibold text-foreground">No patient profile found</p>
      <p className="text-sm mt-1 max-w-sm">
       Your account hasn't been linked to a patient record yet.
       Please contact the clinic reception to register.
      </p>
     </div>
    </div>
   </PatientShell>
  );
 }

 const allAppointments = await db
  .select({
   id:     appointments.id,
   scheduledAt: appointments.scheduledAt,
   status:   appointments.status,
   reason:   appointments.reason,
   doctorId:  appointments.doctorId,
   doctorName: users.name,
   doctorSpec: doctors.specialization,
  })
  .from(appointments)
  .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
  .leftJoin(users,  eq(doctors.userId, users.id))
  .where(eq(appointments.patientId, patientId))
  .orderBy(desc(appointments.scheduledAt));

 const upcoming = allAppointments
  .filter((a) => isFuture(new Date(a.scheduledAt)))
  .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

 const past = allAppointments.filter((a) => isPast(new Date(a.scheduledAt)));

 const nextAppt = upcoming[0] ?? null;

 const completed = allAppointments.filter((a) => a.status === 'completed').length;
 const cancelled = allAppointments.filter((a) => a.status === 'cancelled').length;

 // Gamified health score + loyalty tier (best-effort — won't block the page)
 let healthScore: Awaited<ReturnType<typeof getHealthScore>> | null = null;
 let loyalty: Awaited<ReturnType<typeof getLoyaltyTier>> | null = null;
 try {
  [healthScore, loyalty] = await Promise.all([
   getHealthScore(patientId),
   getLoyaltyTier(patientId),
  ]);
 } catch {
  // Non-critical — page still renders without gamification
 }

 // Community health alerts for the patient's city (best-effort)
 let healthAlerts: { id: string; title: string; message: string; disease: string | null; severity: 'low' | 'medium' | 'high' | 'critical'; city: string | null }[] = [];
 try {
  // Resolve the active patient's city
  const [pRow] = await db.select({ city: patients.city }).from(patients).where(eq(patients.id, patientId));
  const activeAlerts = await getActiveAlertsForCity(pRow?.city ?? null);
  healthAlerts = activeAlerts.map((a) => ({
   id: a.id, title: a.title, message: a.message,
   disease: a.disease, severity: a.severity, city: a.city,
  }));
 } catch {
  // Non-critical
 }

 // Medication reminders (best-effort)
 let medicationRemindersData: { id: string; medicineName: string; dosage: string; frequency: string; nextDoseAt: Date }[] = [];
 try {
  const reminders = await getMedicationReminders(patientId);
  medicationRemindersData = reminders.map((r) => ({
   id: r.id, medicineName: r.medicineName, dosage: r.dosage,
   frequency: r.frequency, nextDoseAt: r.nextDoseAt,
  }));
 } catch {
  // Non-critical
 }

 return (
  <PatientShell name={session.user.name}>
   <div className="max-w-3xl mx-auto space-y-6">

    {/* ── Community health alerts ── */}
    {healthAlerts.length > 0 && <HealthAlertsBanner alerts={healthAlerts} />}

    {/* ── Managing-as indicator (family profile) ── */}
    {active?.isManaged && (
     <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 flex items-center gap-2">
      <span className="text-sm">👤</span>
      <p className="text-sm text-emerald-700">
       Viewing appointments for <strong>{active.name}</strong>
      </p>
     </div>
    )}

    {/* ── Header ── */}
    <div className="flex items-center justify-between">
     <div>
      <h1 className="text-xl font-bold text-foreground">My Appointments</h1>
      <p className="text-sm text-muted-foreground mt-0.5">
       {allAppointments.length} total · {upcoming.length} upcoming
      </p>
     </div>
     <Link
      href="/patient/appointments/new"
      className="h-10 px-4 text-sm font-bold text-white flex items-center gap-2 hover:opacity-90 transition-opacity "
      style={{ backgroundColor: '#01411C' }}
     >
      <CalendarDays className="h-4 w-4" />
      Book Appointment
     </Link>
    </div>

    {/* ── Stats row ── */}
    <div className="grid grid-cols-3 gap-3">
     <StatCard
      icon={CalendarDays}
      label="Upcoming"
      value={upcoming.length}
      color="text-emerald-700"
      bg="bg-emerald-50"
     />
     <StatCard
      icon={CheckCircle2}
      label="Completed"
      value={completed}
      color="text-emerald-600"
      bg="bg-emerald-50"
     />
     <StatCard
      icon={XCircle}
      label="Cancelled"
      value={cancelled}
      color="text-red-500"
      bg="bg-red-50"
     />
    </div>

    {/* ── Gamification: Health Score + Loyalty ── */}
    {healthScore && loyalty && (
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <HealthScoreCard
       total={healthScore.total}
       tier={healthScore.tier}
       next={healthScore.next}
      />
      <div className="bg-white border border-border p-5  flex flex-col">
       <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
         Loyalty Status
        </h3>
        <Activity className="h-4 w-4 text-primary" />
       </div>
       <div className="flex-1 flex flex-col justify-center">
        {loyalty.tier ? (
         <>
          <p className="text-4xl font-bold text-foreground leading-none">
           {loyalty.tier.icon}
          </p>
          <p className={`text-base font-bold mt-2 ${loyalty.tier.color}`}>{loyalty.tier.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
           Active for {loyalty.activeMonths} month{loyalty.activeMonths !== 1 ? 's' : ''}
          </p>
         </>
        ) : (
         <>
          <p className="text-2xl">👋</p>
          <p className="text-base font-bold text-foreground mt-2">Welcome!</p>
          <p className="text-xs text-muted-foreground mt-1">
           Book {3 - (loyalty.activeMonths % 3)} more month{3 - (loyalty.activeMonths % 3) !== 1 ? 's' : ''} to reach Silver status.
          </p>
         </>
        )}
       </div>
      </div>
     </div>
    )}

    {/* ── Next Appointment Banner ── */}
    {nextAppt && (
     <div
      className=" overflow-hidden text-white"
      style={{
       background: 'linear-gradient(135deg, #01411C 0%, #0a5c3a 60%, #01411C 100%)',
      }}
     >
      {/* gradient shimmer line */}
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
      <div className="px-6 py-5">
       <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-3">
        Next Appointment
       </p>
       <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
         <p className="text-2xl font-bold leading-none">
          {format(new Date(nextAppt.scheduledAt), 'EEEE, MMM d')}
         </p>
         <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-white/70 text-sm">
           <Clock className="h-3.5 w-3.5" />
           {format(new Date(nextAppt.scheduledAt), 'h:mm a')}
          </span>
          {nextAppt.doctorName && (
           <>
            <span className="text-white/30">·</span>
            <span className="text-white/70 text-sm">
             Dr. {nextAppt.doctorName}
            </span>
           </>
          )}
          {nextAppt.doctorSpec && (
           <span className="text-white/40 text-xs">({nextAppt.doctorSpec})</span>
          )}
         </div>
         {nextAppt.reason && (
          <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
           <Info className="h-3 w-3" />
           {nextAppt.reason}
          </p>
         )}
         {/* Countdown */}
         <div className="mt-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-white/10 text-white/80">
           {getDateLabel(nextAppt.scheduledAt)}
          </span>
         </div>
        </div>

        <div className="flex flex-col items-end gap-2">
         <span className={`px-3 py-1.5 text-xs font-bold border
          ${statusConfig[nextAppt.status]?.badge ?? 'bg-white/10 text-white border-white/20'}`}>
          {statusConfig[nextAppt.status]?.label ?? nextAppt.status}
         </span>
         {nextAppt.doctorName && (
          <div className="h-10 w-10 bg-white/10 flex items-center
           justify-center text-sm font-bold text-white">
           {getInitials(nextAppt.doctorName)}
          </div>
         )}
        </div>
       </div>
      </div>
     </div>
    )}

    {/* ── Medication Reminders ── */}
    {medicationRemindersData.length > 0 && (
     <MedicationReminders reminders={medicationRemindersData} />
    )}

    {/* ── Upcoming ── */}
    <Section title="Upcoming" count={upcoming.length} icon={CalendarDays}>
     {upcoming.length === 0 ? (
      <EmptyState
       icon={Calendar}
       message="No upcoming appointments"
       sub="Book an appointment at the clinic to get started."
      />
     ) : (
      <ul className="divide-y divide-border">
       {upcoming.map((appt) => (
        <AppointmentRow key={appt.id} appt={appt} />
       ))}
      </ul>
     )}
    </Section>

    {/* ── Past ── */}
    {past.length > 0 && (
     <Section title="Past Appointments" count={past.length} icon={Activity}>
      <ul className="divide-y divide-border">
       {past.slice(0, 12).map((appt) => (
        <AppointmentRow key={appt.id} appt={appt} dim />
       ))}
      </ul>
      {past.length > 12 && (
       <div className="px-5 py-3 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
         Showing 12 of {past.length} past appointments
        </p>
       </div>
      )}
     </Section>
    )}
   </div>
  </PatientShell>
 );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PatientShell({ name, children }: { name?: string | null; children: React.ReactNode }) {
 return (
  <div className="min-h-full bg-[#f0f7f3]">
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="h-8 w-8 flex items-center justify-center shrink-0"
      style={{ background: 'linear-gradient(135deg, #01411C, #0a5c3a)' }}>
      <span className="text-white text-xs font-bold">
       {name ? name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '?'}
      </span>
     </div>
     <div className="hidden sm:block">
      <p className="text-sm font-semibold text-foreground leading-none">{name}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Patient</p>
     </div>
    </div>
    <div className="flex items-center gap-2">
     <NotificationBell />
    </div>
   </div>
   <div className="px-6 py-6">{children}</div>
  </div>
 );
}

function StatCard({
 icon: Icon, label, value, color, bg,
}: {
 icon: typeof Calendar; label: string; value: number; color: string; bg: string;
}) {
 return (
  <div className="bg-white border border-border p-4 ">
   <div className={`h-9 w-9 ${bg} flex items-center justify-center mb-3`}>
    <Icon className={`h-4.5 w-4.5 ${color}`} style={{ width: '1.125rem', height: '1.125rem' }} />
   </div>
   <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
   <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
  </div>
 );
}

function Section({
 title, count, icon: Icon, children,
}: {
 title: string; count: number; icon: typeof Calendar; children: React.ReactNode;
}) {
 return (
  <div className="bg-white border border-border overflow-hidden ">
   <div className="flex items-center justify-between px-5 py-4 border-b border-border">
    <div className="flex items-center gap-2">
     <Icon className="h-4 w-4 text-primary" />
     <h2 className="text-sm font-bold text-foreground">{title}</h2>
    </div>
    <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 ">
     {count}
    </span>
   </div>
   {children}
  </div>
 );
}

function AppointmentRow({
 appt, dim = false,
}: {
 appt: {
  id: string;
  scheduledAt: Date | string;
  status: string;
  reason: string | null;
  doctorId: string;
  doctorName: string | null;
  doctorSpec: string | null;
 };
 dim?: boolean;
}) {
 const cfg = statusConfig[appt.status] ?? statusConfig.scheduled;
 const Icon = cfg.icon;
 const date = new Date(appt.scheduledAt);

 return (
  <li className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors
   ${dim ? 'opacity-60' : ''}`}>

   {/* Date block */}
   <div className="shrink-0 w-12 text-center">
    <p className="text-xl font-bold text-foreground leading-none">
     {format(date, 'd')}
    </p>
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">
     {format(date, 'MMM')}
    </p>
   </div>

   {/* Divider */}
   <div className="w-px h-10 bg-border shrink-0" />

   {/* Doctor avatar */}
   {appt.doctorName && (
    <div className="h-9 w-9 flex items-center justify-center shrink-0
     text-xs font-bold text-white"
     style={{ background: 'linear-gradient(135deg, #01411C, #0a5c3a)' }}>
     {getInitials(appt.doctorName)}
    </div>
   )}

   {/* Details */}
   <div className="flex-1 min-w-0">
    <div className="flex items-center gap-1.5 flex-wrap">
     <span className="text-sm font-semibold text-foreground">
      {format(date, 'h:mm a')}
     </span>
     {appt.doctorName && (
      <span className="text-sm text-muted-foreground">
       · Dr. {appt.doctorName}
      </span>
     )}
     {appt.doctorSpec && (
      <span className="text-xs text-muted-foreground/60">
       {appt.doctorSpec}
      </span>
     )}
    </div>
    {appt.reason && (
     <p className="text-xs text-muted-foreground mt-0.5 truncate">{appt.reason}</p>
    )}
   </div>

   {/* Status badge */}
   <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 
    text-[10px] font-bold uppercase tracking-wide border ${cfg.badge}`}>
    <span className={`h-1.5 w-1.5 ${cfg.dot}`} />
    {cfg.label}
   </span>

   {/* Leave-review action for completed appointments */}
   {appt.status === 'completed' && appt.doctorName && (
    <div className="shrink-0">
     <ReviewModal
      appointmentId={appt.id}
      doctorId={appt.doctorId}
      doctorName={appt.doctorName}
     />
    </div>
   )}

   {/* Cancel action for upcoming appointments */}
   {(appt.status === 'scheduled' || appt.status === 'checked_in') && (
    <div className="shrink-0">
     <CancelAppointmentButton appointmentId={appt.id} variant="text" />
    </div>
   )}
  </li>
 );
}

function EmptyState({
 icon: Icon, message, sub,
}: {
 icon: typeof Calendar; message: string; sub: string;
}) {
 return (
  <div className="flex flex-col items-center justify-center py-14 gap-2 text-muted-foreground">
   <div className="h-12 w-12 bg-muted flex items-center justify-center mb-1">
    <Icon className="h-6 w-6 opacity-40" />
   </div>
   <p className="text-sm font-semibold text-foreground">{message}</p>
   <p className="text-xs text-center max-w-xs">{sub}</p>
  </div>
 );
}
