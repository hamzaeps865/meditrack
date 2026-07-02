import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import {
  Search, Bell, Settings, ChevronRight, Plus,
  User, AlertTriangle, CalendarClock, Phone, Mail, MapPin,
  CalendarPlus, IdCard, Printer,
} from 'lucide-react';
import { getPatientById } from '@/server/actions/patients.actions';
import { getAppointmentsByPatient } from '@/server/actions/appointments.actions';
import { db } from '@/server/db';
import { doctors, users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import EditPatientButton from '@/components/receptionist/edit-patient-button';

const statusStyles: Record<string, string> = {
  scheduled:   'bg-blue-50 text-blue-700',
  checked_in:  'bg-amber-50 text-amber-700',
  in_progress: 'bg-orange-50 text-orange-700',
  completed:   'bg-emerald-50 text-emerald-700',
  cancelled:   'bg-red-50 text-red-600',
  no_show:     'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  scheduled:   'Scheduled',
  checked_in:  'Checked-in',
  in_progress: 'In progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
  no_show:     'No-show',
};

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Real DB queries
  const patient = await getPatientById(id).catch(() => null);
  if (!patient) notFound();

  const allAppointments = await getAppointmentsByPatient(id).catch(() => []);

  // Resolve doctor names for appointment history
  const allDoctors = await db
    .select({ id: doctors.id, name: users.name })
    .from(doctors)
    .leftJoin(users, eq(doctors.userId, users.id));

  const doctorMap = Object.fromEntries(allDoctors.map((d) => [d.id, d.name ?? 'Unknown']));

  const now = new Date();
  const upcomingAppts = allAppointments.filter((a) => new Date(a.scheduledAt) >= now);
  const pastAppts     = allAppointments.filter((a) => new Date(a.scheduledAt) < now);

  // Derive display values
  const patientCode   = id.slice(0, 8).toUpperCase();
  const dobDate       = patient.dob ? new Date(patient.dob) : null;
  const age           = dobDate
    ? Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patients, doctors, or records..."
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Settings"
            className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link href="/receptionist/patients" className="hover:underline">Patients</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{patient.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              <IdCard className="h-3 w-3" />
              ID: #{patientCode}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            {age !== null && <>Age: {age} · </>}
            {dobDate && <>{format(dobDate, 'MM/dd/yyyy')} · </>}
            <span className="capitalize">{patient.gender}</span>
            {patient.bloodGroup && (
              <><span className="mx-2">·</span><span className="text-red-500 font-medium">{patient.bloodGroup}</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <EditPatientButton
            patient={{
              id:               patient.id,
              name:             patient.name,
              phone:            patient.phone,
              email:            patient.email ?? null,
              address:          patient.address ?? null,
              emergencyContact: patient.emergencyContact ?? null,
            }}
            patientCode={patientCode}
          />
          <Link
            href={`/receptionist/appointments?patientId=${patient.id}`}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Book Appointment
          </Link>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Left column */}
        <div className="space-y-4 min-w-0">
          {/* Demographics */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Demographics</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                  <Phone className="h-3 w-3" /> Phone Number
                </p>
                <p className="text-sm text-foreground font-medium mt-1">{patient.phone}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                  <Mail className="h-3 w-3" /> Email Address
                </p>
                <p className="text-sm text-primary font-medium mt-1">{patient.email ?? '—'}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                <MapPin className="h-3 w-3" /> Residential Address
              </p>
              <p className="text-sm text-foreground font-medium mt-1">{patient.address ?? '—'}</p>
            </div>

            <div className="mt-4 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-foreground mb-2">Emergency Contact</p>
              <p className="text-sm text-foreground">{patient.emergencyContact ?? 'Not recorded'}</p>
            </div>
          </div>

          {/* Allergies & Conditions */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">Allergies &amp; Medical Conditions</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {!patient.allergies ? (
                    <span className="text-sm text-muted-foreground">None recorded</span>
                  ) : (
                    patient.allergies.split(',').map((a) => a.trim()).filter(Boolean).map((a) => (
                      <span key={a} className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                        {a}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Blood Group</p>
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {patient.bloodGroup ?? 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Appointment History */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Appointment History</h2>
              </div>
              <Link
                href={`/receptionist/appointments?patientId=${patient.id}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-y border-border bg-muted/30 text-left">
                    {['Date', 'Time', 'Doctor', 'Status', 'Reason'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upcomingAppts.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={5} className="px-5 py-1.5 bg-primary/5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                          Upcoming
                        </td>
                      </tr>
                      {upcomingAppts.map((a) => (
                        <tr key={a.id} className="border-b border-border">
                          <td className="px-5 py-3 text-foreground font-medium whitespace-nowrap">
                            {format(new Date(a.scheduledAt), 'MMM d, yyyy')}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            {format(new Date(a.scheduledAt), 'hh:mm a')}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            {doctorMap[a.doctorId] ? `Dr. ${doctorMap[a.doctorId]}` : '—'}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[a.status]}`}>
                              {statusLabels[a.status]}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{a.reason ?? '—'}</td>
                        </tr>
                      ))}
                    </>
                  )}

                  {pastAppts.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={5} className="px-5 py-1.5 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Past
                        </td>
                      </tr>
                      {pastAppts.map((a, i) => (
                        <tr key={a.id} className={i !== pastAppts.length - 1 ? 'border-b border-border' : ''}>
                          <td className="px-5 py-3 text-foreground font-medium whitespace-nowrap">
                            {format(new Date(a.scheduledAt), 'MMM d, yyyy')}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            {format(new Date(a.scheduledAt), 'hh:mm a')}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            {doctorMap[a.doctorId] ? `Dr. ${doctorMap[a.doctorId]}` : '—'}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[a.status]}`}>
                              {statusLabels[a.status]}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{a.reason ?? '—'}</td>
                        </tr>
                      ))}
                    </>
                  )}

                  {upcomingAppts.length === 0 && pastAppts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                        No appointment history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Registration summary */}
          <div className="rounded-xl p-5 text-primary-foreground" style={{ backgroundColor: '#1E3A5F' }}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-3">
              Registration Summary
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-70">Registered Since</span>
                <span className="font-semibold">
                  {format(new Date(patient.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-70">Total Appointments</span>
                <span className="font-semibold">{allAppointments.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-70">Last Appointment</span>
                <span className="font-semibold">
                  {pastAppts.length > 0
                    ? format(new Date(pastAppts[pastAppts.length - 1].scheduledAt), 'MMM d, yyyy')
                    : 'None'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pt-2 pb-1">
              Quick Actions
            </p>
            {[
              { label: 'Book Appointment', icon: CalendarPlus, href: `/receptionist/appointments?patientId=${patient.id}` },
              { label: 'Edit Contact Info', icon: IdCard, href: '#' },
              { label: 'Print Patient Summary', icon: Printer, href: '#' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-primary" />
                    {action.label}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              );
            })}
          </div>

          {patient.address && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div
                className="h-28 w-full relative"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, #dbe4ee 25%, transparent 25%), linear-gradient(225deg, #dbe4ee 25%, transparent 25%), linear-gradient(45deg, #dbe4ee 25%, transparent 25%), linear-gradient(315deg, #dbe4ee 25%, #eef1f5 25%)',
                  backgroundPosition: '20px 0, 20px 0, 0 0, 0 0',
                  backgroundSize: '20px 20px',
                  backgroundColor: '#eef1f5',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary drop-shadow" />
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-foreground">Primary Residence</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{patient.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}