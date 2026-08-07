'use client';

import { useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import {
  User, Phone, Mail, MapPin, Lock, Eye, EyeOff,
  CheckCircle2, LogOut, ShieldCheck, Loader2,
  AlertCircle, Bell, Monitor, Volume2, Clock,
  Sparkles, RefreshCw, Shield, Layout,
} from 'lucide-react';
import {
  updateOwnReceptionistProfile,
  changeOwnReceptionistPassword,
} from '@/server/actions/receptionist-self.actions';

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 rounded-xl border border-border bg-white text-sm ' +
  'text-foreground placeholder:text-muted-foreground/60 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';

type Tab = 'profile' | 'desk' | 'security' | 'notifications';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5">{label}</label>
      {children}
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

interface Props {
  initialName:  string;
  initialEmail: string;
}

export default function ReceptionistSettingsForm({
  initialName,
  initialEmail,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile state
  const [name, setName]                   = useState(initialName);
  const [deskLocation, setDeskLocation]   = useState('Front Desk — Main Lobby (Station #2)');
  const [extension, setExtension]         = useState('Ext. 4021');
  const [profileMsg, setProfileMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPendingProfile, startProfile]  = useTransition();

  // Desk preferences state
  const [refreshInterval, setRefreshInterval] = useState('30');
  const [soundAlerts, setSoundAlerts]         = useState(true);
  const [defaultQueueView, setDefaultQueueView] = useState('all');
  const [autoConfirmCheckin, setAutoConfirmCheckin] = useState(true);
  const [deskSaved, setDeskSaved]             = useState(false);

  // Password state
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showNewPw, setShowNewPw]   = useState(false);
  const [pwMsg, setPwMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPendingPw, startPw]      = useTransition();

  // Notifications state
  const [emailAlerts, setEmailAlerts]       = useState(true);
  const [cancellationAlerts, setCancellationAlerts] = useState(true);
  const [doctorAbsenceAlerts, setDoctorAbsenceAlerts] = useState(true);
  const [notifSaved, setNotifSaved]         = useState(false);

  // ── Profile save ────────────────────────────────────────────────────────────
  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    startProfile(async () => {
      try {
        await updateOwnReceptionistProfile({ name });
        setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
      } catch (err: any) {
        setProfileMsg({ type: 'error', text: err?.message ?? 'Failed to save profile.' });
      }
      setTimeout(() => setProfileMsg(null), 4000);
    });
  }

  // ── Desk preferences save ────────────────────────────────────────────────────
  function handleDeskSave(e: React.FormEvent) {
    e.preventDefault();
    setDeskSaved(true);
    setTimeout(() => setDeskSaved(false), 2500);
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
        await changeOwnReceptionistPassword({ currentPassword: currentPw, newPassword: newPw });
        setPwMsg({ type: 'success', text: 'Password changed successfully.' });
        setCurrentPw('');
        setNewPw('');
      } catch (err: any) {
        setPwMsg({ type: 'error', text: err?.message ?? 'Failed to change password.' });
      }
      setTimeout(() => setPwMsg(null), 4000);
    });
  }

  // ── Notifications save ───────────────────────────────────────────────────────
  function handleNotificationsSave(e: React.FormEvent) {
    e.preventDefault();
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  }

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile',       label: 'Profile Information', icon: User },
    { key: 'desk',          label: 'Desk & Workstation',  icon: Monitor },
    { key: 'security',      label: 'Security & Password', icon: Lock },
    { key: 'notifications', label: 'Notifications',       icon: Bell },
  ];

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left Navigation ── */}
      <nav className="w-56 shrink-0 bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium
                transition-colors text-left border-b border-border/50 last:border-b-0
                ${isActive
                  ? 'text-white font-semibold'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}
              style={isActive ? { backgroundColor: '#1E3A5F' } : {}}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Right Content Area ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* ════ PROFILE INFORMATION ════ */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-4.5 w-4.5 text-primary" style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Profile Information</h2>
                <p className="text-xs text-muted-foreground">Manage your display name and contact details</p>
              </div>
            </div>

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
                <Field label="Email Address">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="email"
                      value={initialEmail}
                      disabled
                      className={`${inputCls} pl-9 cursor-not-allowed opacity-60 bg-muted/30`}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Managed by clinic administrator.</p>
                </Field>
                <Field label="Desk Location / Station">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={deskLocation}
                      onChange={(e) => setDeskLocation(e.target.value)}
                      placeholder="e.g. Main Lobby Desk"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </Field>
                <Field label="Extension / Phone">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={extension}
                      onChange={(e) => setExtension(e.target.value)}
                      placeholder="e.g. Ext. 402"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </Field>
              </div>

              {profileMsg && <Toast type={profileMsg.type} message={profileMsg.text} />}

              <div className="flex items-center justify-end pt-3 border-t border-border">
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
          </div>
        )}

        {/* ════ DESK & WORKSTATION PREFERENCES ════ */}
        {activeTab === 'desk' && (
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
              <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Monitor className="h-4.5 w-4.5 text-amber-600" style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Desk & Workstation Preferences</h2>
                <p className="text-xs text-muted-foreground">Customize queue behavior and reception views</p>
              </div>
            </div>

            <form onSubmit={handleDeskSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Live Queue Refresh Interval">
                  <div className="relative">
                    <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(e.target.value)}
                      className={`${inputCls} pl-9`}
                    >
                      <option value="15">Every 15 seconds</option>
                      <option value="30">Every 30 seconds</option>
                      <option value="60">Every 60 seconds</option>
                      <option value="manual">Manual refresh only</option>
                    </select>
                  </div>
                </Field>

                <Field label="Default Appointments Filter">
                  <div className="relative">
                    <Layout className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      value={defaultQueueView}
                      onChange={(e) => setDefaultQueueView(e.target.value)}
                      className={`${inputCls} pl-9`}
                    >
                      <option value="all">All Today's Appointments</option>
                      <option value="scheduled">Scheduled Only</option>
                      <option value="checked_in">Checked-in Only</option>
                    </select>
                  </div>
                </Field>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex items-center justify-between gap-4 py-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Sound Alert on Patient Check-in</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Play a subtle audio chime when a patient completes check-in.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundAlerts}
                    onClick={() => setSoundAlerts((v) => !v)}
                    className={`h-6 w-11 rounded-full flex items-center px-0.5 shrink-0 transition-colors
                      ${soundAlerts ? 'justify-end' : 'justify-start bg-muted'}`}
                    style={soundAlerts ? { backgroundColor: '#1E3A5F' } : undefined}
                  >
                    <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 py-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Require Check-in Confirmation Modal</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Show a quick confirmation prompt before marking a patient as checked-in.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoConfirmCheckin}
                    onClick={() => setAutoConfirmCheckin((v) => !v)}
                    className={`h-6 w-11 rounded-full flex items-center px-0.5 shrink-0 transition-colors
                      ${autoConfirmCheckin ? 'justify-end' : 'justify-start bg-muted'}`}
                    style={autoConfirmCheckin ? { backgroundColor: '#1E3A5F' } : undefined}
                  >
                    <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>

              {deskSaved && (
                <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Preferences saved
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <button
                  type="submit"
                  className="h-10 px-6 rounded-xl text-sm font-bold text-white
                    hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#1E3A5F' }}
                >
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ════ SECURITY & PASSWORD ════ */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
              <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Lock className="h-4.5 w-4.5 text-blue-600" style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Password & Account Security</h2>
                <p className="text-xs text-muted-foreground">Update your login password and review session details</p>
              </div>
            </div>

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
                    </div>
                  )}
                </Field>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-blue-50/70 border border-blue-100 px-3.5 py-2.5">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700">
                  Password changes take effect immediately across all active login sessions.
                </p>
              </div>

              {pwMsg && <Toast type={pwMsg.type} message={pwMsg.text} />}

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <button
                  type="submit"
                  disabled={isPendingPw || !currentPw || !newPw}
                  className="h-10 px-6 rounded-xl text-sm font-bold text-white
                    hover:opacity-90 transition-opacity disabled:opacity-50
                    flex items-center gap-2"
                  style={{ backgroundColor: '#1E3A5F' }}
                >
                  {isPendingPw && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isPendingPw ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ════ NOTIFICATIONS ════ */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
              <div className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <Bell className="h-4.5 w-4.5 text-purple-600" style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Notification Preferences</h2>
                <p className="text-xs text-muted-foreground">Manage real-time alerts for receptionist events</p>
              </div>
            </div>

            <form onSubmit={handleNotificationsSave} className="space-y-4">
              {[
                {
                  title: 'Email Alerts for Registration',
                  desc: 'Receive confirmation email whenever a new patient is registered.',
                  val: emailAlerts,
                  set: setEmailAlerts,
                },
                {
                  title: 'Appointment Cancellation Alerts',
                  desc: 'Get notified immediately when a doctor or patient cancels an appointment.',
                  val: cancellationAlerts,
                  set: setCancellationAlerts,
                },
                {
                  title: 'Doctor Absence / Schedule Shift Alerts',
                  desc: 'Receive alerts if a doctor updates schedule availability or calls out.',
                  val: doctorAbsenceAlerts,
                  set: setDoctorAbsenceAlerts,
                },
              ].map((item) => (
                <div key={item.title} className="flex items-center justify-between gap-4 py-2 border-b border-border/60 last:border-b-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.val}
                    onClick={() => item.set((v) => !v)}
                    className={`h-6 w-11 rounded-full flex items-center px-0.5 shrink-0 transition-colors
                      ${item.val ? 'justify-end' : 'justify-start bg-muted'}`}
                    style={item.val ? { backgroundColor: '#1E3A5F' } : undefined}
                  >
                    <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              ))}

              {notifSaved && (
                <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium pt-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Notification settings saved
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <button
                  type="submit"
                  className="h-10 px-6 rounded-xl text-sm font-bold text-white
                    hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#1E3A5F' }}
                >
                  Save Notification Settings
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Sign Out Card ── */}
        <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Sign out of Session</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Safely log out of your receptionist account on this desk workstation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl border
              border-red-200 text-sm font-semibold text-red-600
              hover:bg-red-50 transition-colors shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
