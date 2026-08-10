import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getCompletedLabOrders } from '@/server/actions/lab-actions';
import NotificationBell from '@/components/shared/notification-bell';
import { CheckCircle2, FlaskConical } from 'lucide-react';
import { format } from 'date-fns';

export default async function LabCompletedPage() {
  const session = await auth();
  if (!session || (session.user.role !== 'lab' && session.user.role !== 'admin')) {
    redirect('/login');
  }

  const completed = await getCompletedLabOrders(100);

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-semibold text-foreground">Completed Tests</p>
        </div>
        <NotificationBell />
      </div>

      <div className="px-6 py-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Completed Lab Tests</h1>
        <p className="text-sm text-muted-foreground mb-6">{completed.length} tests completed</p>

        {completed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
            <FlaskConical className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No completed tests yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{c.testName}</p>
                    <p className="text-xs text-muted-foreground">{c.patientName} · Completed by {c.performedByName ?? '—'}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{c.completedAt ? format(new Date(c.completedAt), 'MMM d, h:mm a') : '—'}</span>
                </div>
                {c.result && (
                  <div className="bg-muted/30 rounded-lg px-3 py-2 mt-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Result</p>
                    <p className="text-sm text-foreground whitespace-pre-line">{c.result}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
