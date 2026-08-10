import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTriageQueue } from '@/server/actions/triage.actions';
import { getAllDoctors } from '@/server/actions/doctors.actions';
import NotificationBell from '@/components/shared/notification-bell';
import { formatDistanceToNow } from 'date-fns';
import {
 Stethoscope, Activity, AlertTriangle, Clock,
 HeartPulse, Droplet,
} from 'lucide-react';

// ─── Severity styling ─────────────────────────────────────────────────────────

const severityConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
 critical: { bg: 'bg-rose-50',  text: 'text-rose-700',  border: 'border-rose-300',  label: 'CRITICAL' },
 urgent:  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'URGENT' },
 standard: { bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-300',  label: 'STANDARD' },
 low:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', label: 'LOW' },
};

const severityOrder: Record<string, number> = {
 critical: 0, urgent: 1, standard: 2, low: 3,
};

export default async function NurseDashboardPage() {
 const session = await auth();
 if (!session || (session.user.role !== 'nurse' && session.user.role !== 'admin')) {
  redirect('/login');
 }

 const queue = await getTriageQueue();

 // Sort: untriaged first (by wait time), then by severity
 const sorted = [...queue].sort((a, b) => {
  if (a.triaged && !b.triaged) return 1;
  if (!a.triaged && b.triaged) return -1;
  if (a.triageSeverity && b.triageSeverity) {
   return (severityOrder[a.triageSeverity] ?? 9) - (severityOrder[b.triageSeverity] ?? 9);
  }
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
 });

 const untriaged = sorted.filter((q) => !q.triaged);
 const triaged = sorted.filter((q) => q.triaged);

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   {/* Top bar */}
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="h-8 w-8 bg-emerald-100 flex items-center justify-center shrink-0">
      <HeartPulse className="h-4 w-4 text-emerald-700" />
     </div>
     <div className="hidden sm:block">
      <p className="text-sm font-semibold text-foreground leading-none">{session.user.name}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Triage Station</p>
     </div>
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-8 max-w-4xl mx-auto">
    {/* Header */}
    <div className="mb-6">
     <h1 className="text-2xl font-bold text-foreground">Triage Queue</h1>
     <p className="text-sm text-muted-foreground mt-1">
      {untriaged.length} awaiting triage · {triaged.length} triaged
     </p>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-3 mb-6">
     <div className="bg-white border border-border p-4 shadow-sm">
      <div className="h-9 w-9 bg-amber-50 flex items-center justify-center mb-2">
       <Clock className="h-4 w-4 text-amber-600" />
      </div>
      <p className="text-2xl font-bold text-foreground">{untriaged.length}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Awaiting Triage</p>
     </div>
     <div className="bg-white border border-border p-4 shadow-sm">
      <div className="h-9 w-9 bg-rose-50 flex items-center justify-center mb-2">
       <AlertTriangle className="h-4 w-4 text-rose-600" />
      </div>
      <p className="text-2xl font-bold text-foreground">
       {triaged.filter((t) => t.triageSeverity === 'critical' || t.triageSeverity === 'urgent').length}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">Critical / Urgent</p>
     </div>
     <div className="bg-white border border-border p-4 shadow-sm">
      <div className="h-9 w-9 bg-emerald-50 flex items-center justify-center mb-2">
       <Activity className="h-4 w-4 text-emerald-600" />
      </div>
      <p className="text-2xl font-bold text-foreground">{triaged.length}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Triage Completed</p>
     </div>
    </div>

    {/* Queue */}
    {sorted.length === 0 ? (
     <div className="bg-white border border-border p-12 text-center shadow-sm">
      <HeartPulse className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground">Queue is empty</p>
      <p className="text-xs text-muted-foreground mt-1">
       Checked-in and walk-in patients will appear here for triage.
      </p>
     </div>
    ) : (
     <div className="space-y-3">
      {sorted.map((patient) => {
       const sev = patient.triageSeverity ? severityConfig[patient.triageSeverity] : null;
       const ageMs = Date.now() - new Date(patient.patientDob).getTime();
       const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
       const waitMs = Date.now() - new Date(patient.createdAt).getTime();
       const waitMin = Math.floor(waitMs / (1000 * 60));

       return (
        <div
         key={patient.id}
         className={`bg-white border p-5 shadow-sm ${sev ? sev.border : 'border-border'}`}
        >
         <div className="flex items-start justify-between gap-4">
          {/* Left: patient info */}
          <div className="flex items-start gap-3 min-w-0">
           <div className="h-11 w-11 bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
            {patient.patientName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
           </div>
           <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
             <p className="text-sm font-bold text-foreground">{patient.patientName}</p>
             <span className="text-xs text-muted-foreground">{age}y · {patient.patientGender}</span>
             {patient.isWalkIn && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700">
               WALK-IN
              </span>
             )}
            </div>
            {patient.reason && (
             <p className="text-xs text-muted-foreground mt-0.5">{patient.reason}</p>
            )}
            {patient.patientAllergies && (
             <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Allergies: {patient.patientAllergies}
             </p>
            )}
            <p className="text-[10px] text-muted-foreground/70 mt-1">
             Waiting {waitMin} min
            </p>
           </div>
          </div>

          {/* Right: triage status / action */}
          <div className="flex flex-col items-end gap-2 shrink-0">
           {sev ? (
            <span className={`text-[10px] font-bold px-2.5 py-1 ${sev.bg} ${sev.text}`}>
             {sev.label}
            </span>
           ) : (
            <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-100 text-amber-700">
             NEEDS TRIAGE
            </span>
           )}
           <Link
            href={`/nurse/triage/${patient.id}`}
            className={`inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold transition-colors ${
             patient.triaged
              ? 'border border-border text-foreground hover:bg-muted'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
           >
            <Stethoscope className="h-3.5 w-3.5" />
            {patient.triaged ? 'Re-assess' : 'Triage'}
           </Link>
          </div>
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
