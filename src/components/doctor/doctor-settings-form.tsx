'use client';

import { useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { updateOwnDoctorProfile, changeOwnDoctorPassword } from '@/server/actions/doctor-self.actions';
import { User, Stethoscope, Lock, LogOut, Bell, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DoctorSettingsFormProps {
 initialName: string;
 initialEmail: string;
 initialSpecialization: string;
 licenseNumber: string;
}

// ─── Small toggle (notifications are visual-only for now) ─────────────────────

function Toggle({ defaultOn = true, label }: { defaultOn?: boolean; label: string }) {
 const [on, setOn] = useState(defaultOn);
 return (
  <button
   type="button"
   onClick={() => setOn((v) => !v)}
   className="flex items-center gap-2.5 cursor-pointer"
  >
   <div className={`h-4 w-8 flex items-center px-0.5 transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}>
    <div className={`h-3 w-3 bg-white shadow-sm transition-all ${on ? 'ml-auto' : ''}`} />
   </div>
   <span className="text-xs text-foreground">{label}</span>
  </button>
 );
}

export default function DoctorSettingsForm({
 initialName,
 initialEmail,
 initialSpecialization,
 licenseNumber,
}: DoctorSettingsFormProps) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();

 // Profile fields
 const [name, setName] = useState(initialName);
 const [specialization, setSpecialization] = useState(initialSpecialization);

 // Password fields
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');

 function initials() {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
 }

 function handleSaveProfile() {
  startTransition(async () => {
   try {
    await updateOwnDoctorProfile({ name, specialization });
    toast.success('Profile updated successfully.');
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update profile.');
   }
  });
 }

 function handleChangePassword(e: React.FormEvent) {
  e.preventDefault();
  if (newPassword !== confirmPassword) {
   toast.error('New passwords do not match.');
   return;
  }
  startTransition(async () => {
   try {
    await changeOwnDoctorPassword({ currentPassword, newPassword });
    toast.success('Password changed successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to change password.');
   }
  });
 }

 function handleSignOut() {
  signOut({ callbackUrl: '/login' });
 }

 return (
  <div className="space-y-3 mb-4">
   {/* ── Profile Information ── */}
    <div className="premium-card premium-card-pad">
    <div className="flex items-start gap-3 mb-4">
     <div className="h-9 w-9 bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
      <User className="h-4 w-4 text-primary" />
     </div>
     <div className="flex-1">
      <p className="text-sm font-semibold text-foreground">Profile Information</p>
      <p className="text-xs text-muted-foreground mt-0.5">Your name and contact details.</p>
     </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-0 sm:ml-12">
     <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name</label>
      <input
       type="text"
       value={name}
       onChange={(e) => setName(e.target.value)}
       className="w-full h-10 px-3 border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
      />
     </div>
     <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
      <input
       type="email"
       value={initialEmail}
       disabled
       className="w-full h-10 px-3 border border-border bg-muted/50 text-sm text-muted-foreground cursor-not-allowed"
      />
     </div>
    </div>

    <div className="flex justify-end mt-4">
     <button
      type="button"
      onClick={handleSaveProfile}
      disabled={isPending}
      className="h-9 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
     >
      {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      Save Changes
     </button>
    </div>
   </div>

   {/* ── Clinical Profile ── */}
    <div className="premium-card premium-card-pad">
    <div className="flex items-start gap-3 mb-4">
     <div className="h-9 w-9 bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
      <Stethoscope className="h-4 w-4 text-primary" />
     </div>
     <div className="flex-1">
      <p className="text-sm font-semibold text-foreground">Clinical Profile</p>
      <p className="text-xs text-muted-foreground mt-0.5">Specialization (editable) and license (managed by admin).</p>
     </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-0 sm:ml-12">
     <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Specialization</label>
      <input
       type="text"
       value={specialization}
       onChange={(e) => setSpecialization(e.target.value)}
       className="w-full h-10 px-3 border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
      />
     </div>
     <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">License Number</label>
      <input
       type="text"
       value={licenseNumber}
       disabled
       className="w-full h-10 px-3 border border-border bg-muted/50 text-sm text-muted-foreground cursor-not-allowed"
      />
     </div>
    </div>
   </div>

   {/* ── Password & Security ── */}
    <div className="premium-card premium-card-pad">
    <div className="flex items-start gap-3 mb-4">
     <div className="h-9 w-9 bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
      <Lock className="h-4 w-4 text-primary" />
     </div>
     <div className="flex-1">
      <p className="text-sm font-semibold text-foreground">Password &amp; Security</p>
      <p className="text-xs text-muted-foreground mt-0.5">Change your password.</p>
     </div>
    </div>

    <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-4 ml-0 sm:ml-12">
     <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current Password</label>
      <input
       type="password"
       value={currentPassword}
       onChange={(e) => setCurrentPassword(e.target.value)}
       required
       className="w-full h-10 px-3 border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
      />
     </div>
     <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">New Password</label>
      <input
       type="password"
       value={newPassword}
       onChange={(e) => setNewPassword(e.target.value)}
       required
       minLength={8}
       className="w-full h-10 px-3 border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
      />
     </div>
     <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm New Password</label>
      <input
       type="password"
       value={confirmPassword}
       onChange={(e) => setConfirmPassword(e.target.value)}
       required
       minLength={8}
       className="w-full h-10 px-3 border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
      />
     </div>
     <div className="sm:col-span-3 flex justify-end">
      <button
       type="submit"
       disabled={isPending}
       className="h-9 px-5 border border-border bg-white text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
      >
       {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
       Update Password
      </button>
     </div>
    </form>
   </div>

   {/* ── Notifications ── */}
    <div className="premium-card premium-card-pad">
    <div className="flex items-start gap-3 mb-4">
     <div className="h-9 w-9 bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
      <Bell className="h-4 w-4 text-primary" />
     </div>
     <div className="flex-1">
      <p className="text-sm font-semibold text-foreground">Notifications</p>
      <p className="text-xs text-muted-foreground mt-0.5">Control which alerts you receive.</p>
     </div>
    </div>
    <div className="ml-0 sm:ml-12 space-y-2">
     <Toggle label="Appointment reminders" />
     <Toggle label="New patient check-in alerts" />
     <Toggle label="Schedule changes" />
    </div>
   </div>

   {/* ── Danger zone / Sign out ── */}
   <div className="bg-white border border-red-100 p-5 shadow-sm">
    <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">Account</h3>
    <div className="flex items-center justify-between">
     <div>
      <p className="text-sm font-medium text-foreground">Sign out</p>
      <p className="text-xs text-muted-foreground mt-0.5">Sign out of MediTrack on this device.</p>
     </div>
     <button
      type="button"
      onClick={handleSignOut}
      className="flex items-center gap-1.5 h-9 px-4 border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
     >
      <LogOut className="h-3.5 w-3.5" />
      Sign Out
     </button>
    </div>
   </div>
  </div>
 );
}
