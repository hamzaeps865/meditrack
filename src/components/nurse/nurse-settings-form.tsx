'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOwnNurseProfile } from '@/server/actions/nurse-self.actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 const [email, setEmail] = useState(initialEmail);

 function handleSaveProfile() {
  if (!name.trim()) {
   toast.error('Name is required.');
   return;
  }
  if (!emailRegex.test(email.trim())) {
   toast.error('Please enter a valid email address.');
   return;
  }

  startTransition(async () => {
   try {
    await updateOwnNurseProfile({ name: name.trim(), email: email.trim() });
    toast.success('Profile updated.');
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update.');
   }
  });
 }

 const inputCls =
  'w-full h-10 px-3 border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';
 const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5';

 return (
  <div className="space-y-5">
   {/* Profile */}
    <div className="premium-card premium-card-pad">
    <h2 className="text-sm font-bold text-foreground mb-4">Profile</h2>
    <div className="space-y-4">
     <div>
      <label className={labelCls}>Name</label>
      <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
     </div>
     <div>
      <label className={labelCls}>Email</label>
      <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
     </div>
     <button
      type="button"
      onClick={handleSaveProfile}
      disabled={isPending}
      className="h-10 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
     >
      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      Save
     </button>
    </div>
   </div>

   <p className="text-xs text-muted-foreground text-center px-4">
    Password changes are managed by the system administrator. Please contact your admin if you need a password reset.
   </p>
  </div>
 );
}
