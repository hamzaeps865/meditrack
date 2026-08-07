'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Search, Plus, MoreVertical, ChevronLeft, ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';

const AddDoctorModal = dynamic(
  () => import('@/components/admin/add-doctor-modal'),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doctor {
  id:             string;
  name:           string | null;
  email:          string | null;
  specialization: string;
  licenseNumber:  string;
  availDays:      number;
  availHours:     number;
  patientCount:   number;
}

interface Props {
  doctors: Doctor[];
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
  return avatarPalette[name.charCodeAt(0) % avatarPalette.length];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DoctorsTable({ doctors: initialDoctors }: Props) {
  const [doctors, setDoctors] = useState(initialDoctors);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [page,    setPage]    = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Track which doctors are toggled OFF (active by default)
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(new Set());

  // Unique specializations for filter chips
  const specializations = useMemo(
    () => Array.from(new Set(doctors.map((d) => d.specialization))).sort(),
    [doctors],
  );

  // Filter chips: All + top 2 specializations + Active Only
  const filterChips = [
    { key: 'all',    label: 'All Specialists' },
    ...specializations.slice(0, 2).map((s) => ({ key: s, label: s })),
    { key: 'active', label: 'Active Only' },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => {
      if (q) {
        const name = (d.name ?? '').toLowerCase();
        const spec = d.specialization.toLowerCase();
        if (!name.includes(q) && !spec.includes(q)) return false;
      }
      if (filter === 'active' && inactiveIds.has(d.id)) return false;
      if (filter !== 'all' && filter !== 'active' && d.specialization !== filter) return false;
      return true;
    });
  }, [doctors, search, filter, inactiveIds]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart   = (currentPage - 1) * PAGE_SIZE;
  const pageItems   = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  

  function toggleActive(id: string) {
    setInactiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-full bg-[#f5f7fa]">

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
            placeholder="Search by name or specialization"
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-muted/40
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
          />
        </div>
        <NotificationBell />
      </div>

      {/* ── Page body ── */}
      <div className="px-6 py-5 max-w-6xl mx-auto">

        {/* Page header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Doctors</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {doctors.length} total doctor{doctors.length !== 1 ? 's' : ''} registered in the system
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-primary
              text-primary-foreground text-sm font-semibold hover:bg-primary/90
              transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Doctor
          </button>
        </div>

        {/* Filter chips + sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Filters:</span>
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => { setFilter(chip.key); setPage(1); }}
                className={`h-8 px-3.5 rounded-full text-sm font-medium border
                  transition-colors
                  ${filter === chip.key
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-white text-muted-foreground border-border hover:border-primary/30'}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Recently Added
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">

          {/* Header row */}
          <div className="grid grid-cols-[1fr_160px_130px_140px_110px_100px_60px]
            px-5 py-3 border-b border-border bg-muted/20">
            {['NAME', 'SPECIALIZATION', 'LICENSE ID', 'AVAILABILITY', 'PATIENTS', 'STATUS', 'ACTIONS'].map((h, i) => (
              <p key={h}
                className={`text-[10px] font-bold uppercase tracking-widest
                  text-muted-foreground ${i === 6 ? 'text-center' : ''}`}>
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20
              text-muted-foreground gap-2">
              <p className="text-sm font-medium">No doctors found</p>
              <p className="text-xs">
                {search ? 'Try a different search term.' : 'Add your first doctor to get started.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pageItems.map((doc) => {
                const isActive = !inactiveIds.has(doc.id);
                const name     = doc.name ?? 'Unknown';

                return (
                  <li key={doc.id}
                    className="grid grid-cols-[1fr_160px_130px_140px_110px_100px_60px]
                      items-center px-5 py-4 hover:bg-muted/20 transition-colors relative">

                    {/* Name + email */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center
                        text-xs font-bold shrink-0 ${avatarColor(name)}`}>
                        {getInitials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          Dr. {name}
                        </p>
                        {doc.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Specialization */}
                    <div>
                      <p className="text-sm text-muted-foreground">{doc.specialization}</p>
                    </div>

                    {/* License */}
                    <div>
                      <p className="text-sm text-muted-foreground font-mono">
                        #{doc.licenseNumber}
                      </p>
                    </div>

                    {/* Availability */}
                    <div>
                      {doc.availDays === 0 ? (
                        <p className="text-sm text-muted-foreground/50 italic">Not set</p>
                      ) : (
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{doc.availDays}</span>
                          <span className="text-muted-foreground"> days · </span>
                          <span className="font-semibold">{doc.availHours}</span>
                          <span className="text-muted-foreground"> hrs</span>
                        </p>
                      )}
                    </div>

                    {/* Patients */}
                    <div>
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{doc.patientCount}</span>
                        <span className="text-muted-foreground"> active</span>
                      </p>
                    </div>

                    {/* Status toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleActive(doc.id)}
                        aria-label={isActive ? 'Deactivate' : 'Activate'}
                        className={`h-6 w-11 rounded-full flex items-center px-0.5
                          transition-colors
                          ${isActive ? 'bg-primary justify-end' : 'bg-muted justify-start'}`}
                      >
                        <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>

                    {/* Actions menu */}
                    <div className="flex justify-center relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenu(openMenu === doc.id ? null : doc.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-md
                          text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openMenu === doc.id && (
                        <div className="absolute right-0 top-8 z-20 w-44 bg-white
                          border border-border rounded-xl shadow-lg py-1 overflow-hidden">
                          <Link
                            href={`/admin/doctors/${doc.id}`}
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                            onClick={() => setOpenMenu(null)}
                          >
                            View Profile
                          </Link>
                          <Link
                            href={`/admin/doctors/${doc.id}/availability`}
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                            onClick={() => setOpenMenu(null)}
                          >
                            Manage Availability
                          </Link>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => setOpenMenu(null)}
                          >
                            Remove Doctor
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
              Showing {pageStart + 1} to{' '}
              {Math.min(pageStart + PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-4 rounded-lg border border-border bg-white text-sm
                  font-medium text-foreground hover:bg-muted transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-4 rounded-lg border border-border bg-white text-sm
                  font-medium text-foreground hover:bg-muted transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Doctor modal */}
      {showModal && (
        <AddDoctorModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
