import { getAllUsers } from '@/server/actions/users.actions';
import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import RoleSelect from '@/components/admin/role-select';
import { format } from 'date-fns';

export default async function UsersPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/login');

  const allUsers = await getAllUsers();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">
          {allUsers.length} registered users — assign roles to grant access
        </p>
      </div>

      <div className="bg-white rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-gray-500">{user.email}</TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  <RoleSelect
                    userId={user.id}
                    currentRole={user.role}
                    isSelf={user.id === session.user.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
