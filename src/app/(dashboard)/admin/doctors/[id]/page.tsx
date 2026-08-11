import { auth } from '@/server/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/server/db';
import {
 doctors, users, doctorAvailability,
 appointments, patients, visits,
} from '@/server/db/schema';
import { eq, and, desc, count, gte, lte } from 'drizzle-orm';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import Link from 'next/link';
import {
 ArrowLeft, Search, Mail, BadgeCheck,
 Calendar, Clock, Users, Stethoscope,
 CalendarCheck, Activity, ChevronRight,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import { getReviewsForDoctor, getDoctorRatingSummary } from '@/server/actions/reviews.actions';
import { StarRating } from '@/components/shared/star-rating';
import EditDoctorModal from '@/components/admin/edit-doctor-modal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
 if (!name) return '?';
 return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const avatarPalette = [
 'bg-emerald-100 text-emerald-700',
 'bg-emerald-100 text-emerald-700',
 'bg-amber-100 text-amber-700',
 'bg-emerald-100 text-emerald-700',
 'bg-rose-100 text-rose-700',
 'bg-emerald-100 text-emerald-700',
];

function avatarColor(name: string) {
 return avatarPalette[name.charCodeAt(0) % avatarPalette.length];
}

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
const DAY_LABELS: Record<string, string> = {
 monday:'Mon', tuesday:'Tue', wednesday:'Wed',
 thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun',
};

function fmtTime(t: string) {
 const [hStr, m] = t.split(':');
 const h = parseInt(hStr, 10);
 return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

const statusConfig: Record<string, { badge: string; label: string }> = {
 scheduled:  { badge: 'bg-emerald-100 text-emerald-700',    label: 'Scheduled'  },
 checked_in: { badge: 'bg-amber-100 text-amber-700',   label: 'Checked-in' },
 in_progress: { badge: 'bg-orange-100 text-orange-700',  label: 'In Progress' },
 completed:  { badge: 'bg-emerald-100 text-emerald-700', label: 'Completed'  },
 cancelled:  { badge: 'bg-red-100 text-red-600',     label: 'Cancelled'  },
 no_show:   { badge: 'bg-muted text-emerald-800/60',    label: 'No-show'   },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDoctorProfilePage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const session = await auth();
 if (!session || session.user.role !== 'admin') redirect('/login');

 const { id } = await params;

 // Doctor + user
 const [doctorRow] = await db
  .select({
   id:       doctors.id,
   userId:     doctors.userId,
   specialization: doctors.specialization,
   licenseNumber: doctors.licenseNumber,
   name:      users.name,
   email:     users.email,
   createdAt:   users.createdAt,
  })
  .from(doctors)
  .leftJoin(users, eq(doctors.userId, users.id))
  .where(eq(doctors.id, id));

 if (!doctorRow) notFound();

 // Availability windows
 const availWindows = await db
  .select()
  .from(doctorAvailability)
  .where(eq(doctorAvailability.doctorId, id))
  .orderBy(doctorAvailability.dayOfWeek, doctorAvailability.startTime);

 // Reviews + rating summary (parallel)
 const [reviews, ratingSummary] = await Promise.all([
  getReviewsForDoctor(id, 20),
  getDoctorRatingSummary(id),
 ]);

 // Group availability by day
 const availByDay = new Map<string, typeof availWindows>();
 for (const w of availWindows) {
  if (!availByDay.has(w.dayOfWeek)) availByDay.set(w.dayOfWeek, []);
  availByDay.get(w.dayOfWeek)!.push(w);
 }

 const totalHours = availWindows.reduce((acc, w) => {
  const [sh, sm] = w.startTime.split(':').map(Number);
  const [eh, em] = w.endTime.split(':').map(Number);
  return acc + (eh + em / 60) - (sh + sm / 60);
 }, 0);

 // Stats
 const now = new Date();
 const monthStart = startOfMonth(now);
 const monthEnd  = endOfMonth(now);

 const [{ totalAppts }] = await db
  .select({ totalAppts: count() })
  .from(appointments)
  .where(eq(appointments.doctorId, id));

 const [{ thisMonthAppts }] = await db
  .select({ thisMonthAppts: count() })
  .from(appointments)
  .where(
   and(
    eq(appointments.doctorId, id),
    gte(appointments.scheduledAt, monthStart),
    lte(appointments.scheduledAt, monthEnd),
   ),
  );

 // Distinct patients seen
 const distinctPatients = await db
  .selectDistinct({ patientId: appointments.patientId })
  .from(appointments)
  .where(eq(appointments.doctorId, id));

 // Recent appointments (last 5)
 const recentAppts = await db
  .select({
   id:     appointments.id,
   scheduledAt: appointments.scheduledAt,
   status:   appointments.status,
   reason:   appointments.reason,
   patientName: patients.name,
  })
  .from(appointments)
  .leftJoin(patients, eq(appointments.patientId, patients.id))
  .where(eq(appointments.doctorId, id))
  .orderBy(desc(appointments.scheduledAt))
  .limit(5);

 const name = doctorRow.name ?? 'Unknown';

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

   <div className="px-6 py-5 max-w-5xl mx-auto">

    {/* Back + breadcrumb */}
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
     <Link href="/admin/doctors"
      className="flex items-center gap-1.5 hover:text-foreground transition-colors">
      <ArrowLeft className="h-3.5 w-3.5" />
      Doctors
     </Link>
     <ChevronRight className="h-3.5 w-3.5" />
     <span className="text-foreground font-medium">Dr. {name}</span>
    </div>

    {/* ── Profile header card ── */}
    <div className="bg-white border border-border p-6  mb-4">
     <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4">
       <div className={`h-16 w-16 flex items-center justify-center
        text-xl font-bold shrink-0 ${avatarColor(name)}`}>
        {getInitials(name)}
       </div>
       <div>
        <h1 className="text-xl font-bold text-foreground">Dr. {name}</h1>
        <p className="text-sm text-primary font-medium mt-0.5">
         {doctorRow.specialization}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
         <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Mail className="h-3 w-3" />
          {doctorRow.email}
         </span>
         <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <BadgeCheck className="h-3 w-3" />
          #{doctorRow.licenseNumber}
         </span>
         {doctorRow.createdAt && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
           <Calendar className="h-3 w-3" />
           Joined {format(new Date(doctorRow.createdAt), 'MMM d, yyyy')}
          </span>
         )}
        </div>
       </div>
      </div>

      <div className="flex items-center gap-2">
       <EditDoctorModal
        doctorId={id}
        initialName={doctorRow.name ?? ''}
        initialSpecialization={doctorRow.specialization}
        initialLicense={doctorRow.licenseNumber}
       />
       <Link
        href={`/admin/doctors/${id}/availability`}
        className="h-9 px-4 border border-border text-sm font-medium
         text-foreground hover:bg-muted transition-colors flex items-center gap-2"
       >
        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
        Manage Availability
       </Link>
       <Link
        href={`/admin/appointments?doctorId=${id}`}
        className="h-9 px-4 text-sm font-bold text-white
         hover:opacity-90 transition-opacity flex items-center gap-2"
        style={{ backgroundColor: '#01411C' }}
       >
        <Calendar className="h-4 w-4" />
        View Appointments
       </Link>
      </div>
     </div>
    </div>

    {/* ── Stat cards ── */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
     {[
      {
       label: 'Total Appointments',
       value: totalAppts,
       icon: Calendar,
       color: 'text-primary',
       bg:  'bg-primary/10',
      },
      {
       label: 'This Month',
       value: thisMonthAppts,
       icon: Activity,
       color: 'text-emerald-600',
       bg:  'bg-emerald-50',
      },
      {
       label: 'Patients Seen',
       value: distinctPatients.length,
       icon: Users,
       color: 'text-amber-600',
       bg:  'bg-amber-50',
      },
      {
       label: 'Weekly Hours',
       value: `${Math.round(totalHours)}h`,
       icon: Clock,
       color: 'text-emerald-700',
       bg:  'bg-emerald-50',
      },
     ].map((s) => {
      const Icon = s.icon;
      return (
       <div key={s.label}
        className="bg-white border border-border p-4 ">
        <div className="flex items-center justify-between mb-2">
         <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
         <div className={`h-7 w-7 flex items-center justify-center
          shrink-0 ${s.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${s.color}`} />
         </div>
        </div>
        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
       </div>
      );
     })}
    </div>

    {/* ── Two-column layout ── */}
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">

     {/* Recent Appointments */}
     <div className="bg-white border border-border  overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
       <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
         Recent Appointments
        </h2>
       </div>
       <Link href={`/admin/appointments`}
        className="text-xs font-medium text-primary hover:underline">
        View All
       </Link>
      </div>

      {recentAppts.length === 0 ? (
       <div className="flex flex-col items-center justify-center py-12
        text-muted-foreground gap-2">
        <Calendar className="h-8 w-8 opacity-20" />
        <p className="text-sm">No appointments yet.</p>
       </div>
      ) : (
       <ul className="divide-y divide-border">
        {recentAppts.map((appt) => {
         const cfg = statusConfig[appt.status] ?? statusConfig.scheduled;
         return (
          <li key={appt.id}
           className="flex items-center gap-4 px-5 py-3.5
            hover:bg-muted/20 transition-colors">
           <div className="w-24 shrink-0">
            <p className="text-xs font-semibold text-foreground">
             {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
             {format(new Date(appt.scheduledAt), 'hh:mm a')}
            </p>
           </div>
           <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
             {appt.patientName ?? '—'}
            </p>
            {appt.reason && (
             <p className="text-xs text-muted-foreground truncate mt-0.5">
              {appt.reason}
             </p>
            )}
           </div>
           <span className={`shrink-0 px-2.5 py-1 text-[10px]
            font-semibold ${cfg.badge}`}>
            {cfg.label}
           </span>
          </li>
         );
        })}
       </ul>
      )}
     </div>

     {/* Availability Summary */}
     <div className="bg-white border border-border  overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
       <div className="flex items-center gap-2">
        <Stethoscope className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
         Weekly Schedule
        </h2>
       </div>
       <Link href={`/admin/doctors/${id}/availability`}
        className="text-xs font-medium text-primary hover:underline">
        Edit
       </Link>
      </div>

      {availWindows.length === 0 ? (
       <div className="flex flex-col items-center justify-center py-10
        text-muted-foreground gap-2 px-5 text-center">
        <Clock className="h-7 w-7 opacity-20" />
        <p className="text-sm">No availability set.</p>
        <Link href={`/admin/doctors/${id}/availability`}
         className="text-xs text-primary font-medium hover:underline">
         Set schedule →
        </Link>
       </div>
      ) : (
       <ul className="divide-y divide-border">
        {DAY_ORDER.map((day) => {
         const windows = availByDay.get(day);
         if (!windows || windows.length === 0) return null;
         return (
          <li key={day} className="px-5 py-3">
           <p className="text-[10px] font-bold uppercase tracking-widest
            text-muted-foreground mb-1.5">
            {DAY_LABELS[day]}
           </p>
           <div className="flex flex-wrap gap-1.5">
            {windows.map((w) => (
             <span key={w.id}
              className="px-2.5 py-1 bg-primary/5
               border border-primary/15 text-xs font-semibold text-primary">
              {fmtTime(w.startTime)} – {fmtTime(w.endTime)}
             </span>
            ))}
           </div>
          </li>
         );
        })}
       </ul>
      )}

      {availWindows.length > 0 && (
       <div className="px-5 py-3 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground">
         <span className="font-semibold text-foreground">
          {new Set(availWindows.map((w) => w.dayOfWeek)).size} days
         </span>
         {' · '}
         <span className="font-semibold text-foreground">
          {Math.round(totalHours)} hrs
         </span>
         {' '}per week
        </p>
       </div>
      )}
     </div>
    </div>
   </div>

   {/* ── Patient Reviews ── */}
   <div className="bg-card border border-border overflow-hidden mt-4">
    <div className="flex items-center justify-between px-6 py-5 border-b border-border">
     <div className="flex items-center gap-3">
      <h2 className="text-sm font-semibold text-foreground">Patient Reviews</h2>
      <StarRating rating={ratingSummary.average} showNumber count={ratingSummary.count} />
     </div>
    </div>

    {reviews.length === 0 ? (
     <div className="px-6 py-10 text-center text-sm text-muted-foreground">
      No reviews yet.
     </div>
    ) : (
     <div className="divide-y divide-border">
      {reviews.map((review) => (
       <div key={review.id} className="px-6 py-4">
        <div className="flex items-center justify-between mb-1.5">
         <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold">
           {review.patientName?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-medium text-foreground">
           {review.patientName ?? 'Anonymous'}
          </span>
         </div>
         <span className="text-xs text-muted-foreground">
          {format(new Date(review.createdAt), 'MMM d, yyyy')}
         </span>
        </div>
        <div className="mb-2">
         <StarRating rating={review.rating} size={13} />
        </div>
        {review.comment && (
         <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
        )}
       </div>
      ))}
     </div>
    )}
   </div>
  </div>
 );
}
