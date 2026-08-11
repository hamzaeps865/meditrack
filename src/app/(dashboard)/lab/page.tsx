import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getLabQueue, getLabSummary } from '@/server/actions/lab-actions';
import LabQueueClient from '@/components/lab/lab-queue-client';
import NotificationBell from '@/components/shared/notification-bell';
import { FlaskConical, Clock, CheckCircle2, Zap } from 'lucide-react';

export default async function LabDashboardPage() {
 const session = await auth();
 if (!session || (session.user.role !== 'lab' && session.user.role !== 'admin')) {
  redirect('/login');
 }

 const [queue, summary] = await Promise.all([
  getLabQueue(),
  getLabSummary(),
 ]);

 // Serialize dates
 const serializedQueue = queue.map((q) => ({
  ...q,
  createdAt: q.createdAt.toISOString(),
  collectedAt: q.collectedAt?.toISOString() ?? null,
 }));

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="h-8 w-8 bg-emerald-100 flex items-center justify-center shrink-0">
      <FlaskConical className="h-4 w-4 text-emerald-700" />
     </div>
     <div className="hidden sm:block">
      <p className="text-sm font-semibold text-foreground leading-none">{session.user.name}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Laboratory</p>
     </div>
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-8 max-w-4xl mx-auto">
    <div className="mb-6">
     <h1 className="text-2xl font-bold text-foreground">Lab Queue</h1>
     <p className="text-sm text-muted-foreground mt-1">{summary.pending} tests awaiting processing</p>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-4 gap-3 mb-6">
     <div className="bg-white border border-border p-4 ">
      <div className="h-9 w-9 bg-amber-50 flex items-center justify-center mb-2">
       <Clock className="h-4 w-4 text-amber-600" />
      </div>
      <p className="text-2xl font-bold text-foreground">{summary.pending}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
     </div>
     <div className="bg-white border border-border p-4 ">
      <div className="h-9 w-9 bg-emerald-50 flex items-center justify-center mb-2">
       <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      </div>
      <p className="text-2xl font-bold text-foreground">{summary.completed}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
     </div>
     <div className="bg-white border border-border p-4 ">
      <div className="h-9 w-9 bg-emerald-50 flex items-center justify-center mb-2">
       <FlaskConical className="h-4 w-4 text-emerald-700" />
      </div>
      <p className="text-2xl font-bold text-foreground">{summary.total}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Total Tests</p>
     </div>
     <div className="bg-white border border-border p-4 ">
      <div className={`h-9 w-9 flex items-center justify-center mb-2 ${summary.statCount > 0 ? 'bg-rose-50' : 'bg-muted'}`}>
       <Zap className={`h-4 w-4 ${summary.statCount > 0 ? 'text-rose-600' : 'text-muted-foreground'}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{summary.statCount}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Stat (Urgent)</p>
     </div>
    </div>

    <LabQueueClient queue={serializedQueue} />
   </div>
  </div>
 );
}
