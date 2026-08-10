import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { doctors, doctorAvailability } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { Search, ChevronDown, Plus } from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import AvailabilityManager from '@/components/doctor/availability-manager';

export default async function DoctorAvailabilityPage() {
  const session = await auth();
  if (!session || session.user.role !== 'doctor') redirect('/login');

  const [doctorRow] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, session.user.id));

  if (!doctorRow) redirect('/doctor');

  const windows = await db
    .select()
    .from(doctorAvailability)
    .where(eq(doctorAvailability.doctorId, doctorRow.id))
    .orderBy(doctorAvailability.dayOfWeek, doctorAvailability.startTime);

  const doctorName = session.user.name ?? 'Doctor';

  return (
    <div className="min-h-full bg-[#f0f7f3]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-6 py-3
        flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
            text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patients, records, or dates..."
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-muted/40
              text-sm placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground
              hover:text-primary transition-colors"
          >
            Dr. {doctorName}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="px-6 py-6 max-w-3xl mx-auto">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Availability</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set your recurring weekly hours. Changes apply to future bookings only.
            </p>
          </div>

          {/* This button opens the first available "Add block" inline form —
              handled inside the client component via a forwarded ref or simply
              by scrolling. For now it's a styled anchor to the table. */}
          <a
            href="#schedule"
            className="flex items-center gap-2 h-10 px-5 rounded-xl
              bg-primary text-primary-foreground text-sm font-semibold
              hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Time Block
          </a>
        </div>

        {/* Client-side interactive manager */}
        <div id="schedule">
          <AvailabilityManager
            doctorId={doctorRow.id}
            initialWindows={windows.map((w) => ({
              id:        w.id,
              dayOfWeek: w.dayOfWeek,
              startTime: w.startTime,
              endTime:   w.endTime,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
