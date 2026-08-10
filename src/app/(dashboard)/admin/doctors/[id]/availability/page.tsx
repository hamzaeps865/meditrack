import { auth } from '@/server/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/server/db';
import { doctors, doctorAvailability, users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, Search, Plus, ChevronRight } from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import AvailabilityManager from '@/components/doctor/availability-manager';

export default async function AdminDoctorAvailabilityPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const session = await auth();
 if (!session || session.user.role !== 'admin') redirect('/login');

 const { id } = await params;

 // Load doctor + user
 const [doctorRow] = await db
  .select({
   id:       doctors.id,
   specialization: doctors.specialization,
   licenseNumber: doctors.licenseNumber,
   name:      users.name,
   email:     users.email,
  })
  .from(doctors)
  .leftJoin(users, eq(doctors.userId, users.id))
  .where(eq(doctors.id, id));

 if (!doctorRow) notFound();

 // Load availability windows
 const windows = await db
  .select()
  .from(doctorAvailability)
  .where(eq(doctorAvailability.doctorId, id))
  .orderBy(doctorAvailability.dayOfWeek, doctorAvailability.startTime);

 const doctorName = doctorRow.name ?? 'Unknown';

 return (
  <div className="min-h-full bg-[#f0f7f3]">

   {/* ── Top bar ── */}
   <div className="bg-white border-b border-border px-6 py-3
    flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-sm">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
      text-muted-foreground" />
     <input type="text" placeholder="Search..."
      className="w-full h-9 pl-9 pr-4 border border-border
       bg-muted/40 text-sm placeholder:text-muted-foreground
       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white" />
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-5 max-w-3xl mx-auto">

    {/* Breadcrumb */}
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
     <Link href="/admin/doctors"
      className="flex items-center gap-1.5 hover:text-foreground transition-colors">
      <ArrowLeft className="h-3.5 w-3.5" />
      Doctors
     </Link>
     <ChevronRight className="h-3.5 w-3.5" />
     <Link href={`/admin/doctors/${id}`}
      className="hover:text-foreground transition-colors">
      Dr. {doctorName}
     </Link>
     <ChevronRight className="h-3.5 w-3.5" />
     <span className="text-foreground font-medium">Availability</span>
    </div>

    {/* Header */}
    <div className="flex items-start justify-between gap-4 mb-6">
     <div>
      <h1 className="text-2xl font-bold text-foreground">Availability</h1>
      <p className="text-sm text-muted-foreground mt-1">
       Managing schedule for <span className="font-semibold text-foreground">
        Dr. {doctorName}
       </span>
       {doctorRow.specialization && (
        <span className="text-muted-foreground/70"> · {doctorRow.specialization}</span>
       )}
      </p>
     </div>
     <a href="#schedule"
      className="flex items-center gap-2 h-10 px-5 bg-primary
       text-primary-foreground text-sm font-semibold hover:bg-primary/90
       transition-colors shrink-0">
      <Plus className="h-4 w-4" />
      Add Time Block
     </a>
    </div>

    {/* Reuse the same AvailabilityManager the doctor uses */}
    <div id="schedule">
     <AvailabilityManager
      doctorId={doctorRow.id}
      initialWindows={windows.map((w) => ({
       id:    w.id,
       dayOfWeek: w.dayOfWeek,
       startTime: w.startTime,
       endTime:  w.endTime,
      }))}
     />
    </div>
   </div>
  </div>
 );
}
