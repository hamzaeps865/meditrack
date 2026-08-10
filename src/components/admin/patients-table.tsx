'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { softDeletePatient } from '@/server/actions/patients.actions';
import { toast } from 'sonner';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Search, UserPlus, MoreVertical,
  ChevronLeft, ChevronRight, Calendar,
  Download, Printer, HelpCircle,
  TrendingUp, Users, UserMinus,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';

const RegisterPatientModal = dynamic(
  () => import('@/components/receptionist/register-patient-modal'),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminPatient {
  id:            string;
  name:          string;
  dob:           string | null;
  gender:        string;
  phone:         string;
  createdAt:     string;
  deletedAt:     string | null;
  createdByName: string | null;
  primaryDoctor: string | null;
}

interface Props {
  patients:     AdminPatient[];
  adminName:    string;
  maleCount:    number;
  femaleCount:  number;
  newThisMonth: number;
  inactiveCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const avatarPalette = [
  'bg-emerald-100 text-emerald-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
];

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}
function avatarColor(name: string) {
  return avatarPalette[name.charCodeAt(0) % avatarPalette.length];
}
function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}
function patientCode(id: string) {
  const digits = id.replace(/-/g, '').slice(0, 5).toUpperCase();
  return `#PAT-${digits}`;
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatientsTable({
  patients: initialPatients,
  adminName,
  maleCount,
  femaleCount,
  newThisMonth,
  inactiveCount,
}: Props) {
  const [search,      setSearch]      = useState('');
  const [statusTab,   setStatusTab]   = useState<'active' | 'inactive'>('active');
  const [page,        setPage]        = useState(1);
  const [openMenu,    setOpenMenu]    = useState<string | null>(null);
  const [showModal,   setShowModal]   = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const total = initialPatients.length;

  // Stats
  const malePercent   = total > 0 ? Math.round((maleCount   / total) * 100) : 50;
  const femalePercent = 100 - malePercent;

  // Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialPatients.filter((p) => {
      const isActive = !p.deletedAt;
      if (statusTab === 'active'   && !isActive) return false;
      if (statusTab === 'inactive' &&  isActive) return false;
      if (q) {
        const code = patientCode(p.id).toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.phone.toLowerCase().includes(q) &&
          !code.includes(q)
        ) return false;
      }
      return true;
    });
  }, [initialPatients, search, statusTab]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart   = (currentPage - 1) * PAGE_SIZE;
  const pageItems   = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="min-h-full bg-[#f0f7f3]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-6 py-3
        flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
            text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, phone, or patient ID"
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-muted/40
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <NotificationBell />
          <button type="button" aria-label="Help"
            className="h-8 w-8 flex items-center justify-center rounded-full
              text-muted-foreground hover:bg-muted transition-colors">
            <HelpCircle className="h-4 w-4" />
          </button>
          <div className="pl-2.5 border-l border-border flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-none">
                {adminName}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                Super Administrator
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary
              flex items-center justify-center text-xs font-bold shrink-0">
              {getInitials(adminName)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="px-6 py-5 max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Patients</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total.toLocaleString()} patients registered
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-10 px-5 rounded-xl
              text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
            style={{ backgroundColor: '#01411C' }}
          >
            <UserPlus className="h-4 w-4" />
            Register Patient
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4
          bg-white rounded-xl border border-border px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date range pill */}
            <button type="button"
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-border
                text-xs font-medium text-foreground bg-muted/30 hover:bg-muted transition-colors">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Registered: Last 30 Days
            </button>

            {/* Primary Doctor dropdown */}
            <button type="button"
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-border
                text-xs font-medium text-foreground bg-white hover:bg-muted transition-colors">
              Primary Doctor: All
              <ChevronRight className="h-3 w-3 rotate-90 text-muted-foreground" />
            </button>

            {/* Active / Inactive toggle */}
            <div className="flex items-center rounded-full border border-border
              bg-muted/30 overflow-hidden">
              {(['active', 'inactive'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setStatusTab(tab); setPage(1); }}
                  className={`h-8 px-4 text-xs font-semibold capitalize transition-colors
                    ${statusTab === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-1.5">
            <button type="button"
              className="h-8 w-8 flex items-center justify-center rounded-lg
                border border-border bg-white text-muted-foreground hover:text-foreground
                hover:bg-muted transition-colors">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button type="button"
              className="h-8 w-8 flex items-center justify-center rounded-lg
                border border-border bg-white text-muted-foreground hover:text-foreground
                hover:bg-muted transition-colors">
              <Printer className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm mb-4">

          {/* Header */}
          <div className="grid
            grid-cols-[110px_1fr_110px_120px_140px_120px_90px_90px_50px]
            px-5 py-3 border-b border-border bg-muted/20">
            {[
              'PATIENT ID', 'NAME', 'AGE/GENDER', 'PHONE',
              'PRIMARY DOCTOR', 'REGISTERED BY', 'REG. DATE', 'STATUS', 'ACTIONS',
            ].map((h, i) => (
              <p key={h}
                className={`text-[10px] font-bold uppercase tracking-widest
                  text-muted-foreground ${i === 8 ? 'text-center' : ''}`}>
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20
              text-muted-foreground gap-2">
              <p className="text-sm font-medium">No patients found</p>
              <p className="text-xs">
                {search ? 'Try a different search term.' : 'Register your first patient to get started.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pageItems.map((p) => {
                const age      = calcAge(p.dob);
                const isActive = !p.deletedAt;
                const code     = patientCode(p.id);

                return (
                  <li key={p.id}
                    className="grid grid-cols-[110px_1fr_110px_120px_140px_120px_90px_90px_50px]
                      items-center px-5 py-4 hover:bg-muted/20 transition-colors relative">

                    {/* Patient ID */}
                    <div>
                      <p className={`text-xs font-mono font-medium
                        ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {code}
                      </p>
                    </div>

                    {/* Name + avatar */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center
                        text-xs font-bold shrink-0 ${avatarColor(p.name)}`}>
                        {getInitials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/patients/${p.id}`}
                          className={`text-sm font-semibold hover:underline leading-tight
                            ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {p.name}
                        </Link>
                      </div>
                    </div>

                    {/* Age / Gender */}
                    <div>
                      <p className={`text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {age !== null ? age : '—'}
                        {p.gender && (
                          <span className="text-muted-foreground capitalize"> / {p.gender}</span>
                        )}
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <p className={`text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {p.phone}
                      </p>
                    </div>

                    {/* Primary Doctor */}
                    <div className="min-w-0 pr-2">
                      {p.primaryDoctor ? (
                        <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground/60'}`} />
                          <p className={`text-sm truncate leading-tight
                            ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {p.primaryDoctor}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground/50">Unassigned</span>
                      )}
                    </div>

                    {/* Registered By */}
                    <div className="min-w-0 pr-2">
                      <p className={`text-sm truncate
                        ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                        {p.createdByName ?? '—'}
                      </p>
                    </div>

                    {/* Reg. Date */}
                    <div>
                      <p className={`text-xs tabular-nums
                        ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {new Date(p.createdAt).toLocaleDateString('en-CA')}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px]
                        font-bold uppercase tracking-wide
                        ${isActive
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-muted text-emerald-800/60 border border-emerald-100'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Actions ⋮ */}
                    <div className="flex justify-center relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-md
                          text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openMenu === p.id && (
                        <div className="absolute right-0 top-8 z-20 w-44 bg-white
                          border border-border rounded-xl shadow-lg py-1 overflow-hidden">
                          <Link
                            href={`/admin/patients/${p.id}`}
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                            onClick={() => setOpenMenu(null)}
                          >
                            View Profile
                          </Link>
                          <Link
                            href={`/receptionist/appointments?patientId=${p.id}`}
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                            onClick={() => setOpenMenu(null)}
                          >
                            Book Appointment
                          </Link>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setOpenMenu(null);
                              if (confirm(`Deactivate patient ${p.name}? They will be marked as inactive.`)) {
                                startTransition(async () => {
                                  try {
                                    await softDeletePatient(p.id);
                                    toast.success('Patient deactivated.');
                                    router.refresh();
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : 'Failed to deactivate.');
                                  }
                                });
                              }
                            }}
                          >
                            Deactivate
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-5 py-3.5
            border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : pageStart + 1} to{' '}
              {Math.min(pageStart + PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length.toLocaleString()} entries
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg
                  border border-border bg-white text-muted-foreground
                  hover:bg-muted transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {pageNumbers(currentPage, totalPages).map((n, i) =>
                n === 'ellipsis' ? (
                  <span key={`e-${i}`}
                    className="h-7 w-7 flex items-center justify-center text-xs
                      text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`h-7 min-w-[28px] px-1 flex items-center justify-center
                      rounded-lg text-xs font-semibold border transition-colors
                      ${n === currentPage
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    {n}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-lg
                  border border-border bg-white text-muted-foreground
                  hover:bg-muted transition-colors disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom insight cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Growth */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center
                justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Growth</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              +{newThisMonth > 0 ? ((newThisMonth / Math.max(total - newThisMonth, 1)) * 100).toFixed(1) : '0.0'}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">vs. last month</p>
          </div>

          {/* Patient Demographics */}
          <div className="rounded-2xl p-5 text-white"
            style={{ backgroundColor: '#01411C' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest
              text-white/60 mb-2">
              Patient Demographics
            </p>
            <p className="text-lg font-bold text-white mb-0.5">
              Balanced Distribution
            </p>
            <p className="text-xs text-white/60 mb-4">
              Male {malePercent}% · Female {femalePercent}%
            </p>

            {/* Bar */}
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${malePercent}%`,
                  background: 'linear-gradient(90deg, #60a5fa, #f59e0b)',
                }}
              />
            </div>
          </div>

          {/* Drop-off */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-red-50 flex items-center
                justify-center shrink-0">
                <UserMinus className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-sm font-semibold text-foreground">Drop-off</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{inactiveCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Inactive this week</p>
          </div>
        </div>
      </div>

      {/* Register Patient modal */}
      {showModal && (
        <RegisterPatientModal
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
