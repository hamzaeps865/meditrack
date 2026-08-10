import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { appointments, doctors, patients, users } from '@/server/db/schema';
import { eq, desc, gte, lte, and, count } from 'drizzle-orm';
import { startOfMonth, endOfMonth, formatDistanceToNow } from 'date-fns';
import AppointmentsTable, {
 type AdminAppointment,
 type DoctorUtilization,
} from '@/components/admin/appointments-table';

export default async function AdminAppointmentsPage() {
 const session = await auth();
 if (!session || session.user.role !== 'admin') redirect('/login');

 const now = new Date();

 // ── All appointments (full join) ──────────────────────────────────────────
 // We alias users twice — once for doctor name, once for createdBy name
 const createdByUsers = db.$with('created_by_users').as(
  db.select({ id: users.id, name: users.name }).from(users),
 );

 const rawRows = await db
  .select({
   id:      appointments.id,
   scheduledAt: appointments.scheduledAt,
   status:    appointments.status,
   reason:    appointments.reason,
   patientId:  appointments.patientId,
   doctorId:   appointments.doctorId,
   createdBy:  appointments.createdBy,
   createdAt:  appointments.createdAt,
   patientName: patients.name,
   doctorUserId: doctors.userId,
  })
  .from(appointments)
  .leftJoin(patients, eq(appointments.patientId, patients.id))
  .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
  .orderBy(desc(appointments.scheduledAt));

 // Gather all unique userIds we need (doctor users + createdBy users)
 const userIds = new Set<string>();
 for (const r of rawRows) {
  if (r.doctorUserId) userIds.add(r.doctorUserId);
  if (r.createdBy)  userIds.add(r.createdBy);
 }

 // Fetch those users in one query
 const userRows = await db
  .select({ id: users.id, name: users.name })
  .from(users);

 const userMap = new Map(userRows.map((u) => [u.id, u.name]));

 // ── Build enriched appointments ───────────────────────────────────────────
 const enriched: AdminAppointment[] = rawRows.map((r) => {
  const scheduledAt  = new Date(r.scheduledAt);
  const diffMs    = now.getTime() - scheduledAt.getTime();
  const isLiveNow   = r.status === 'in_progress';
  const liveStartedAgo = isLiveNow
   ? formatDistanceToNow(scheduledAt, { addSuffix: false })
   : undefined;

  return {
   id:      r.id,
   scheduledAt: r.scheduledAt.toISOString(),
   status:    r.status,
   reason:    r.reason,
   patientName: r.patientName ?? null,
   doctorId:   r.doctorId,
   doctorName:  r.doctorUserId ? (userMap.get(r.doctorUserId) ?? null) : null,
   bookedByName: r.createdBy  ? (userMap.get(r.createdBy)  ?? null) : null,
   isLiveNow,
   liveStartedAgo,
  };
 });

 // ── Global stats ──────────────────────────────────────────────────────────
 const totalAll   = enriched.length;
 const completedAll = enriched.filter((a) => a.status === 'completed').length;
 const cancelledAll = enriched.filter((a) => a.status === 'cancelled').length;
 const noShowAll  = enriched.filter((a) => a.status === 'no_show').length;

 // ── Doctor utilization (this month) ───────────────────────────────────────
 const monthStart = startOfMonth(now);
 const monthEnd  = endOfMonth(now);

 const thisMonthRows = enriched.filter((a) => {
  const d = new Date(a.scheduledAt);
  return d >= monthStart && d <= monthEnd;
 });

 // Group by doctorId
 const utilMap = new Map<string, {
  name: string | null;
  total: number;
  cancelled: number;
 }>();

 for (const a of thisMonthRows) {
  if (!utilMap.has(a.doctorId)) {
   utilMap.set(a.doctorId, { name: a.doctorName, total: 0, cancelled: 0 });
  }
  const entry = utilMap.get(a.doctorId)!;
  entry.total++;
  if (a.status === 'cancelled' || a.status === 'no_show') entry.cancelled++;
 }

 const utilization: DoctorUtilization[] = [...utilMap.entries()]
  .map(([doctorId, v]) => ({
   doctorId,
   doctorName:    v.name,
   apptThisMonth:   v.total,
   cancellationRate: v.total > 0 ? (v.cancelled / v.total) * 100 : 0,
  }))
  .sort((a, b) => b.apptThisMonth - a.apptThisMonth);

 const adminName = session.user.name ?? 'Admin User';

 return (
  <AppointmentsTable
   appointments={enriched}
   utilization={utilization}
   adminName={adminName}
   totalAll={totalAll}
   completedAll={completedAll}
   cancelledAll={cancelledAll}
   noShowAll={noShowAll}
  />
 );
}
