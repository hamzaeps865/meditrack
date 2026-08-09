import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import {
  prescriptions, prescriptionItems,
  visits, doctors, users,
} from '@/server/db/schema';
import { eq, desc } from 'drizzle-orm';

import { Pill, Stethoscope, Activity } from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import PrescriptionAccordion from '@/components/patient/prescription-accordion';
import { getActivePatient } from '@/server/actions/active-patient';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PatientPrescriptionsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'patient') redirect('/login');

  const active = await getActivePatient();
  const patientId = active?.id ?? null;

  if (!patientId) {
    return (
      <PatientShell name={session.user.name}>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <Stethoscope className="h-8 w-8 opacity-30" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">No patient profile found</p>
            <p className="text-sm mt-1 max-w-sm">
              Your account hasn't been linked to a patient record yet.
              Please contact the clinic reception to register.
            </p>
          </div>
        </div>
      </PatientShell>
    );
  }

  // All prescriptions joined to visits + doctor
  const rows = await db
    .select({
      prescriptionId:        prescriptions.id,
      prescriptionCreatedAt: prescriptions.createdAt,
      visitId:               visits.id,
      visitCreatedAt:        visits.createdAt,
      diagnosis:             visits.diagnosis,
      chiefComplaint:        visits.chiefComplaint,
      notes:                 visits.notes,
      vitalsBp:              visits.vitalsBp,
      vitalsTemp:            visits.vitalsTemp,
      vitalsWeight:          visits.vitalsWeight,
      doctorName:            users.name,
      doctorSpec:            doctors.specialization,
    })
    .from(prescriptions)
    .innerJoin(visits,   eq(prescriptions.visitId, visits.id))
    .leftJoin(doctors,   eq(visits.doctorId, doctors.id))
    .leftJoin(users,     eq(doctors.userId, users.id))
    .where(eq(visits.patientId, patientId))
    .orderBy(desc(prescriptions.createdAt));

  // Fetch all items for these prescriptions
  const prescriptionIds = rows.map((r) => r.prescriptionId);
  let allItems: {
    prescriptionId: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string | null;
  }[] = [];

  for (const pid of prescriptionIds) {
    const items = await db
      .select({
        prescriptionId: prescriptionItems.prescriptionId,
        medicineName:   prescriptionItems.medicineName,
        dosage:         prescriptionItems.dosage,
        frequency:      prescriptionItems.frequency,
        duration:       prescriptionItems.duration,
        notes:          prescriptionItems.notes,
      })
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, pid));
    allItems = [...allItems, ...items];
  }

  const enriched = rows.map((row) => ({
    id:           row.prescriptionId,
    createdAt:    row.prescriptionCreatedAt,
    visitId:      row.visitId,
    diagnosis:    row.diagnosis,
    chiefComplaint: row.chiefComplaint,
    notes:        row.notes,
    vitalsBp:     row.vitalsBp,
    vitalsTemp:   row.vitalsTemp,
    vitalsWeight: row.vitalsWeight,
    doctorName:   row.doctorName,
    doctorSpec:   row.doctorSpec,
    items:        allItems.filter((i) => i.prescriptionId === row.prescriptionId),
  }));

  // Stats
  const totalMeds = allItems.length;
  const uniqueDoctors = new Set(rows.map((r) => r.doctorName).filter(Boolean)).size;

  return (
    <PatientShell name={session.user.name}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">My Prescriptions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {enriched.length} prescription{enriched.length !== 1 ? 's' : ''} on record
          </p>
        </div>

        {/* Stats */}
        {enriched.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                <Pill className="h-4.5 w-4.5 text-blue-600" style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <p className="text-2xl font-bold text-foreground leading-none">{enriched.length}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Prescriptions</p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <Activity className="h-4.5 w-4.5 text-emerald-600" style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <p className="text-2xl font-bold text-foreground leading-none">{totalMeds}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Medicines Total</p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                <Stethoscope className="h-4.5 w-4.5 text-purple-600" style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <p className="text-2xl font-bold text-foreground leading-none">{uniqueDoctors}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Doctor{uniqueDoctors !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        {/* Prescriptions list */}
        {enriched.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-14
            flex flex-col items-center gap-3 text-muted-foreground shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              <Pill className="h-7 w-7 opacity-30" />
            </div>
            <p className="text-sm font-semibold text-foreground">No prescriptions yet</p>
            <p className="text-xs text-center max-w-xs">
              Prescriptions will appear here after your doctor completes a visit.
            </p>
          </div>
        ) : (
          <PrescriptionAccordion prescriptions={enriched} />
        )}
      </div>
    </PatientShell>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function PatientShell({ name, children }: { name?: string | null; children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #1E3A5F, #2d6a9f)' }}>
            <span className="text-white text-xs font-bold">
              {name ? name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '?'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-none">{name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Patient</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
