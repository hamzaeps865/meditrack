import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';

const roleHome: Record<string, string> = {
  admin: '/admin',
  doctor: '/doctor',
  receptionist: '/receptionist',
  patient: '/patient',
};


export default async function RootPage() {
  const session = await auth();
  if (!session) redirect('/login');
  redirect(roleHome[session.user.role] ?? '/login');
}