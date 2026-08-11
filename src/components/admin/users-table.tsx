'use client';

import { useState, useMemo } from 'react';
import {
  Search, Users, ShieldCheck, UserCheck, ChevronLeft, ChevronRight,
  HelpCircle, X, SlidersHorizontal, Filter
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import RoleSelect from '@/components/admin/role-select';
import EditUserName from '@/components/admin/edit-user-name';
import { format } from 'date-fns';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'receptionist' | 'patient' | 'nurse' | 'pharmacist' | 'lab';
  createdAt: string | Date;
}

interface UsersTableProps {
  users: UserRecord[];
  currentUserId: string;
  adminName: string;
}

const PAGE_SIZE = 10;

const avatarPalette = [
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

function getInitials(name: string) {
  if (!name) return 'U';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function avatarColor(name: string) {
  if (!name) return avatarPalette[0];
  return avatarPalette[name.charCodeAt(0) % avatarPalette.length];
}

function pageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const nums: (number | 'ellipsis')[] = [];
  nums.push(1);
  if (current > 3) nums.push('ellipsis');
  for (let n = Math.max(2, current - 1); n <= Math.min(total - 1, current + 1); n++) nums.push(n);
  if (current < total - 2) nums.push('ellipsis');
  if (total > 1) nums.push(total);
  return nums;
}

export default function UsersTable({ users, currentUserId, adminName }: UsersTableProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'newest' | 'oldest' | 'name' | 'role'>('newest');
  const [page, setPage] = useState(1);

  // Category counts
  const totalCount = users.length;
  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);
  const doctorCount = useMemo(() => users.filter((u) => u.role === 'doctor').length, [users]);
  const receptionistCount = useMemo(() => users.filter((u) => u.role === 'receptionist').length, [users]);
  const nurseCount = useMemo(() => users.filter((u) => u.role === 'nurse').length, [users]);
  const pharmacistCount = useMemo(() => users.filter((u) => u.role === 'pharmacist').length, [users]);
  const labCount = useMemo(() => users.filter((u) => u.role === 'lab').length, [users]);
  const patientCount = useMemo(() => users.filter((u) => u.role === 'patient').length, [users]);
  const staffCount = totalCount - patientCount;

  // Filter & Sort
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (q) {
        const nameMatch = u.name.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        const roleMatch = u.role.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !roleMatch) return false;
      }
      return true;
    });

    // Sort
    if (sortKey === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortKey === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortKey === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === 'role') {
      list.sort((a, b) => a.role.localeCompare(b.role));
    }

    return list;
  }, [users, search, roleFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);

  const filterTabs = [
    { key: 'all', label: 'All Users', count: totalCount },
    { key: 'admin', label: 'Admins', count: adminCount },
    { key: 'doctor', label: 'Doctors', count: doctorCount },
    { key: 'receptionist', label: 'Receptionists', count: receptionistCount },
    { key: 'nurse', label: 'Nurses', count: nurseCount },
    { key: 'pharmacist', label: 'Pharmacists', count: pharmacistCount },
    { key: 'lab', label: 'Lab Techs', count: labCount },
    { key: 'patient', label: 'Patients', count: patientCount },
  ];

  return (
    <div className="min-h-full bg-[#f0f7f3]">
      {/* ── Top Bar with Search Engine ── */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30 ">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-800/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search users by name, email, or role..."
            className="w-full h-10 pl-10 pr-9 border border-border bg-emerald-50/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:bg-white transition-all  rounded-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            type="button"
            aria-label="Help"
            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors border border-transparent hover:border-border"
          >
            <HelpCircle className="h-4.5 w-4.5 text-emerald-800/70" />
          </button>
          <div className="pl-3 border-l border-border flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-foreground leading-none">{adminName}</p>
              <p className="text-[10px] text-emerald-800/60 mt-0.5 uppercase tracking-wide font-semibold">
                Super Administrator
              </p>
            </div>
            <div className="h-9 w-9 bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shrink-0 ">
              {getInitials(adminName)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Container ── */}
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">User Management</h1>
            <p className="text-sm text-emerald-800/70 mt-1">
              {totalCount} registered users in the platform — assign roles, edit names, and manage access privileges.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 bg-emerald-950 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              RBAC Enabled
            </div>
          </div>
        </div>

        {/* Filter Bar & Role Tabs */}
        <div className="bg-white border border-border p-3  space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/60">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
              <Filter className="h-3.5 w-3.5" />
              Filter by Role:
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
              <select
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value as 'newest' | 'oldest' | 'name' | 'role');
                  setPage(1);
                }}
                className="h-8 px-2.5 border border-border bg-white text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-700/20 transition-colors"
              >
                <option value="newest">Joined (Newest)</option>
                <option value="oldest">Joined (Oldest)</option>
                <option value="name">Name (A–Z)</option>
                <option value="role">Role</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setRoleFilter(tab.key);
                  setPage(1);
                }}
                className={`h-8 px-3 text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                  roleFilter === tab.key
                    ? 'bg-emerald-900 text-white border-emerald-900 '
                    : 'bg-muted/30 text-emerald-900/80 border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-none font-bold ${
                    roleFilter === tab.key ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Table Container ── */}
        <div className="bg-white border border-border  overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-[1.5fr_2fr_1.2fr_1.8fr_1fr] px-5 py-3 border-b border-border bg-emerald-900/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900">User / Name</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900">Email Address</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900">Joined Date</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900">Role / Access</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900 text-right">Actions</p>
          </div>

          {/* Rows */}
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Users className="h-10 w-10 text-emerald-800/30" />
              <p className="text-sm font-semibold text-foreground">No users found</p>
              <p className="text-xs text-muted-foreground">
                {search ? `No matching users found for "${search}".` : 'No users registered under this role filter.'}
              </p>
              {(search || roleFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('all');
                    setPage(1);
                  }}
                  className="mt-2 text-xs font-semibold text-emerald-800 hover:underline"
                >
                  Clear search and filters
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pageItems.map((u) => {
                const isSelf = u.id === currentUserId;
                const formattedDate = format(new Date(u.createdAt), 'MMM dd, yyyy');

                return (
                  <li
                    key={u.id}
                    className="grid grid-cols-[1.5fr_2fr_1.2fr_1.8fr_1fr] items-center px-5 py-3.5 hover:bg-emerald-50/30 transition-colors"
                  >
                    {/* Name + Initials */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`h-9 w-9 flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(
                          u.name
                        )}`}
                      >
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                          {u.name}
                          {isSelf && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                              YOU
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="min-w-0 pr-2">
                      <p className="text-sm text-emerald-900/70 truncate font-medium">{u.email}</p>
                    </div>

                    {/* Joined Date */}
                    <div>
                      <p className="text-xs text-muted-foreground tabular-nums">{formattedDate}</p>
                    </div>

                    {/* Role Select Component */}
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
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-border bg-muted/10 gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {filteredUsers.length === 0 ? 0 : pageStart + 1} to{' '}
              {Math.min(pageStart + PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length.toLocaleString()} entries
              {filteredUsers.length !== totalCount && ` (filtered from ${totalCount} total users)`}
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 flex items-center justify-center border border-border bg-white text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {pageNumbers(currentPage, totalPages).map((n, i) =>
                n === 'ellipsis' ? (
                  <span key={`e-${i}`} className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`h-8 min-w-[32px] px-1.5 flex items-center justify-center text-xs font-semibold border transition-colors ${
                      n === currentPage
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'bg-white border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {n}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 flex items-center justify-center border border-border bg-white text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Insight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-white border border-border p-5 ">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Users</span>
            </div>
            <p className="text-3xl font-extrabold text-foreground">{totalCount}</p>
            <p className="text-xs text-emerald-800/60 mt-1 font-medium">Across all system roles</p>
          </div>

          <div className="bg-emerald-950 text-white border border-emerald-900 p-5 ">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-emerald-900 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Staff Members</span>
            </div>
            <p className="text-3xl font-extrabold text-white">{staffCount}</p>
            <p className="text-xs text-emerald-300/80 mt-1 font-medium">Admins, Doctors, Nurses & Staff</p>
          </div>

          <div className="bg-white border border-border p-5 ">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-amber-50 text-amber-700 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registered Patients</span>
            </div>
            <p className="text-3xl font-extrabold text-foreground">{patientCount}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Patient portal access</p>
          </div>
        </div>
      </div>
    </div>
  );
}
