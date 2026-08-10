import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { doctors } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { Search, ShieldCheck } from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import DoctorSettingsForm from '@/components/doctor/doctor-settings-form';

export default async function DoctorSettingsPage() {
 const session = await auth();
 if (!session || session.user.role !== 'doctor') redirect('/login');

 const [doctorRow] = await db
  .select()
  .from(doctors)
  .where(eq(doctors.userId, session.user.id));

 const doctorName = session.user.name ?? '';
 const doctorEmail = session.user.email ?? '';

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   {/* ── Top bar ── */}
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-md">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
     <input
      type="text"
      placeholder="Search patients, records..."
      className="w-full h-9 pl-9 pr-4 border border-border bg-muted/40 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
     />
    </div>
    <div className="flex items-center gap-2">
     <NotificationBell />
    </div>
   </div>

   <div className="px-6 py-5 max-w-3xl mx-auto">
    {/* Header */}
    <div className="mb-6">
     <h1 className="text-lg font-bold text-foreground">Settings</h1>
     <p className="text-sm text-muted-foreground mt-0.5">
      Manage your account, preferences, and clinical profile.
     </p>
    </div>

    {/* Profile banner */}
    <div className="premium-card premium-card-pad mb-4 flex items-center gap-4">
     <div className="h-14 w-14 bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
      {doctorName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}
     </div>
     <div className="flex-1 min-w-0">
      <p className="text-base font-bold text-foreground">Dr. {doctorName}</p>
      <p className="text-sm text-muted-foreground">{doctorEmail}</p>
      {doctorRow && (
       <p className="text-xs text-primary mt-0.5">{doctorRow.specialization}</p>
      )}
     </div>
     <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-700">
      <ShieldCheck className="h-3 w-3" />
      Active
     </span>
    </div>

    {/* Editable settings */}
    <DoctorSettingsForm
     initialName={doctorName}
     initialEmail={doctorEmail}
     initialSpecialization={doctorRow?.specialization ?? ''}
     licenseNumber={doctorRow?.licenseNumber ?? ''}
    />
   </div>
  </div>
 );
}
