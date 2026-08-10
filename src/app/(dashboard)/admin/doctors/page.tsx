import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getAllDoctorsAdmin } from '@/server/actions/doctors.actions';
import DoctorsTable from '@/components/admin/doctors-table';

export default async function AdminDoctorsPage() {
 const session = await auth();
 if (!session || session.user.role !== 'admin') redirect('/login');

 const doctors = await getAllDoctorsAdmin();

 return <DoctorsTable doctors={doctors} />;
}
