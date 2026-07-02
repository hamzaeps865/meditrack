'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { X, User } from 'lucide-react';
import { updatePatient } from '@/server/actions/patients.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  emergencyContact: string | null;
}

interface Props {
  patient: PatientData;
  patientCode: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditPatientModal({ patient, patientCode, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Form state — pre-filled with current patient data
  const [name, setName]                       = useState(patient.name);
  const [phone, setPhone]                     = useState(patient.phone);
  const [email, setEmail]                     = useState(patient.email ?? '');
  const [address, setAddress]                 = useState(patient.address ?? '');
  const [emergencyContact, setEmergencyContact] = useState(patient.emergencyContact ?? '');

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      try {
        await updatePatient(patient.id, {
          name,
          phone,
          email:            email || undefined,
          address:          address || undefined,
          emergencyContact: emergencyContact || undefined,
        });
        toast.success('Patient details updated');
        router.refresh();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Update failed');
      }
    });
  }

  // Initials avatar
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-end
        bg-black/40 backdrop-blur-sm"
    >
      <div
        className="relative h-full w-full max-w-[460px] bg-card shadow-2xl
          flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Edit Patient Details"
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Edit Patient Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full
              text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto flex flex-col"
        >
          <div className="px-6 py-5 flex flex-col gap-5 flex-1">

            {/* Patient identity card */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="relative shrink-0">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center
                  justify-center text-muted-foreground">
                  <User className="h-7 w-7" />
                </div>
                {/* Initials badge */}
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full
                  bg-primary text-primary-foreground flex items-center justify-center
                  text-[10px] font-bold border-2 border-card">
                  {initials}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{patient.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: #{patientCode}
                </p>
              </div>
            </div>

            <hr className="border-border" />

            {/* ── Full Name ── */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background
                  text-sm text-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* ── Phone + Email ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background
                    text-sm text-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background
                    text-sm text-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* ── Address ── */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Residential Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background
                  text-sm text-foreground resize-none
                  focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* ── Emergency Contact ── */}
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">
                Emergency Contact
              </p>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Contact Name &amp; Phone
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. Sarah Jenkins — +1 (555) 902-1845"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background
                    text-sm text-foreground placeholder:text-muted-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Format: Name, relationship, and phone number
                </p>
              </div>
            </div>

          </div>

          {/* ── Footer actions ── */}
          <div className="px-6 py-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-border text-foreground
                text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground
                text-sm font-semibold hover:bg-primary/90
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
