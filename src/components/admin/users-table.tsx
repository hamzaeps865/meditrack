'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, Users as UsersIcon, ShieldCheck } from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import RoleSelect from '@/components/admin/role-select';
import EditUserName from '@/components/admin/edit-user-name';
import { format } from 'date-fns';

type Role = 'admin' | 'doctor' | 'receptionist' | 'patient' | 'nurse' | 'pharmacist' | 'lab';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date | string;
}

interface UsersTableProps {
  users: UserItem[];
  currentUserId: string;
}

const PAGE_SIZE = 10;

const avatarPalette = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function avatarColor(name: string) {
  if (!name) return avatarPalette[0];
  return avatarPalette[name.charCodeAt(0) % avatarPalette.length];
}

const ROLE_FILTERS = [
  { key: 'all', label: 'All Users' },
  { key: 'admin', label: 'Admins' },
  { key: 'doctor', label: 'Doctors' },
  { key: 'receptionist', label: 'Receptionists' },
  { key: 'nurse', label: 'Nurses' },
  { key: 'pharmacist', label: 'Pharmacists' },
  { key: 'lab', label: 'Lab Techs' },
  { key: 'patient', label: 'Patients' },
];

export default function UsersTable({ users: initialUsers, currentUserId }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const nameMatch = (u.name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const roleMatch = (u.role || '').toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !roleMatch) return false;
      }
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      {/* ── Top Search Bar ── */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search users by name, email, or role..."
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
          />
        </div>
        <NotificationBell />
      </div>

      {/* ── Page Body ── */}
      <div className="px-6 py-5 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {users.length} registered user{users.length !== 1 ? 's' : ''} — assign roles to grant access permissions
            </p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground mr-1">Filter Role:</span>
            {ROLE_FILTERS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => {
                  setRoleFilter(chip.key);
                  setPage(1);
                }}
                className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                  roleFilter === chip.key
                    ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                    : 'bg-white text-muted-foreground border-border hover:border-primary/30'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Sorted by Creation Date
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-[1.5fr_1.5fr_120px_1fr_90px] px-5 py-3 border-b border-border bg-muted/20">
            {['USER NAME', 'EMAIL ADDRESS', 'JOINED', 'ROLE & PERMISSIONS', 'ACTIONS'].map((h, i) => (
              <p
                key={h}
                className={`text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${
                  i === 4 ? 'text-right' : ''
                }`}
              >
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <UsersIcon className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs">
                {search || roleFilter !== 'all'
                  ? 'Try adjusting your search query or role filter.'
                  : 'No registered users in the system yet.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pageItems.map((u) => {
                const isSelf = u.id === currentUserId;
                const name = u.name || 'Unnamed User';

                return (
                  <li
                    key={u.id}
                    className="grid grid-cols-[1.5fr_1.5fr_120px_1fr_90px] items-center px-5 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    {/* User avatar + name */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(
                          name
                        )}`}
                      >
                        {getInitials(name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground truncate">{name}</p>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="min-w-0 pr-2">
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    </div>

                    {/* Joined date */}
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {u.createdAt ? format(new Date(u.createdAt), 'MMM dd, yyyy') : '—'}
                      </p>
                    </div>

                    {/* Role Select */}
                    <div>
                      <RoleSelect userId={u.id} currentRole={u.role} isSelf={isSelf} />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                      <EditUserName userId={u.id} currentName={u.name} isSelf={isSelf} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Showing {filteredUsers.length > 0 ? pageStart + 1 : 0} to{' '}
              {Math.min(pageStart + PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} user
              {filteredUsers.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-4 rounded-lg border border-border bg-white text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-4 rounded-lg border border-border bg-white text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
