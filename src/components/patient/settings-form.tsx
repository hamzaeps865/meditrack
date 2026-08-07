'use client';

import { useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import {
  User, Phone, Mail, MapPin, Lock, Eye, EyeOff,
  CheckCircle2, LogOut, ShieldCheck, Loader2,
  AlertCircle, Heart, Bell,
} from 'lucide-react';
import { updateOwnProfile, changeOwnPassword } from '@/server/actions/patient-self.actions';

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm ' +
  'text-foreground placeholder:text-muted-foreground/60 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SectionCard({
  title, icon: Icon, children, accent,
}: {
  title: string;
  icon: typeof User;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden
      ${accent ? `border-${accent}-100` : 'border-border'}`}>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/10">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Toast({
  type, message,
}: {
  type: 'success' | 'error';
  message: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
      animate-in slide-in-from-top-2 duration-300
      ${type === 'success'
        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        : 'bg-red-50 border border-red-200 text-red-700'}`}>
      {type === 'success'
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />}
      {message}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialName:             string;
  initialPhone:            string;
  initialAddress:          string;
  initialEmergencyContact: string;
  email:                   string;
}

export default function PatientSettingsForm({
  initialName,
  initialPhone,
  initialAddress,
  initialEmergencyContact,
  email,
}: Props) {
  // Profile state
  const [name,             setName]             = useState(initialName);
  const [phone,            setPhone]            = useState(initialPhone);
  const [address,          setAddress]          = useState(initialAddress);
  const [emergencyContact, setEmergencyContact] = useState(initialEmergencyContact);
  const [profileMsg,       setProfileMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPendingProfile, startProfile]        = useTransition();

  // Password state
  const [currentPw,    setCurrentPw]    = useState('');
  const [newPw,        setNewPw]        = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [showNewPw,    setShowNewPw]    = useState(false);
  const [pwMsg,        setPwMsg]        = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPendingPw,  startPw]         = useTransition();

  // Notification prefs (UI only — no persistence layer yet)
  const [emailReminders, setEmailReminders] = useState(true);
  const [smsReminders,   setSmsReminders]   = useState(false);

  // ── Profile save ────────────────────────────────────────────────────────────
  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    startProfile(async () => {
      try {
        await updateOwnProfile({ name, phone, address, emergencyContact });
        setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
      } catch (err: any) {
        setProfileMsg({ type: 'error', text: err?.message ?? 'Failed to save profile.' });
      }
      setTimeout(() => setProfileMsg(null), 4000);
    });
  }

  // ── Password save ────────────────────────────────────────────────────────────
  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    startPw(async () => {
      try {
        await changeOwnPassword({ currentPassword: currentPw, newPassword: newPw });
        setPwMsg({ type: 'success', text: 'Password changed successfully.' });
        setCurrentPw('');
        setNewPw('');
      } catch (err: any) {
        setPwMsg({ type: 'error', text: err?.message ?? 'Failed to change password.' });
      }
      setTimeout(() => setPwMsg(null), 4000);
    });
  }

  return (
    <div className="space-y-4">

      {/* ── Personal Information ── */}
      <SectionCard title="Personal Information" icon={User}>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                minLength={2}
                className={inputCls}
              />
            </Field>
            <Field label="Phone Number">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </Field>
            <Field label="Email Address">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  disabled
                  className={`${inputCls} pl-9 cursor-not-allowed opacity-60`}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Email address cannot be changed directly.
              </p>
            </Field>
            <Field label="Emergency Contact">
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Name and phone number"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </Field>
            <Field label="Address">
              <div className="relative col-span-full">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your home address"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </Field>
          </div>

          {profileMsg && <Toast type={profileMsg.type} message={profileMsg.text} />}

          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={isPendingProfile}
              className="h-10 px-6 rounded-xl text-sm font-bold text-white
                hover:opacity-90 transition-opacity disabled:opacity-60
                flex items-center gap-2"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              {isPendingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPendingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ── Password & Security ── */}
      <SectionCard title="Password & Security" icon={Lock}>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div className="space-y-3 max-w-sm">
            <Field label="Current Password">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="New Password">
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {newPw.length > 0 && (
                <div className="mt-1.5">
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        newPw.length < 6   ? 'w-1/4 bg-red-400'   :
                        newPw.length < 8   ? 'w-2/4 bg-amber-400' :
                        newPw.length < 12  ? 'w-3/4 bg-blue-400'  :
                                             'w-full bg-emerald-400'
                      }`}
                    />
                  </div>
                  <p className={`text-[10px] mt-0.5 ${
                    newPw.length < 6   ? 'text-red-500'   :
                    newPw.length < 8   ? 'text-amber-500' :
                    newPw.length < 12  ? 'text-blue-500'  :
                                         'text-emerald-500'
                  }`}>
                    {newPw.length < 6  ? 'Too short' :
                     newPw.length < 8  ? 'Weak' :
                     newPw.length < 12 ? 'Good' :
                                         'Strong'}
                  </p>
                </div>
              )}
            </Field>
          </div>

          {/* Security notice */}
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">
              Your medical records are encrypted and never shared without consent.
            </p>
          </div>

          {pwMsg && <Toast type={pwMsg.type} message={pwMsg.text} />}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={isPendingPw || !currentPw || !newPw}
              className="h-10 px-6 rounded-xl text-sm font-bold text-white
                hover:opacity-90 transition-opacity disabled:opacity-50
                flex items-center gap-2"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              {isPendingPw && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPendingPw ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ── Notification Preferences ── */}
      <SectionCard title="Notification Preferences" icon={Bell}>
        <div className="space-y-4">
          {[
            {
              label:  'Email Appointment Reminders',
              desc:   'Receive reminders 24 hours before your appointment.',
              value:  emailReminders,
              setter: setEmailReminders,
            },
            {
              label:  'SMS Reminders',
              desc:   'Get a text message reminder before each visit.',
              value:  smsReminders,
              setter: setSmsReminders,
            },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">{pref.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{pref.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pref.value}
                onClick={() => pref.setter((v) => !v)}
                className={`h-6 w-11 rounded-full flex items-center px-0.5 shrink-0
                  transition-colors duration-200
                  ${pref.value ? 'justify-end' : 'justify-start bg-muted'}`}
                style={pref.value ? { backgroundColor: '#1E3A5F' } : undefined}
              >
                <div className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Sign Out ── */}
      <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-red-50 bg-red-50/30">
          <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
            <LogOut className="h-3.5 w-3.5 text-red-500" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Account</h3>
        </div>
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Sign out</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sign out of your patient account on this device.
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg border
              border-red-200 text-sm font-medium text-red-600
              hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
