import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import {
 patients, users, appointments, doctors,
} from '@/server/db/schema';
import {
 eq, isNull, isNotNull, gte, lte, and, desc,
} from 'drizzle-orm';
import {
 startOfWeek, endOfWeek,
 startOfMonth, endOfMonth,
} from 'date-fns';
import PatientsTable, { type AdminPatient } from '@/components/admin/patients-table';

export default async function AdminPatientsPage() {
 const session = await auth();
 if (!session || session.user.role !== 'admin') redirect('/login');

 const now = new Date();

 // ── All patients (including soft-deleted for inactive count) ──────────────
 const allPatients = await db
  .select({
   id:      patients.id,
   name:     patients.name,
   dob:      patients.dob,
   gender:    patients.gender,
   phone:     patients.phone,
   createdAt:   patients.createdAt,
   deletedAt:   patients.deletedAt,
   createdByName: users.name,
  })
  .from(patients)
  .leftJoin(users, eq(patients.createdBy, users.id))
  .orderBy(desc(patients.createdAt));

 // ── Most-recent appointment per patient → derive "Primary Doctor" ─────────
 // Fetch last appointment per patient (ordered desc, take first per patient)
 const apptRows = await db
  .select({
   patientId:  appointments.patientId,
   doctorId:  appointments.doctorId,
   scheduledAt: appointments.scheduledAt,
   doctorName: users.name,
  })
  .from(appointments)
  .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
  .leftJoin(users, eq(doctors.userId, users.id))
  .orderBy(desc(appointments.scheduledAt));

 // Keep only the most-recent appointment per patient
 const primaryDoctorMap = new Map<string, string>();
 for (const row of apptRows) {
  if (!primaryDoctorMap.has(row.patientId)) {
   primaryDoctorMap.set(row.patientId, row.doctorName ? `Dr. ${row.doctorName}` : 'Unknown');
  }
 }

 // ── Stats ─────────────────────────────────────────────────────────────────
 const activePatients = allPatients.filter((p) => !p.deletedAt);

 const maleCount  = activePatients.filter((p) => p.gender === 'male').length;
 const femaleCount = activePatients.filter((p) => p.gender === 'female').length;

 const thisMonth  = { start: startOfMonth(now), end: endOfMonth(now) };
 const newThisMonth = activePatients.filter((p) => {
  const d = new Date(p.createdAt);
  return d >= thisMonth.start && d <= thisMonth.end;
 }).length;

 const thisWeek = {
  start: startOfWeek(now, { weekStartsOn: 1 }),
  end:  endOfWeek(now,  { weekStartsOn: 1 }),
 };
 const inactiveCount = allPatients.filter((p) => {
  if (!p.deletedAt) return false;
  const d = new Date(p.deletedAt);
  return d >= thisWeek.start && d <= thisWeek.end;
 }).length;

 // ── Build final shape ─────────────────────────────────────────────────────
 const enriched: AdminPatient[] = allPatients.map((p) => ({
  id:      p.id,
  name:     p.name,
  dob:      p.dob,
  gender:    p.gender,
  phone:     p.phone,
  createdAt:   p.createdAt.toISOString(),
  deletedAt:   p.deletedAt ? p.deletedAt.toISOString() : null,
  createdByName: p.createdByName ?? null,
  primaryDoctor: primaryDoctorMap.get(p.id) ?? null,
 }));

 const adminName = session.user.name ?? 'Admin User';

 return (
  <PatientsTable
   patients={enriched}
   adminName={adminName}
   maleCount={maleCount}
   femaleCount={femaleCount}
   newThisMonth={newThisMonth}
   inactiveCount={inactiveCount}
  />
 );
}
