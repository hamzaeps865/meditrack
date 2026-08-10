import { getAllUsers } from '@/server/actions/users.actions';
import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import UsersTable from '@/components/admin/users-table';

export default async function UsersPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/login');

  const allUsers = await getAllUsers();

  return (
    <UsersTable
      users={allUsers}
      currentUserId={session.user.id}
      adminName={session.user.name ?? 'Admin'}
    />
  );
}

