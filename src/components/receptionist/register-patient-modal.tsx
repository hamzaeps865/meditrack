'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPatient } from '@/server/actions/patients.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Props {
  onClose: () => void;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center
        justify-center text-[11px] font-bold shrink-0">
        {step}
      </div>
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
        {title}
      </p>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, children, className = '',
}: {
  label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const inputCls = `w-full h-10 px-3 rounded-lg border border-border bg-background
  text-sm text-foreground placeholder:text-muted-foreground
  focus:outline-none focus:ring-2 focus:ring-primary/20`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPatientModal({ onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Form state
  const [name, setName]                         = useState('');
  const [dob, setDob]                           = useState('');
  const [gender, setGender]                     = useState('');
  const [phone, setPhone]                       = useState('');
  const [email, setEmail]                       = useState('');
  const [address, setAddress]                   = useState('');
  const [emergencyContactName, setEcName]       = useState('');
  const [emergencyRelation, setEcRelation]      = useState('');
  const [emergencyPhone, setEcPhone]            = useState('');
  const [bloodGroup, setBloodGroup]             = useState('');
  const [allergies, setAllergies]               = useState('');

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Combine emergency contact fields into one string
    const emergencyContact = [emergencyContactName, emergencyRelation, emergencyPhone]
      .filter(Boolean)
      .join(' — ');

    startTransition(async () => {
      try {
        await createPatient({
          name,
          dob,
          gender,
          phone,
          email:            email || undefined,
          address:          address || undefined,
          emergencyContact: emergencyContact || undefined,
          bloodGroup:       (bloodGroup as any) || undefined,
          allergies:        allergies || undefined,
        });
        toast.success(`Patient "${name}" registered successfully`);
        router.refresh();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Registration failed');
      }
    });
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-end
        bg-black/40 backdrop-blur-sm"
    >
      <div
        className="relative h-full w-full max-w-[480px] bg-card shadow-2xl
          flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Register New Patient"
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Register New Patient</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fill in the clinical registration details
            </p>
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

        {/* ── Scrollable form ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="px-6 py-5 flex flex-col gap-6 flex-1">

            {/* ── 1. Basic Information ── */}
            <div className="rounded-xl border border-border p-4 bg-background">
              <SectionHeader step={1} title="Basic Information" />
              <div className="flex flex-col gap-3">
                <Field label="Full Name">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    minLength={2}
                    className={inputCls}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date of Birth">
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Gender">
                    <div className="relative">
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        required
                        className={`${inputCls} appearance-none pr-8`}
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </Field>
                </div>
              </div>
            </div>

            {/* ── 2. Contact Details ── */}
            <div className="rounded-xl border border-border p-4 bg-background">
              <SectionHeader step={2} title="Contact Details" />
              <div className="flex flex-col gap-3">
                <Field label="Phone Number">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Email Address">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Residential Address">
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, City, State, ZIP"
                    rows={2}
                    className={`${inputCls} h-auto py-2.5 resize-none`}
                  />
                </Field>
              </div>
            </div>

            {/* ── 3. Emergency Contact ── */}
            <div className="rounded-xl border border-border p-4 bg-background">
              <SectionHeader step={3} title="Emergency Contact" />
              <div className="flex flex-col gap-3">
                <Field label="Contact Name">
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEcName(e.target.value)}
                    placeholder="Next of kin name"
                    className={inputCls}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Relationship">
                    <input
                      type="text"
                      value={emergencyRelation}
                      onChange={(e) => setEcRelation(e.target.value)}
                      placeholder="e.g. Spouse"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Emergency Phone">
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEcPhone(e.target.value)}
                      placeholder="+1 (555) 111-2222"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── 4. Medical Basics ── */}
            <div className="rounded-xl border border-border p-4 bg-background">
              <SectionHeader step={4} title="Medical Basics" />
              <div className="flex flex-col gap-3">
                <Field label="Blood Group">
                  <div className="relative">
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className={`${inputCls} appearance-none pr-8`}
                    >
                      <option value="">Select blood group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </Field>
                <Field label="Known Allergies">
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Peanuts (comma-separated)"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0">
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
              {isPending ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
