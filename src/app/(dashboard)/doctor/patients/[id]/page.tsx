import { auth } from '@/server/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/server/db';
import {
  doctors, patients, visits, appointments,
  prescriptions, prescriptionItems, users,
} from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft, Search, Settings, ChevronRight,
  User, Phone, Mail, MapPin, AlertTriangle,
  CalendarClock, FileText, Pill, IdCard, Printer,
  Activity,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function calcAge(dob: string | null | undefined) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

const statusStyles: Record<string, string> = {
  scheduled:   'bg-blue-50 text-blue-700',
  checked_in:  'bg-amber-50 text-amber-700',
  in_progress: 'bg-orange-50 text-orange-700',
  completed:   'bg-emerald-50 text-emerald-700',
  cancelled:   'bg-red-50 text-red-600',
  no_show:     'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  scheduled: 'Scheduled', checked_in: 'Checked-in',
  in_progress: 'In Progress', completed: 'Completed',
  cancelled: 'Cancelled', no_show: 'No-show',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== 'doctor') redirect('/login');

  const [doctorRow] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, session.user.id));

  if (!doctorRow) redirect('/doctor');

  const { id: patientId } = await params;

  // Load patient (must have been seen by this doctor)
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));

  if (!patient || patient.deletedAt) notFound();

  // If this patient is a managed family member, resolve the manager's name
  // for hereditary-context display
  let managerName: string | null = null;
  if (patient.managedBy) {
    const [manager] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, patient.managedBy));
    managerName = manager?.name ?? null;
  }

  // Verify doctor has actually seen this patient
  const [seenCheck] = await db
    .select({ id: visits.id })
    .from(visits)
    .where(and(eq(visits.patientId, patientId), eq(visits.doctorId, doctorRow.id)))
    .limit(1);

  if (!seenCheck) notFound();

  // All visits by THIS doctor for this patient
  const myVisits = await db
    .select({
      id:             visits.id,
      createdAt:      visits.createdAt,
      chiefComplaint: visits.chiefComplaint,
      diagnosis:      visits.diagnosis,
      notes:          visits.notes,
      vitalsBp:       visits.vitalsBp,
      vitalsTemp:     visits.vitalsTemp,
      vitalsWeight:   visits.vitalsWeight,
      appointmentId:  visits.appointmentId,
    })
    .from(visits)
    .where(and(eq(visits.patientId, patientId), eq(visits.doctorId, doctorRow.id)))
    .orderBy(desc(visits.createdAt));

  // All appointments for this patient (for history table — any doctor)
  const allAppointments = await db
    .select({
      id:          appointments.id,
      scheduledAt: appointments.scheduledAt,
      status:      appointments.status,
      reason:      appointments.reason,
      doctorId:    appointments.doctorId,
    })
    .from(appointments)
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(appointments.scheduledAt));

  // Doctor name map
  const allDoctors = await db
    .select({ id: doctors.id, name: users.name })
    .from(doctors)
    .leftJoin(users, eq(doctors.userId, users.id));
  const doctorMap = Object.fromEntries(allDoctors.map((d) => [d.id, d.name ?? 'Unknown']));

  // Prescriptions for most recent visit
  const latestVisit = myVisits[0] ?? null;
  let rxItems: { medicineName: string; dosage: string; frequency: string; duration: string }[] = [];
  if (latestVisit) {
    const [rxHeader] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.visitId, latestVisit.id))
      .limit(1);
    if (rxHeader) {
      rxItems = await db
        .select({
          medicineName: prescriptionItems.medicineName,
          dosage:       prescriptionItems.dosage,
          frequency:    prescriptionItems.frequency,
          duration:     prescriptionItems.duration,
        })
        .from(prescriptionItems)
        .where(eq(prescriptionItems.prescriptionId, rxHeader.id));
    }
  }

  const now          = new Date();
  const upcomingAppts = allAppointments.filter((a) => new Date(a.scheduledAt) >= now);
  const pastAppts     = allAppointments.filter((a) => new Date(a.scheduledAt) < now);

  const age         = calcAge(patient.dob);
  const dobDate     = patient.dob ? new Date(patient.dob) : null;
  const patientCode = patientId.slice(0, 8).toUpperCase();
  const allergyList = patient.allergies
    ? patient.allergies.split(',').map((a) => a.trim()).filter(Boolean)
    : [];

  const doctorName = session.user.name ?? 'Doctor';

  return (
    <div className="min-h-full bg-[#f5f7fa]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-6 py-3
        flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search patients, records..."
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-muted/40
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white" />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button type="button" aria-label="Settings"
            className="h-8 w-8 flex items-center justify-center rounded-full
              text-muted-foreground hover:bg-muted transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-6 py-5 max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
          <Link href="/doctor/patients"
            className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            My Patients
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{patient.name}</span>
        </div>

        {/* Patient header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary
              flex items-center justify-center text-lg font-bold shrink-0">
              {getInitials(patient.name)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{patient.name}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  bg-muted text-xs font-medium text-muted-foreground">
                  <IdCard className="h-3 w-3" />
                  ID: #{patientCode}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {age !== null && <span>Age {age} · </span>}
                {dobDate && <span>{format(dobDate, 'MM/dd/yyyy')} · </span>}
                <span className="capitalize">{patient.gender}</span>
                {patient.bloodGroup && (
                  <span className="ml-2 font-semibold text-red-500">{patient.bloodGroup}</span>
                )}
              </p>
              {managerName && (
                <p className="text-xs text-violet-600 mt-1.5 flex items-center gap-1">
                  👤 Managed by <strong>{managerName}</strong> (family head)
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button"
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border
                bg-white text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Printer className="h-4 w-4 text-muted-foreground" />
              Print Summary
            </button>
            <Link href={`/doctor/appointments?patientId=${patientId}`}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary
                text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              View Appointments
            </Link>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">

          {/* ── LEFT sidebar ── */}
          <div className="space-y-4">

            {/* Safety Critical */}
            <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-500">
                  Safety Critical Info
                </h3>
              </div>
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest
                  text-muted-foreground mb-2">Allergies</p>
                {allergyList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None recorded</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {allergyList.map((a) => (
                      <span key={a} className="px-2.5 py-1 rounded-full bg-red-50
                        border border-red-200 text-xs font-medium text-red-600">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Blood Group
                </p>
                <span className="text-sm font-bold text-foreground">
                  {patient.bloodGroup ?? '—'}
                </span>
              </div>
            </div>

            {/* Demographics */}
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-semibold text-foreground">Demographics</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground
                    uppercase tracking-wide mb-0.5">
                    <Phone className="h-3 w-3" /> Phone
                  </p>
                  <p className="text-sm font-medium text-foreground">{patient.phone}</p>
                </div>
                {patient.email && (
                  <div>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground
                      uppercase tracking-wide mb-0.5">
                      <Mail className="h-3 w-3" /> Email
                    </p>
                    <p className="text-sm text-primary font-medium break-all">{patient.email}</p>
                  </div>
                )}
                {patient.address && (
                  <div>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground
                      uppercase tracking-wide mb-0.5">
                      <MapPin className="h-3 w-3" /> Address
                    </p>
                    <p className="text-sm text-foreground">{patient.address}</p>
                  </div>
                )}
                {patient.emergencyContact && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-wide
                      text-muted-foreground mb-1">Emergency Contact</p>
                    <p className="text-sm text-foreground">{patient.emergencyContact}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Patient summary card */}
            <div className="rounded-2xl p-4 text-white"
              style={{ backgroundColor: '#1E3A5F' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest
                text-white/60 mb-3">
                My Patient Summary
              </p>
              <div className="space-y-2.5">
                {[
                  { label: 'My Visits',     value: myVisits.length },
                  { label: 'Total Appts',   value: allAppointments.length },
                  { label: 'Registered',    value: format(new Date(patient.createdAt), 'MMM d, yyyy') },
                  {
                    label: 'Last Seen',
                    value: latestVisit
                      ? format(new Date(latestVisit.createdAt), 'MMM d, yyyy')
                      : '—',
                  },
                ].map((s) => (
                  <div key={s.label}
                    className="flex items-center justify-between text-sm">
                    <span className="text-white/60">{s.label}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT column ── */}
          <div className="space-y-4 min-w-0">

            {/* Latest Visit Record */}
            {latestVisit && (
              <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Latest Visit Record</h2>
                    <span className="text-xs text-muted-foreground">
                      · {format(new Date(latestVisit.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <Link href={`/doctor/appointments/${latestVisit.appointmentId}`}
                    className="text-xs font-medium text-primary hover:underline">
                    View Full
                  </Link>
                </div>

                {/* Vitals strip */}
                {(latestVisit.vitalsBp || latestVisit.vitalsTemp || latestVisit.vitalsWeight) && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Blood Pressure', value: latestVisit.vitalsBp,    unit: 'mmHg' },
                      { label: 'Temperature',    value: latestVisit.vitalsTemp,  unit: '°F'   },
                      { label: 'Weight',         value: latestVisit.vitalsWeight, unit: 'lbs' },
                    ].map((v) => v.value ? (
                      <div key={v.label}
                        className="rounded-xl bg-muted/40 px-3 py-2.5 text-center">
                        <p className="text-xs text-muted-foreground">{v.label}</p>
                        <p className="text-base font-bold text-foreground mt-0.5">
                          {v.value}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            {v.unit}
                          </span>
                        </p>
                      </div>
                    ) : null)}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest
                      text-muted-foreground mb-1.5">Chief Complaint</p>
                    <p className="text-sm text-foreground">
                      {latestVisit.chiefComplaint ?? <em className="text-muted-foreground">Not recorded</em>}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest
                      text-muted-foreground mb-1.5">Diagnosis</p>
                    <p className="text-sm text-foreground">
                      {latestVisit.diagnosis ?? <em className="text-muted-foreground">Not recorded</em>}
                    </p>
                  </div>
                  {latestVisit.notes && (
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest
                        text-muted-foreground mb-1.5">Clinical Notes</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {latestVisit.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Prescriptions from latest visit */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Pill className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Current Prescriptions
                </h2>
                {latestVisit && (
                  <span className="text-xs text-muted-foreground">
                    · from {format(new Date(latestVisit.createdAt), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
              {rxItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No prescriptions on record.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px]">
                    <thead>
                      <tr className="border-b border-border">
                        {['Medication', 'Dosage', 'Frequency', 'Duration'].map((h) => (
                          <th key={h}
                            className="pb-2 pr-4 text-left text-[10px] font-semibold
                              uppercase tracking-widest text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rxItems.map((item, i) => (
                        <tr key={i}>
                          <td className="py-2.5 pr-4 text-sm font-semibold text-foreground">
                            {item.medicineName}
                          </td>
                          <td className="py-2.5 pr-4 text-sm text-muted-foreground">{item.dosage}</td>
                          <td className="py-2.5 pr-4 text-sm text-muted-foreground">{item.frequency}</td>
                          <td className="py-2.5 text-sm text-muted-foreground">{item.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Visit history (all my visits) */}
            {myVisits.length > 1 && (
              <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Visit History</h2>
                  </div>
                </div>
                <ul className="divide-y divide-border">
                  {myVisits.slice(1).map((v) => (
                    <li key={v.id}>
                      <Link href={`/doctor/appointments/${v.appointmentId}`}
                        className="flex items-center gap-4 px-5 py-3.5
                          hover:bg-muted/30 transition-colors group">
                        <div className="shrink-0 w-24">
                          <p className="text-xs font-semibold text-primary">
                            {format(new Date(v.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {v.diagnosis ?? v.chiefComplaint ?? 'No diagnosis recorded'}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground
                          opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Appointment history */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Appointment History</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-left">
                      {['Date', 'Time', 'Doctor', 'Status', 'Reason'].map((h) => (
                        <th key={h}
                          className="px-5 py-2.5 text-[10px] font-semibold
                            uppercase tracking-widest text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingAppts.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={5}
                            className="px-5 py-1.5 bg-primary/5 text-[10px] font-bold
                              text-primary uppercase tracking-wide">
                            Upcoming
                          </td>
                        </tr>
                        {upcomingAppts.map((a) => (
                          <tr key={a.id} className="border-b border-border">
                            <td className="px-5 py-3 font-medium whitespace-nowrap">
                              {format(new Date(a.scheduledAt), 'MMM d, yyyy')}
                            </td>
                            <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                              {format(new Date(a.scheduledAt), 'hh:mm a')}
                            </td>
                            <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                              {doctorMap[a.doctorId] ? `Dr. ${doctorMap[a.doctorId]}` : '—'}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium
                                ${statusStyles[a.status]}`}>
                                {statusLabels[a.status]}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">{a.reason ?? '—'}</td>
                          </tr>
                        ))}
                      </>
                    )}
                    {pastAppts.slice(0, 5).map((a, i) => (
                      <tr key={a.id}
                        className={i < pastAppts.slice(0, 5).length - 1 ? 'border-b border-border' : ''}>
                        <td className="px-5 py-3 font-medium whitespace-nowrap">
                          {format(new Date(a.scheduledAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(a.scheduledAt), 'hh:mm a')}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {doctorMap[a.doctorId] ? `Dr. ${doctorMap[a.doctorId]}` : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium
                            ${statusStyles[a.status]}`}>
                            {statusLabels[a.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{a.reason ?? '—'}</td>
                      </tr>
                    ))}
                    {allAppointments.length === 0 && (
                      <tr>
                        <td colSpan={5}
                          className="px-5 py-8 text-center text-sm text-muted-foreground">
                          No appointment history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
