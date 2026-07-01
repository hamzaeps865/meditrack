'use client';

import { useState, useTransition } from 'react';
import { assignRole } from '@/server/actions/users.actions';
import { toast } from 'sonner';

type Role = 'admin' | 'doctor' | 'receptionist' | 'patient';

const roleColors: Record<Role, string> = {
  admin:        'bg-red-100 text-red-700',
  doctor:       'bg-violet-100 text-violet-700',
  receptionist: 'bg-amber-100 text-amber-700',
  patient:      'bg-blue-100 text-blue-700',
};

interface RoleSelectProps {
  userId: string;
  currentRole: Role;
  isSelf: boolean;
}

export default function RoleSelect({ userId, currentRole, isSelf }: RoleSelectProps) {
  const [role, setRole] = useState<Role>(currentRole);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as Role;

    startTransition(async () => {
      try {
        await assignRole({ userId, role: newRole });
        setRole(newRole);
        toast.success('Role updated successfully');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update role');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {/* Badge showing current role */}
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleColors[role]}`}>
        {role}
      </span>

      {/* Dropdown to change role — disabled for self */}
      <select
        value={role}
        onChange={handleChange}
        disabled={isPending || isSelf}
        title={isSelf ? "You can't change your own role" : 'Change role'}
        className="text-sm border rounded-md px-2 py-1 bg-white text-gray-700
          disabled:opacity-40 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="patient">Patient</option>
        <option value="receptionist">Receptionist</option>
        <option value="doctor">Doctor</option>
        <option value="admin">Admin</option>
      </select>

      {isPending && (
        <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
      )}
    </div>
  );
}
