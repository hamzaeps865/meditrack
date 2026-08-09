import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getPrescriptionForPrint } from '@/server/actions/prescriptions.actions';
import PrintTrigger from '@/components/patient/print-trigger';
import { format } from 'date-fns';
import { BriefcaseMedical } from 'lucide-react';

// ─── Printable Prescription ───────────────────────────────────────────────────
// Standalone page (no dashboard sidebar) styled for print → "Save as PDF".
// Accessible by admin, doctor (own), and patient (own) via the action's RBAC.

export default async function PrescriptionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;

  let data: Awaited<ReturnType<typeof getPrescriptionForPrint>>;
  try {
    data = await getPrescriptionForPrint(id);
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <p className="text-sm">Prescription not found or you don&apos;t have access.</p>
      </div>
    );
  }

  const generatedOn = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  const age = data.patient.dob
    ? Math.floor((Date.now() - new Date(data.patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 print:p-0">
      <PrintTrigger />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4">
          <div className="flex items-center gap-3">
            <BriefcaseMedical className="h-8 w-8 text-blue-700" />
            <div>
              <h1 className="text-2xl font-bold">MediTrack</h1>
              <p className="text-xs text-gray-500">Medical Prescription</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Rx #: {data.prescriptionId.slice(0, 8).toUpperCase()}</p>
            <p>{format(new Date(data.prescriptionCreatedAt), 'MMM d, yyyy')}</p>
          </div>
        </div>

        {/* Doctor info */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Prescribed By</p>
            <p className="font-semibold text-gray-900">Dr. {data.doctor.name ?? 'Unknown'}</p>
            {data.doctor.specialization && (
              <p className="text-gray-600">{data.doctor.specialization}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Date</p>
            <p className="font-semibold text-gray-900">{format(new Date(data.visitCreatedAt), 'EEEE, MMM d, yyyy')}</p>
          </div>
        </div>

        {/* Patient info */}
        <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Patient</p>
            <p className="font-semibold text-gray-900">{data.patient.name}</p>
            <p className="text-gray-600 capitalize">
              {data.patient.gender}{age !== null ? ` · ${age} yrs` : ''}
              {data.patient.bloodGroup ? ` · ${data.patient.bloodGroup}` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Contact</p>
            <p className="text-gray-600">{data.patient.phone}</p>
          </div>
        </div>

        {/* Diagnosis */}
        {data.diagnosis && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Diagnosis</p>
            <p className="text-sm text-gray-900">{data.diagnosis}</p>
          </div>
        )}

        {/* Chief complaint */}
        {data.chiefComplaint && (
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Chief Complaint</p>
            <p className="text-sm text-gray-900">{data.chiefComplaint}</p>
          </div>
        )}

        {/* Rx symbol + medicines */}
        <div className="border-t-2 border-gray-900 pt-4">
          <p className="text-3xl font-serif font-bold text-gray-900 mb-3">℞</p>

          {data.items.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No medicines prescribed.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 text-left">
                  <th className="py-2 pr-3 font-semibold text-gray-700">#</th>
                  <th className="py-2 pr-3 font-semibold text-gray-700">Medicine</th>
                  <th className="py-2 pr-3 font-semibold text-gray-700">Dosage</th>
                  <th className="py-2 pr-3 font-semibold text-gray-700">Frequency</th>
                  <th className="py-2 pr-3 font-semibold text-gray-700">Duration</th>
                  <th className="py-2 font-semibold text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={item.id} className="border-b border-gray-100 align-top">
                    <td className="py-2 pr-3 text-gray-500">{i + 1}</td>
                    <td className="py-2 pr-3 font-medium text-gray-900">{item.medicineName}</td>
                    <td className="py-2 pr-3 text-gray-700">{item.dosage}</td>
                    <td className="py-2 pr-3 text-gray-700">{item.frequency}</td>
                    <td className="py-2 pr-3 text-gray-700">{item.duration}</td>
                    <td className="py-2 text-gray-500">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Signature line */}
        <div className="pt-12">
          <div className="border-t border-gray-400 w-64 ml-auto"></div>
          <p className="text-xs text-gray-500 text-right mt-1 w-64 ml-auto">
            Dr. {data.doctor.name ?? '—'}
            {data.doctor.specialization ? ` · ${data.doctor.specialization}` : ''}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 text-center text-[10px] text-gray-400">
          <p>This prescription was generated by MediTrack on {generatedOn}.</p>
          <p>Verify all medicines with a licensed pharmacist before use.</p>
        </div>
      </div>
    </div>
  );
}
