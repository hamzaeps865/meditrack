import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { getHealthReportData } from '@/server/actions/reports.actions';
import { getHealthScore } from '@/server/actions/health-score.actions';
import { getActivePatient } from '@/server/actions/active-patient';
import PrintTrigger from '@/components/patient/print-trigger';
import { BriefcaseMedical } from 'lucide-react';

// ─── Print-optimized Health Report ────────────────────────────────────────────
// Standalone page (no sidebar/topbar) styled for print → "Save as PDF".

export default async function PatientReportPrintPage() {
  const session = await auth();
  if (!session || session.user.role !== 'patient') redirect('/login');

  const active = await getActivePatient();
  if (!active) redirect('/patient/reports');

  const [reportData, healthScore] = await Promise.all([
    getHealthReportData(active.id).catch(() => null),
    getHealthScore(active.id).catch(() => null),
  ]);

  // The full patient record lives inside reportData; fall back to the active profile
  const patientRow = reportData?.patient ?? { id: active.id, name: active.name, dob: null, gender: null, phone: '—', bloodGroup: null, allergies: null };

  const generatedOn = format(new Date(), "MMMM d, yyyy 'at' h:mm a");

  return (
    <div className="min-h-screen bg-white text-foreground p-8 print:p-0">
      <PrintTrigger />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-emerald-900 pb-4">
          <div className="flex items-center gap-3">
            <BriefcaseMedical className="h-8 w-8 text-emerald-700" />
            <div>
              <h1 className="text-2xl font-bold">MediTrack</h1>
              <p className="text-xs text-emerald-800/60">Health Report</p>
            </div>
          </div>
          <div className="text-right text-xs text-emerald-800/60">
            <p>Generated: {generatedOn}</p>
            <p>Report ID: {patientRow.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Patient info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-800/60 mb-1">Patient</p>
            <p className="font-semibold">{patientRow.name}</p>
            <p className="text-muted-foreground">
              {patientRow.dob ? `DOB: ${patientRow.dob}` : ''}
              {patientRow.gender ? ` · ${patientRow.gender}` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-emerald-800/60 mb-1">Contact</p>
            <p className="text-muted-foreground">{patientRow.phone}</p>
            <p className="text-muted-foreground">
              {patientRow.bloodGroup ? `Blood: ${patientRow.bloodGroup}` : ''}
              {patientRow.allergies ? ` · Allergies: ${patientRow.allergies}` : ''}
            </p>
          </div>
        </div>

        {/* Summary stats */}
        {reportData && (
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Appointments', value: reportData.appointmentStats.total },
              { label: 'Completed', value: reportData.appointmentStats.completed },
              { label: 'Visits', value: reportData.visits.length },
              { label: 'Prescriptions', value: reportData.prescriptions.length },
            ].map((s) => (
              <div key={s.label} className="border border-emerald-100 rounded p-2">
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] uppercase text-emerald-800/60">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Health score */}
        {healthScore && (
          <div>
            <h2 className="text-sm font-bold uppercase text-emerald-800/60 mb-2">Health Score</h2>
            <div className="border border-emerald-100 rounded p-3">
              <span className="text-2xl font-bold text-emerald-700">{healthScore.total}</span>
              <span className="text-sm text-muted-foreground ml-2">points · {healthScore.tier.name} Tier</span>
            </div>
          </div>
        )}

        {/* Visits */}
        {reportData && reportData.visits.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase text-emerald-800/60 mb-2 border-b border-emerald-100 pb-1">
              Visit History ({reportData.visits.length})
            </h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-emerald-200 text-left">
                  <th className="py-1.5 pr-2">Date</th>
                  <th className="py-1.5 pr-2">Doctor</th>
                  <th className="py-1.5 pr-2">Complaint</th>
                  <th className="py-1.5 pr-2">Diagnosis</th>
                  <th className="py-1.5">Vitals (BP / Temp / Wt)</th>
                </tr>
              </thead>
              <tbody>
                {reportData.visits.map((v) => (
                  <tr key={v.id} className="border-b border-emerald-50 align-top">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{format(new Date(v.createdAt), 'MMM d, yyyy')}</td>
                    <td className="py-1.5 pr-2">{v.doctorName ?? '—'}</td>
                    <td className="py-1.5 pr-2">{v.chiefComplaint ?? '—'}</td>
                    <td className="py-1.5 pr-2">{v.diagnosis ?? '—'}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {[v.vitalsBp, v.vitalsTemp, v.vitalsWeight].filter(Boolean).join(' / ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Prescriptions */}
        {reportData && reportData.prescriptions.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase text-emerald-800/60 mb-2 border-b border-emerald-100 pb-1">
              Prescriptions ({reportData.prescriptions.length})
            </h2>
            <div className="space-y-3">
              {reportData.prescriptions.map((rx) => (
                <div key={rx.id} className="border border-emerald-100 rounded p-2 text-xs">
                  <div className="flex justify-between border-b border-emerald-50 pb-1 mb-1.5">
                    <span className="font-semibold">Dr. {rx.doctorName ?? 'Unknown'}</span>
                    <span className="text-emerald-800/60">{format(new Date(rx.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-emerald-800/60">
                        <th className="py-0.5 pr-2">Medicine</th>
                        <th className="py-0.5 pr-2">Dosage</th>
                        <th className="py-0.5 pr-2">Frequency</th>
                        <th className="py-0.5">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rx.items.map((item) => (
                        <tr key={item.id} className="border-t border-emerald-50">
                          <td className="py-0.5 pr-2">{item.medicineName}</td>
                          <td className="py-0.5 pr-2">{item.dosage}</td>
                          <td className="py-0.5 pr-2">{item.frequency}</td>
                          <td className="py-0.5">{item.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-emerald-100 pt-4 text-center text-[10px] text-muted-foreground">
          <p>This report was generated by MediTrack. It is a summary of records stored in the system</p>
          <p>and does not replace a doctor&apos;s assessment. · {generatedOn}</p>
        </div>
      </div>
    </div>
  );
}
