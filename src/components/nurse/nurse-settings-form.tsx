'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { updateOwnNurseProfile, changeOwnNursePassword } from '@/server/actions/nurse-self.actions';
import { Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function NurseSettingsForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  function handleSaveProfile() {
    startTransition(async () => {
      try {
        await updateOwnNurseProfile({ name });
        toast.success('Profile updated.');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update.');
      }
    });
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await changeOwnNursePassword({ currentPassword, newPassword });
        toast.success('Password changed.');
        setCurrentPassword('');
        setNewPassword('');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to change password.');
      }
    });
  }

  const inputCls =
    'w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5';

  return (
    <div className="space-y-5">
      {/* Profile */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="text-sm font-bold text-foreground mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Email (read-only)</label>
            <input className={`${inputCls} bg-muted/50 cursor-not-allowed`} value={initialEmail} disabled />
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isPending}
            className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="text-sm font-bold text-foreground mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className={labelCls}>Current Password</label>
            <input type="password" className={inputCls} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>New Password</label>
            <input type="password" className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
          </div>
          <button type="submit" disabled={isPending} className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60 flex items-center gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </form>
      </div>

      {/* Sign out */}
      <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Sign out</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sign out of MediTrack on this device.</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
