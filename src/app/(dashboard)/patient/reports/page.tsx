import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import HealthInsightsButton from '@/components/ai/health-insights-button';
import { format } from 'date-fns';
import { getHealthReportData } from '@/server/actions/reports.actions';
import { getHealthScore, getLoyaltyTier } from '@/server/actions/health-score.actions';
import { HealthScoreCard } from '@/components/shared/health-score-card';
import { LoyaltyBadge } from '@/components/shared/loyalty-badge';
import NotificationBell from '@/components/shared/notification-bell';
import { getActivePatient } from '@/server/actions/active-patient';
import {
 FileDown, Activity, Pill, HeartPulse, Calendar,
 Thermometer, Weight, Stethoscope, User,
} from 'lucide-react';

export default async function PatientReportsPage() {
 const session = await auth();
 if (!session || session.user.role !== 'patient') redirect('/login');

 // Resolve the active patient (self or a managed family member)
 const active = await getActivePatient();
 const patientId = active?.id ?? null;

 if (!patientId) {
  return (
   <div className="min-h-full bg-[#f0f7f3] flex items-center justify-center px-6">
    <div className="bg-white border border-border p-8 text-center max-w-sm shadow-sm">
     <User className="h-8 w-8 text-muted-foreground opacity-30 mx-auto mb-3" />
     <p className="text-sm font-medium text-foreground">No patient profile found</p>
     <p className="text-xs text-muted-foreground mt-1">
      Your account hasn&apos;t been linked to a patient record yet. Please contact reception.
     </p>
    </div>
   </div>
  );
 }

 // Fetch all report data + gamification in parallel (best-effort)
 const [reportData, healthScore, loyalty] = await Promise.all([
  getHealthReportData(patientId).catch(() => null),
  getHealthScore(patientId).catch(() => null),
  getLoyaltyTier(patientId).catch(() => null),
 ]);

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   <div className="px-6 py-8 max-w-3xl mx-auto">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
     <div>
      <h1 className="text-2xl font-bold text-foreground">Health Report</h1>
      <p className="text-sm text-muted-foreground mt-1">
       Your complete medical activity summary
      </p>
     </div>
     <div className="flex items-center gap-2">
      <HealthInsightsButton />
      <Link
       href="/patient-reports-print"
       target="_blank"
       className="h-10 px-4 text-sm font-bold text-white flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
       style={{ backgroundColor: '#01411C' }}
      >
       <FileDown className="h-4 w-4" />
       Download PDF
      </Link>
     </div>
    </div>

    {/* Gamification snapshot */}
    {healthScore && (
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      <HealthScoreCard
       total={healthScore.total}
       tier={healthScore.tier}
       next={healthScore.next}
      />
      <div className="bg-white border border-border p-5 shadow-sm flex flex-col justify-center">
       <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
        Loyalty Status
       </h3>
       {loyalty && <LoyaltyBadge months={loyalty.activeMonths} tier={loyalty.tier} />}
      </div>
     </div>
    )}

    {!reportData ? (
     <div className="bg-white border border-border p-8 text-center text-muted-foreground shadow-sm">
      <Activity className="h-8 w-8 opacity-30 mx-auto mb-3" />
      <p className="text-sm font-medium">No health data available yet.</p>
      <p className="text-xs mt-1">Your visits and prescriptions will appear here.</p>
     </div>
    ) : (
     <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
       <StatTile icon={Calendar} label="Appointments" value={reportData.appointmentStats.total} color="text-emerald-700" bg="bg-emerald-50" />
       <StatTile icon={Activity} label="Visits" value={reportData.visits.length} color="text-emerald-600" bg="bg-emerald-50" />
       <StatTile icon={Pill} label="Prescriptions" value={reportData.prescriptions.length} color="text-emerald-700" bg="bg-emerald-50" />
      </div>

      {/* Vitals trend */}
      {reportData.visits.length > 0 && (
       <Section icon={HeartPulse} title="Latest Vitals">
        {(() => {
         const latest = reportData.visits[0];
         return (
          <div className="grid grid-cols-3 gap-3">
           <VitalTile icon={HeartPulse} label="Blood Pressure" value={latest.vitalsBp ?? '—'} />
           <VitalTile icon={Thermometer} label="Temperature" value={latest.vitalsTemp ? `${latest.vitalsTemp}°` : '—'} />
           <VitalTile icon={Weight} label="Weight" value={latest.vitalsWeight ? `${latest.vitalsWeight}` : '—'} />
          </div>
         );
        })()}
        <p className="text-xs text-muted-foreground mt-3">
         Last recorded: {format(new Date(reportData.visits[0].createdAt), 'MMM d, yyyy')}
        </p>
       </Section>
      )}

      {/* Visit timeline */}
      {reportData.visits.length > 0 && (
       <Section icon={Stethoscope} title="Visit History">
        <div className="space-y-3">
         {reportData.visits.slice(0, 10).map((visit) => (
          <div key={visit.id} className="border-l-2 border-primary/30 pl-4">
           <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
             {visit.chiefComplaint ?? 'Consultation'}
            </p>
            <span className="text-xs text-muted-foreground">
             {format(new Date(visit.createdAt), 'MMM d, yyyy')}
            </span>
           </div>
           {visit.diagnosis && (
            <p className="text-xs text-muted-foreground mt-0.5">
             <span className="font-medium">Diagnosis:</span> {visit.diagnosis}
            </p>
           )}
           {visit.doctorName && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
             Dr. {visit.doctorName}{visit.specialization ? ` · ${visit.specialization}` : ''}
            </p>
           )}
          </div>
         ))}
        </div>
       </Section>
      )}

      {/* Prescriptions */}
      {reportData.prescriptions.length > 0 && (
       <Section icon={Pill} title="Prescriptions">
        <div className="space-y-3">
         {reportData.prescriptions.slice(0, 8).map((rx) => (
          <div key={rx.id} className=" border border-border p-3">
           <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">
             Dr. {rx.doctorName ?? 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground">
             {format(new Date(rx.createdAt), 'MMM d, yyyy')}
            </span>
           </div>
           {rx.items.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
             {rx.items.map((item) => (
              <span key={item.id} className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground">
               {item.medicineName} · {item.dosage}
              </span>
             ))}
            </div>
           )}
          </div>
         ))}
        </div>
       </Section>
      )}
     </div>
    )}
   </div>
  </div>
 );
}

// ─── Local subcomponents ───────────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, color, bg }: { icon: typeof Calendar; label: string; value: number; color: string; bg: string }) {
 return (
  <div className="bg-white border border-border p-4 shadow-sm">
   <div className={`h-9 w-9 ${bg} flex items-center justify-center mb-2`}>
    <Icon className={`h-4 w-4 ${color}`} />
   </div>
   <p className="text-2xl font-bold text-foreground">{value}</p>
   <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
  </div>
 );
}

function Section({ icon: Icon, title, children }: { icon: typeof Calendar; title: string; children: React.ReactNode }) {
 return (
  <div className="bg-white border border-border p-5 shadow-sm">
   <div className="flex items-center gap-2 mb-4">
    <Icon className="h-4 w-4 text-primary" />
    <h2 className="text-sm font-bold text-foreground">{title}</h2>
   </div>
   {children}
  </div>
 );
}

function VitalTile({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
 return (
  <div className=" bg-muted/40 p-3 text-center">
   <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
   <p className="text-sm font-bold text-foreground">{value}</p>
   <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
  </div>
 );
}
