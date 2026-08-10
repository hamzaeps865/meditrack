import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import NurseSettingsForm from '@/components/nurse/nurse-settings-form';
import NotificationBell from '@/components/shared/notification-bell';
import { User } from 'lucide-react';

export default async function NurseSettingsPage() {
 const session = await auth();
 if (!session || (session.user.role !== 'nurse' && session.user.role !== 'admin')) {
  redirect('/login');
 }

 const [userRow] = await db
  .select({ id: users.id, name: users.name, email: users.email })
  .from(users)
  .where(eq(users.id, session.user.id));

 if (!userRow) redirect('/login');

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="h-8 w-8 bg-emerald-100 flex items-center justify-center shrink-0">
      <User className="h-4 w-4 text-emerald-700" />
     </div>
     <div className="hidden sm:block">
      <p className="text-sm font-semibold text-foreground leading-none">{session.user.name}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Nurse Settings</p>
     </div>
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-8 max-w-2xl mx-auto">
    <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
    <p className="text-sm text-muted-foreground mb-6">Manage your account and password.</p>

    <NurseSettingsForm
     initialName={userRow.name}
     initialEmail={userRow.email}
     userId={userRow.id}
    />
   </div>
  </div>
 );
}
