import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getLabOrderForPatient } from '@/server/actions/lab-orders.actions';
import { getActivePatient } from '@/server/actions/active-patient';
import NotificationBell from '@/components/shared/notification-bell';
import { format } from 'date-fns';
import { ArrowLeft, FileText, FlaskConical } from 'lucide-react';

export default async function PatientLabReportPage({ params }: { params: Promise<{ id: string }> }) {
 const session = await auth();
 if (!session || session.user.role !== 'patient') redirect('/login');

 const active = await getActivePatient();
 if (!active) redirect('/patient/appointments');

 const { id } = await params;
 const order = await getLabOrderForPatient(active.id, id);

 if (!order || !order.result) redirect('/patient/lab-results');

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
     <Link href="/patient/lab-results" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
      <ArrowLeft className="h-4 w-4" /> Back
     </Link>
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-8 max-w-3xl mx-auto">
    <div className="bg-white border border-border  overflow-hidden">
     <div className="border-b border-border px-6 py-5">
      <div className="flex items-center gap-3">
       <div className="h-10 w-10 bg-primary/10 flex items-center justify-center">
        <FlaskConical className="h-5 w-5 text-primary" />
       </div>
       <div>
        <h1 className="text-xl font-bold text-foreground">{order.testName}</h1>
        <p className="text-sm text-muted-foreground">
         {order.completedAt ? `Completed ${format(new Date(order.completedAt), 'MMM d, yyyy')}` : 'Completed lab report'}
        </p>
       </div>
      </div>
     </div>

     <div className="px-6 py-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
       <FileText className="h-4 w-4" /> Report Details
      </div>

      {order.instructions && (
       <div className=" border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Instructions</p>
        <p className="text-sm text-foreground">{order.instructions}</p>
       </div>
      )}

      <div className=" border border-border p-4">
       <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Result</p>
       <p className="text-sm leading-7 text-foreground whitespace-pre-wrap">{order.result}</p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
       <Link href={`/patient/lab-results/${order.id}/print`} target="_blank" className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
        <FileText className="h-4 w-4" /> Print Report
       </Link>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
