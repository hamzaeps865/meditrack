import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getAllDoctors } from '@/server/actions/doctors.actions';
import NewAppointmentForm from '@/components/admin/new-appointment-form';

export default async function AdminNewAppointmentPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/login');

  const doctors = await getAllDoctors();

  return (
    <NewAppointmentForm
      doctors={doctors.map((d) => ({
        id:             d.id,
        name:           d.name,
        specialization: d.specialization,
      }))}
      adminName={session.user.name ?? 'Admin User'}
    />
  );
}
