'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createDoctor } from '@/server/actions/doctors.actions';
import {
  X, Loader2, AlertCircle, ChevronDown,
  Eye, EyeOff, Info,
} from 'lucide-react';

// ─── Specializations ──────────────────────────────────────────────────────────

const SPECIALIZATIONS = [
  'Cardiologist', 'Dermatologist', 'Emergency Medicine', 'Endocrinologist',
  'Gastroenterologist', 'General Practitioner', 'General Surgeon', 'Gynecologist',
  'Hematologist', 'Internist', 'Nephrologist', 'Neurologist', 'Oncologist',
  'Ophthalmologist', 'Orthopedic Surgeon', 'Otolaryngologist', 'Pediatrician',
  'Psychiatrist', 'Pulmonologist', 'Radiologist', 'Rheumatologist',
  'Senior Cardiologist', 'Urologist',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full h-12 px-4 rounded-xl border border-border bg-muted/30 text-sm ' +
  'text-foreground placeholder:text-muted-foreground/60 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors';

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props { onClose: () => void }

export default function AddDoctorModal({ onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error,    setError]    = useState<string | null>(null);
  const [showPw,   setShowPw]   = useState(false);

  // Whether the typed email belongs to an existing user (checked on blur)
  const [emailExists, setEmailExists] = useState(false);
  const emailCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    name:           '',
    specialization: '',
    licenseNumber:  '',
    email:          '',
    password:       '',
  });

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Check whether the email already has an account (client-side hint only)
  async function handleEmailBlur() {
    if (!form.email.includes('@')) return;
    try {
      const res = await fetch(
        `/api/check-email?email=${encodeURIComponent(form.email)}`,
      );
      if (res.ok) {
        const { exists } = await res.json();
        setEmailExists(!!exists);
      }
    } catch {
      // silent — the server action will handle the real upsert logic
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Password is only required for new accounts
    if (!emailExists && form.password.trim().length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    startTransition(async () => {
      try {
        await createDoctor(form);
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save doctor.');
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose} />

      {/* Slide-in panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white
          shadow-2xl flex flex-col border-l-4"
        style={{ borderLeftColor: '#6366f1' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <h2 className="text-lg font-bold text-foreground">Add New Doctor</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 flex items-center justify-center rounded-full
              text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form body */}
        <form
          id="add-doctor-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 space-y-5 pb-4"
        >
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200
              bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Full Name */}
          <Field label="Full Name">
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Dr. Sarah Johnson"
              className={inputCls}
            />
          </Field>

          {/* Specialization */}
          <Field label="Specialization">
            <div className="relative">
              <select
                required
                value={form.specialization}
                onChange={(e) => set('specialization', e.target.value)}
                className={`${inputCls} appearance-none pr-10 cursor-pointer`}
              >
                <option value="" disabled>Select Specialization</option>
                {SPECIALIZATIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2
                -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </Field>

          {/* License ID */}
          <Field label="License ID">
            <input
              type="text"
              required
              value={form.licenseNumber}
              onChange={(e) => set('licenseNumber', e.target.value)}
              placeholder="#L. 00000-X"
              className={inputCls}
            />
          </Field>

          {/* Email */}
          <Field label="Email Address">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => { set('email', e.target.value); setEmailExists(false); }}
              onBlur={handleEmailBlur}
              placeholder="doctor@example.com"
              className={inputCls}
            />
            {/* Existing-user notice */}
            {emailExists && (
              <div className="mt-2 flex items-start gap-2 rounded-lg
                bg-amber-50 border border-amber-200 px-3 py-2">
                <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-snug">
                  This email already has an account. Their role will be promoted to
                  <span className="font-semibold"> Doctor</span>. The password field
                  below will be ignored.
                </p>
              </div>
            )}
          </Field>

          {/* Password — shown always, greyed + labelled when existing user */}
          <Field label={emailExists ? 'Password (not applied — existing account)' : 'Password'}>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={emailExists ? 'Ignored for existing accounts' : 'Min. 8 characters'}
                disabled={emailExists}
                required={!emailExists}
                minLength={emailExists ? undefined : 8}
                className={`${inputCls} pr-12
                  ${emailExists ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {!emailExists && (
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye    className="h-4 w-4" />}
                </button>
              )}
            </div>
            {!emailExists && (
              <p className="text-xs text-muted-foreground mt-1.5">
                The doctor should change this on first login.
              </p>
            )}
          </Field>
        </form>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-border grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl border border-border text-sm font-semibold
              text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-doctor-form"
            disabled={isPending}
            className="h-12 rounded-xl text-sm font-bold text-white transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
            style={{ backgroundColor: '#1E3A5F' }}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Doctor
          </button>
        </div>
      </div>
    </>
  );
}
