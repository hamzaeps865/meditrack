import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getVisitsByPatient } from '@/server/actions/visits.actions';
import { getActivePatient } from '@/server/actions/active-patient';
import NotificationBell from '@/components/shared/notification-bell';
import { format } from 'date-fns';
import { Stethoscope, HeartPulse, Thermometer, Weight, FileText } from 'lucide-react';

export default async function PatientVisitsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'patient') redirect('/login');

  const active = await getActivePatient();
  if (!active) redirect('/patient/appointments');

  const visits = await getVisitsByPatient(active.id);

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">My Visit History</p>
        <NotificationBell />
      </div>

      <div className="px-6 py-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">My Visits</h1>
        <p className="text-sm text-muted-foreground mb-6">{visits.length} visit{visits.length !== 1 ? 's' : ''} recorded</p>

        {visits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
            <Stethoscope className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No visits yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your consultation records will appear here after your first visit.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visits.map((visit) => (
              <div key={visit.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">{visit.chiefComplaint ?? 'Consultation'}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(visit.createdAt), 'EEEE, MMM d, yyyy')}</p>
                  </div>
                </div>

                {visit.diagnosis && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Diagnosis</p>
                    <p className="text-sm text-foreground">{visit.diagnosis}</p>
                  </div>
                )}

                {/* Vitals */}
                {(visit.vitalsBp || visit.vitalsTemp || visit.vitalsWeight) && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {visit.vitalsBp && (
                      <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/40">
                        <HeartPulse className="h-3 w-3 text-rose-500" /> {visit.vitalsBp}
                      </span>
                    )}
                    {visit.vitalsTemp && (
                      <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/40">
                        <Thermometer className="h-3 w-3 text-amber-500" /> {visit.vitalsTemp}°
                      </span>
                    )}
                    {visit.vitalsWeight && (
                      <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/40">
                        <Weight className="h-3 w-3 text-blue-500" /> {visit.vitalsWeight}
                      </span>
                    )}
                  </div>
                )}

                {visit.notes && (
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Doctor's Notes</p>
                    <p className="text-sm text-muted-foreground">{visit.notes}</p>
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
