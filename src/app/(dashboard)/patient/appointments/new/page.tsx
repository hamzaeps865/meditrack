import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { doctors, users, doctorAvailability } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import PatientBookingForm from '@/components/patient/booking-form';
import { getActivePatient } from '@/server/actions/active-patient';

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
      id:             doctors.id,
      specialization: doctors.specialization,
      name:           users.name,
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
      endTime:   row.endTime,
    });
  }

  return (
    <PatientBookingForm
      patientId={active.id}
      patientName={active.name}
      doctors={doctorRows.map((d) => ({
        id:             d.id,
        name:           d.name,
        specialization: d.specialization,
        availability:   availMap[d.id] ?? [],
      }))}
    />
  );
}
