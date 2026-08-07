import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { patients, doctors, users, doctorAvailability } from '@/server/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import PatientBookingForm from '@/components/patient/booking-form';

export default async function PatientNewAppointmentPage() {
  const session = await auth();
  if (!session || session.user.role !== 'patient') redirect('/login');

  // Resolve patient record by email
  const [patientRow] = await db
    .select({ id: patients.id, name: patients.name })
    .from(patients)
    .where(
      and(
        eq(patients.email, session.user.email ?? ''),
        isNull(patients.deletedAt),
      ),
    );

  if (!patientRow) {
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
      patientId={patientRow.id}
      patientName={patientRow.name}
      doctors={doctorRows.map((d) => ({
        id:             d.id,
        name:           d.name,
        specialization: d.specialization,
        availability:   availMap[d.id] ?? [],
      }))}
    />
  );
}
