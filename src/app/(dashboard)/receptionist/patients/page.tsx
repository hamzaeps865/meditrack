'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAllPatients } from '@/server/actions/patients.actions';
import {
  Search, Bell, Settings, UserPlus, MoreVertical,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const RegisterPatientModal = dynamic(
  () => import('@/components/receptionist/register-patient-modal'),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────
// TODO: align with the actual return shape of getAllPatients(). Fields below
// (patientCode, dateOfBirth, registeredAt) are assumed — rename to match your
// schema if they differ.
type Patient = {
  id: string;
  patientCode?: string | null;
  name: string;
  dateOfBirth?: string | null;
  phone: string;
  gender: string;
  bloodGroup?: string | null;
  registeredAt?: string | null;
};

const PAGE_SIZE = 10;

const avatarPalette = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
];

const bloodGroupStyles: Record<string, string> = {
  'O+': 'bg-red-50 text-red-600 border-red-100',
  'O-': 'bg-red-50 text-red-600 border-red-100',
  'A+': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'A-': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'B+': 'bg-violet-50 text-violet-600 border-violet-100',
  'B-': 'bg-violet-50 text-violet-600 border-violet-100',
  'AB+': 'bg-gray-100 text-gray-600 border-gray-200',
  'AB-': 'bg-gray-100 text-gray-600 border-gray-200',
};

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % avatarPalette.length;
  return avatarPalette[idx];
}

function calcAge(dob?: string | null) {
  if (!dob) return null;
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDate(value?: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(
    'en-US',
    opts ?? { month: 'short', day: '2-digit', year: 'numeric' },
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [registeredDate, setRegisteredDate] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    getAllPatients()
      .then((data: Patient[]) => setPatients(data))
      .finally(() => setLoading(false));
  }, []);

  const genders = useMemo(
    () => Array.from(new Set(patients.map((p) => p.gender).filter(Boolean))),
    [patients],
  );
  const bloodGroups = useMemo(
    () => Array.from(new Set(patients.map((p) => p.bloodGroup).filter(Boolean))) as string[],
    [patients],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (q) {
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.patientCode?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (gender && p.gender !== gender) return false;
      if (bloodGroup && p.bloodGroup !== bloodGroup) return false;
      if (registeredDate && p.registeredAt) {
        const d = new Date(p.registeredAt).toISOString().slice(0, 10);
        if (d !== registeredDate) return false;
      }
      return true;
    });
  }, [patients, search, gender, bloodGroup, registeredDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const hasActiveFilters = !!(search || gender || bloodGroup || registeredDate);

  function clearFilters() {
    setSearch('');
    setGender('');
    setBloodGroup('');
    setRegisteredDate('');
    setPage(1);
  }

  function pageNumbers() {
    const nums: (number | 'ellipsis')[] = [];
    const add = (n: number) => nums.push(n);
    add(1);
    if (currentPage > 3) nums.push('ellipsis');
    for (let n = Math.max(2, currentPage - 1); n <= Math.min(totalPages - 1, currentPage + 1); n++) {
      add(n);
    }
    if (currentPage < totalPages - 2) nums.push('ellipsis');
    if (totalPages > 1) add(totalPages);
    return nums;
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Settings"
            className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {patients.length.toLocaleString()} patients registered in the system
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Register Patient
        </button>
      </div>

      {showRegisterModal && (
        <RegisterPatientModal
          onClose={() => {
            setShowRegisterModal(false);
            // Refresh the list after registration
            getAllPatients().then((data: Patient[]) => setPatients(data));
          }}
        />
      )}

      {/* Search & filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone, or patient ID"
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-background text-sm
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={gender}
            onChange={(e) => { setGender(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Gender</option>
            {genders.map((g) => (
              <option key={g} value={g} className="capitalize">{g}</option>
            ))}
          </select>

          <select
            value={bloodGroup}
            onChange={(e) => { setBloodGroup(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Blood Group</option>
            {bloodGroups.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <input
            type="date"
            value={registeredDate}
            onChange={(e) => { setRegisteredDate(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-primary font-medium hover:underline ml-auto"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-card rounded-xl border border-border text-center py-20 text-muted-foreground">
          Loading patients...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border text-center py-20 text-muted-foreground">
          <p className="text-lg">No patients found</p>
          <p className="text-sm mt-1">
            {hasActiveFilters ? 'Try adjusting your filters.' : 'Register your first patient to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  {['Patient ID', 'Name', 'Age/DOB', 'Phone', 'Gender', 'Blood Group', 'Registered Date', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p, i) => {
                  const age = calcAge(p.dateOfBirth);
                  return (
                    <tr
                      key={p.id}
                      className={i !== pageItems.length - 1 ? 'border-b border-border' : ''}
                    >
                      <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                        {p.patientCode ?? `PT-${p.id.slice(0, 4).toUpperCase()}`}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/receptionist/patients/${p.id}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColor(p.name)}`}>
                            {getInitials(p.name)}
                          </span>
                          <span className="text-primary font-medium group-hover:underline whitespace-nowrap">
                            {p.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                        {age !== null ? `${age}y / ` : ''}{formatDate(p.dateOfBirth, { month: 'short', day: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{p.phone}</td>
                      <td className="px-5 py-4 text-muted-foreground capitalize whitespace-nowrap">{p.gender}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                            bloodGroupStyles[p.bloodGroup ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {p.bloodGroup ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                        {formatDate(p.registeredAt)}
                      </td>
                      <td className="px-5 py-4 relative">
                        <button
                          type="button"
                          aria-label="Actions"
                          onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openMenuId === p.id && (
                          <div className="absolute right-5 top-11 z-10 w-40 bg-card border border-border rounded-lg shadow-md py-1">
                            <Link
                              href={`/receptionist/patients/${p.id}`}
                              className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
                            >
                              View
                            </Link>
                            <Link
                              href={`/receptionist/patients/${p.id}/edit`}
                              className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
                            >
                              Edit
                            </Link>
                            <Link
                              href={`/receptionist/appointments/new?patientId=${p.id}`}
                              className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
                            >
                              Book Appointment
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length.toLocaleString()} patients
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageNumbers().map((n, i) =>
                n === 'ellipsis' ? (
                  <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`h-7 min-w-7 px-1.5 rounded-md text-xs font-medium transition-colors ${
                      n === currentPage
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}