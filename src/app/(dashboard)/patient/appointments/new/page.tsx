import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { doctors, users, doctorAvailability, appointments } from '@/server/db/schema';
import { eq, and, gte, lte, notInArray } from 'drizzle-orm';
import PatientBookingForm from '@/components/patient/booking-form';
import { getActivePatient } from '@/server/actions/active-patient';
import { startOfDay, endOfDay } from 'date-fns';

export default async function PatientNewAppointmentPage() {
 const session = await auth();
 if (!session || session.user.role !== 'patient') redirect('/login');

 // Resolve the active patient (self or a managed family member)
 const active = await getActivePatient();

 if (!active) {
  redirect('/patient/appointments');
 }

 // All doctors with their availability
 const doctorRows = await db
  .select({
   id:       doctors.id,
   specialization: doctors.specialization,
   name:      users.name,
  })
  .from(doctors)
  .leftJoin(users, eq(doctors.userId, users.id))
  .orderBy(users.name);

 // Availability windows per doctor
 const availRows = await db
  .select()
  .from(doctorAvailability)
  .orderBy(doctorAvailability.doctorId, doctorAvailability.dayOfWeek);

 // Group by doctorId
 const availMap: Record<string, { dayOfWeek: string; startTime: string; endTime: string }[]> = {};
 for (const row of availRows) {
  if (!availMap[row.doctorId]) availMap[row.doctorId] = [];
  availMap[row.doctorId].push({
   dayOfWeek: row.dayOfWeek,
   startTime: row.startTime,
   endTime:  row.endTime,
  });
 }

 // ── Fetch ALL existing appointments for ALL doctors (from today forward) ──
 // This is efficient because we only fetch active (non-cancelled) future slots.
 const today = new Date();
 const existingAppts = await db
  .select({
   doctorId: appointments.doctorId,
   scheduledAt: appointments.scheduledAt,
   status: appointments.status,
  })
  .from(appointments)
  .where(
   and(
    gte(appointments.scheduledAt, startOfDay(today)),
    notInArray(appointments.status, ['cancelled', 'no_show']),
   ),
  );

 // Build a map: doctorId → array of "YYYY-MM-DDTHH:MM" booked slot keys
 const bookedSlotsMap: Record<string, Set<string>> = {};
 for (const appt of existingAppts) {
  if (!bookedSlotsMap[appt.doctorId]) bookedSlotsMap[appt.doctorId] = new Set();
  const d = new Date(appt.scheduledAt);
  const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  bookedSlotsMap[appt.doctorId].add(key);
 }
 // Convert Sets to arrays for the client component props
 const bookedSlots: Record<string, string[]> = {};
 for (const [docId, slotSet] of Object.entries(bookedSlotsMap)) {
  bookedSlots[docId] = Array.from(slotSet);
 }

 return (
  <PatientBookingForm
   patientId={active.id}
   patientName={active.name}
   doctors={doctorRows.map((d) => ({
    id:       d.id,
    name:      d.name,
    specialization: d.specialization,
    availability:  availMap[d.id] ?? [],
   }))}
   bookedSlots={bookedSlots}
  />
 );
}
