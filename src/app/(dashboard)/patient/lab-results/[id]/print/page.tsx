import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getLabOrderForPatient } from '@/server/actions/lab-orders.actions';
import { getActivePatient } from '@/server/actions/active-patient';
import PrintTrigger from '@/components/patient/print-trigger';
import { format } from 'date-fns';
import { FlaskConical } from 'lucide-react';

export default async function PatientLabReportPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'patient') redirect('/login');

  const active = await getActivePatient();
  if (!active) redirect('/patient/lab-results');

  const { id } = await params;
  const order = await getLabOrderForPatient(active.id, id);

  if (!order || !order.result) redirect('/patient/lab-results');

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 print:p-0">
      <PrintTrigger />
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-8 w-8 text-blue-700" />
            <div>
              <h1 className="text-2xl font-bold">MediTrack</h1>
              <p className="text-xs text-gray-500">Lab Report</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Printed: {format(new Date(), 'MMM d, yyyy')}</p>
            <p>Report ID: {order.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Test</p>
          <p className="text-lg font-semibold">{order.testName}</p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Result</p>
          <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{order.result}</p>
        </div>

        {order.instructions && (
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Instructions</p>
            <p className="mt-2 text-sm">{order.instructions}</p>
          </div>
        )}
      </div>
    </div>
  );
}
