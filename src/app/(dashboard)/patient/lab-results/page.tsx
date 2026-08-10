import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getLabOrdersForPatient } from '@/server/actions/lab-orders.actions';
import { getActivePatient } from '@/server/actions/active-patient';
import NotificationBell from '@/components/shared/notification-bell';
import LabExplainButton from '@/components/ai/lab-explain-button';
import { format } from 'date-fns';
import { FlaskConical, CheckCircle2, Clock, FileText, Printer } from 'lucide-react';

export default async function PatientLabResultsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'patient') redirect('/login');

  const active = await getActivePatient();
  if (!active) redirect('/patient/appointments');

  const labOrders = await getLabOrdersForPatient(active.id);

  const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
    ordered:    { icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50' },
    completed:  { icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
    cancelled:  { icon: FlaskConical,  color: 'text-muted-foreground', bg: 'bg-muted' },
  };

  return (
    <div className="min-h-full bg-[#f0f7f3]">
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Lab Results</p>
        <NotificationBell />
      </div>

      <div className="px-6 py-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Lab Tests & Results</h1>
        <p className="text-sm text-muted-foreground mb-6">{labOrders.length} completed report{labOrders.length !== 1 ? 's' : ''}</p>

        {labOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
            <FlaskConical className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No completed lab reports yet</p>
            <p className="text-xs text-muted-foreground mt-1">Reports from your completed lab orders will appear here once the lab finishes them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {labOrders.map((order) => {
              const cfg = statusConfig[order.status] ?? statusConfig.ordered;
              const Icon = cfg.icon;
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{order.testName}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(order.createdAt), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                      {order.status}
                    </span>
                  </div>

                  {order.instructions && (
                    <p className="text-xs text-muted-foreground mb-2">{order.instructions}</p>
                  )}

                  {order.result && (
                    <div className="border-t border-border pt-2 mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5 flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Result
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-line">{order.result}</p>
                      {order.completedAt && (
                        <p className="text-[10px] text-muted-foreground mt-1">Completed: {format(new Date(order.completedAt), 'MMM d, yyyy')}</p>
                      )}
                      {/* AI Explain button */}
                      <div className="mt-2">
                        <LabExplainButton
                          testName={order.testName}
                          result={order.result}
                          patientName={session.user.name}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    <Link href={`/patient/lab-results/${order.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors">
                      <FileText className="h-3.5 w-3.5" /> View Report
                    </Link>
                    <Link href={`/patient/lab-results/${order.id}/print`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity">
                      <Printer className="h-3.5 w-3.5" /> Print
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
