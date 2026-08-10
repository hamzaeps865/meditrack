import { auth } from '@/server/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/server/db';
import {
  appointments, doctors, patients,
  visits, prescriptions, prescriptionItems,
  users,
} from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft, Search, ChevronDown,
  AlertTriangle, Clock,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import DoctorDropdown from '@/components/doctor/doctor-dropdown';
import VisitForm from '@/components/doctor/visit-form';
import { getTriageForAppointment } from '@/server/actions/triage.actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const statusConfig: Record<string, { label: string; badge: string }> = {
  scheduled:   { label: 'Scheduled',   badge: 'bg-blue-100 text-blue-700' },
  checked_in:  { label: 'Checked-in',  badge: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'In-Progress', badge: 'bg-primary text-primary-foreground' },
  completed:   { label: 'Completed',   badge: 'bg-emerald-100 text-emerald-700' },
  cancelled:   { label: 'Cancelled',   badge: 'bg-red-100 text-red-600' },
  no_show:     { label: 'No-show',     badge: 'bg-gray-100 text-gray-500' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== 'doctor') redirect('/login');

  const { id } = await params;

  // Resolve doctor profile
  const [doctorRow] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, session.user.id));

  if (!doctorRow) redirect('/doctor');

  // Load appointment (must belong to this doctor)
  const [appt] = await db
    .select({
      id:          appointments.id,
      scheduledAt: appointments.scheduledAt,
      status:      appointments.status,
      reason:      appointments.reason,
      patientId:   appointments.patientId,
      doctorId:    appointments.doctorId,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, id),
        eq(appointments.doctorId, doctorRow.id),
      ),
    );

  if (!appt) notFound();

  // Load patient
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, appt.patientId));

  if (!patient) notFound();

  // Load existing visit (may not exist yet if appointment hasn't started)
  const [existingVisit] = await db
    .select()
    .from(visits)
    .where(eq(visits.appointmentId, id));

  // Load existing prescription items if a visit exists
  let existingPrescriptionItems: {
    id: string;
    prescriptionId: string;
    medicineId: string | null;
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string | null;
  }[] = [];

  if (existingVisit) {
    const prescriptionRows = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.visitId, existingVisit.id));

    if (prescriptionRows.length > 0) {
      // Fetch items for all prescription headers of this visit
      const items = await db
        .select()
        .from(prescriptionItems)
        .where(eq(prescriptionItems.prescriptionId, prescriptionRows[0].id));

      existingPrescriptionItems = items;
    }
  }

  // Load triage data (recorded by nurse before consultation)
  const triageData = await getTriageForAppointment(id).catch(() => null);

  // Load visit history for this patient (last 5 visits, excluding current)
  const visitHistory = await db
    .select({
      id:        visits.id,
      createdAt: visits.createdAt,
      diagnosis: visits.diagnosis,
      doctorId:  visits.doctorId,
      doctorName: users.name,
    })
    .from(visits)
    .leftJoin(doctors, eq(visits.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .where(eq(visits.patientId, appt.patientId))
    .orderBy(desc(visits.createdAt))
    .limit(6);

  // Exclude the current appointment's visit from history display
  const filteredHistory = visitHistory.filter(
    (v) => !existingVisit || v.id !== existingVisit.id,
  ).slice(0, 3);

  // Compute patient age
  const dobDate = patient.dob ? new Date(patient.dob) : null;
  const age     = dobDate
    ? Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const patientCode = patient.id.slice(0, 8).toUpperCase();

  const cfg         = statusConfig[appt.status] ?? statusConfig.scheduled;
  const doctorName  = session.user.name ?? 'Doctor';

  // Parse allergies (comma-separated string)
  const allergyList = patient.allergies
    ? patient.allergies.split(',').map((a) => a.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-full bg-[#f5f7fa]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-6 py-3
        flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
            text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patients, records, or schedules..."
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-muted/40
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <DoctorDropdown doctorName={doctorName} />
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="px-6 py-5 max-w-5xl mx-auto">

        {/* ── Back link ── */}
        <Link
          href="/doctor/appointments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
            hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Appointments
        </Link>

        {/* ── Patient header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">
                {patient.name}
              </h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {age !== null && <>{age},</>}
              {patient.gender && (
                <span className="capitalize"> {patient.gender}</span>
              )}
              {' · '}
              ID: #FAT-{patientCode}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">
              {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
              {' · '}
              {format(new Date(appt.scheduledAt), 'hh:mm a')}
            </p>
            {appt.reason && (
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
                {appt.reason}
              </p>
            )}
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-start">

          {/* ── LEFT sidebar ── */}
          <div className="flex flex-col gap-4">

            {/* Safety Critical Info */}
            <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-500">
                  Safety Critical Info
                </h3>
              </div>

              {/* Allergies */}
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest
                  text-muted-foreground mb-2">
                  Allergies
                </p>
                {allergyList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None recorded</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {allergyList.map((a) => (
                      <span key={a}
                        className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200
                          text-xs font-medium text-red-600">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Blood group */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest
                  text-muted-foreground">
                  Blood Group
                </p>
                <span className="text-sm font-bold text-foreground">
                  {patient.bloodGroup ?? '—'}
                </span>
              </div>
            </div>

            {/* Triage (nurse assessment) */}
            {triageData && (
              <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Triage Assessment
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    triageData.severity === 'critical' ? 'bg-rose-100 text-rose-700' :
                    triageData.severity === 'urgent' ? 'bg-orange-100 text-orange-700' :
                    triageData.severity === 'low' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {triageData.severity.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  {triageData.chiefComplaint && (
                    <div>
                      <span className="text-xs text-muted-foreground">Complaint:</span>
                      <p className="font-medium text-foreground">{triageData.chiefComplaint}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs">
                    {triageData.vitalsBp && <span className="text-muted-foreground">BP: <strong className="text-foreground">{triageData.vitalsBp}</strong></span>}
                    {triageData.vitalsTemp && <span className="text-muted-foreground">Temp: <strong className="text-foreground">{triageData.vitalsTemp}°</strong></span>}
                    {triageData.vitalsPulse && <span className="text-muted-foreground">Pulse: <strong className="text-foreground">{triageData.vitalsPulse}</strong></span>}
                    {triageData.vitalsWeight && <span className="text-muted-foreground">Weight: <strong className="text-foreground">{triageData.vitalsWeight}</strong></span>}
                  </div>
                  {triageData.notes && (
                    <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{triageData.notes}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/70">
                    By {triageData.nurseName ?? 'Nurse'} · {format(new Date(triageData.createdAt), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            )}

            {/* Visit History */}
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest
                  text-muted-foreground">
                  Visit History
                </h3>
                <Link
                  href={`/doctor/patients/${patient.id}`}
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  View All
                </Link>
              </div>

              {filteredHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No previous visits.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {filteredHistory.map((v) => (
                    <div key={v.id}
                      className="rounded-xl border border-border p-3 bg-muted/20">
                      <p className="text-xs font-bold text-primary">
                        {format(new Date(v.createdAt), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-foreground mt-0.5">
                        {v.diagnosis ?? 'No diagnosis recorded'}
                      </p>
                      {v.doctorName && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Dr. {v.doctorName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Interactive form ── */}
          <VisitForm
            appointmentId={appt.id}
            patientId={appt.patientId}
            doctorId={appt.doctorId}
            existingVisit={existingVisit ?? null}
            existingPrescriptionItems={existingPrescriptionItems}
            appointmentStatus={appt.status}
            triageVitals={triageData ? {
              vitalsBp: triageData.vitalsBp,
              vitalsTemp: triageData.vitalsTemp,
              vitalsWeight: triageData.vitalsWeight,
            } : null}
          />
        </div>
      </div>
    </div>
  );
}
