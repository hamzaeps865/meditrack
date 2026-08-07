'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createVisit, updateVisit } from '@/server/actions/visits.actions';
import { createPrescription } from '@/server/actions/prescriptions.actions';
import { updateAppointmentStatus } from '@/server/actions/appointments.actions';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrescriptionRow {
  id: string; // local key only
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
}

interface VisitFormProps {
  appointmentId: string;
  patientId: string;
  /** Existing visit if already started */
  existingVisit?: {
    id: string;
    chiefComplaint: string | null;
    diagnosis: string | null;
    notes: string | null;
    vitalsBp: string | null;
    vitalsTemp: string | null;
    vitalsWeight: string | null;
  } | null;
  /** Already saved prescription items (flattened across all prescriptions) */
  existingPrescriptionItems?: {
    id: string;
    prescriptionId: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string | null;
  }[];
  appointmentStatus: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VisitForm({
  appointmentId,
  patientId,
  existingVisit,
  existingPrescriptionItems = [],
  appointmentStatus,
}: VisitFormProps) {
  const router  = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [saved, setSaved]   = useState(false);

  // Vitals
  const [bp,     setBp]     = useState(existingVisit?.vitalsBp     ?? '');
  const [temp,   setTemp]   = useState(existingVisit?.vitalsTemp   ?? '');
  const [weight, setWeight] = useState(existingVisit?.vitalsWeight ?? '');

  // Clinical
  const [complaint,  setComplaint]  = useState(existingVisit?.chiefComplaint ?? '');
  const [diagnosis,  setDiagnosis]  = useState(existingVisit?.diagnosis      ?? '');
  const [notes,      setNotes]      = useState(existingVisit?.notes          ?? '');

  // Prescriptions — seed from existing items if the visit is already saved
  const [rxRows, setRxRows] = useState<PrescriptionRow[]>(
    existingPrescriptionItems.length > 0
      ? existingPrescriptionItems.map((item) => ({
          id:           item.id,
          medicineName: item.medicineName,
          dosage:       item.dosage,
          frequency:    item.frequency,
          duration:     item.duration,
          notes:        item.notes ?? '',
        }))
      : [],
  );

  const isReadOnly   = appointmentStatus === 'completed';
  const canComplete  = appointmentStatus === 'in_progress' || appointmentStatus === 'checked_in';

  // ── Add / remove prescription rows ─────────────────────────────────────────

  function addRxRow() {
    setRxRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), medicineName: '', dosage: '', frequency: '', duration: '', notes: '' },
    ]);
  }

  function removeRxRow(id: string) {
    setRxRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRxRow(id: string, field: keyof PrescriptionRow, value: string) {
    setRxRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  // ── Save draft ──────────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      try {
        if (!existingVisit) {
          if (!complaint.trim()) {
            setError('Chief complaint is required to save.');
            return;
          }
          await createVisit({
            appointmentId,
            patientId,
            chiefComplaint: complaint,
            diagnosis:      diagnosis || undefined,
            notes:          notes     || undefined,
            vitalsBp:       bp        || undefined,
            vitalsTemp:     temp      || undefined,
            vitalsWeight:   weight    || undefined,
          });

          // Also move appointment to in_progress
          await updateAppointmentStatus({ id: appointmentId, status: 'in_progress' });
        } else {
          await updateVisit(existingVisit.id, {
            chiefComplaint: complaint || undefined,
            diagnosis:      diagnosis || undefined,
            notes:          notes     || undefined,
            vitalsBp:       bp        || undefined,
            vitalsTemp:     temp      || undefined,
            vitalsWeight:   weight    || undefined,
          });
        }
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      }
    });
  }

  // ── Complete visit ──────────────────────────────────────────────────────────

  async function handleComplete() {
    setError(null);

    startTransition(async () => {
      try {
        // 1. Upsert the visit record
        if (!existingVisit) {
          if (!complaint.trim()) {
            setError('Chief complaint is required before completing the visit.');
            return;
          }
          await createVisit({
            appointmentId,
            patientId,
            chiefComplaint: complaint,
            diagnosis:      diagnosis || undefined,
            notes:          notes     || undefined,
            vitalsBp:       bp        || undefined,
            vitalsTemp:     temp      || undefined,
            vitalsWeight:   weight    || undefined,
          });
        } else {
          await updateVisit(existingVisit.id, {
            chiefComplaint: complaint || undefined,
            diagnosis:      diagnosis || undefined,
            notes:          notes     || undefined,
            vitalsBp:       bp        || undefined,
            vitalsTemp:     temp      || undefined,
            vitalsWeight:   weight    || undefined,
          });
        }

        // 2. Save prescriptions (only new rows with medicine name filled)
        // We need the visit id — refetch or use existingVisit.id
        const validRxRows = rxRows.filter((r) => r.medicineName.trim());
        if (validRxRows.length > 0 && existingVisit?.id) {
          await createPrescription({
            visitId: existingVisit.id,
            items: validRxRows.map((r) => ({
              medicineName: r.medicineName,
              dosage:       r.dosage   || '—',
              frequency:    r.frequency || '—',
              duration:     r.duration  || '—',
              notes:        r.notes    || undefined,
            })),
          });
        }

        // 3. Mark appointment completed
        await updateAppointmentStatus({ id: appointmentId, status: 'completed' });

        router.push('/doctor/appointments');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete visit. Please try again.');
      }
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200
          bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Patient Vitals ── */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">🩺</span>
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
            Patient Vitals
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Blood Pressure (mmHg)', placeholder: '120/80',  value: bp,     setter: setBp },
            { label: 'Temperature (°F)',       placeholder: '98.6',    value: temp,   setter: setTemp },
            { label: 'Weight (lbs)',           placeholder: '184.5',   value: weight, setter: setWeight },
          ].map((field) => (
            <div key={field.label}>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {field.label}
              </label>
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                disabled={isReadOnly}
                className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30
                  text-sm text-foreground placeholder:text-muted-foreground/60
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
                  disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Clinical Documentation ── */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">📋</span>
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
            Clinical Documentation
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Chief Complaint
            </label>
            <input
              type="text"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. Persistent fatigue for 2 weeks"
              disabled={isReadOnly}
              className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30
                text-sm text-foreground placeholder:text-muted-foreground/60
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
                disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Diagnosis (ICD-10)
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Search ICD-10 codes..."
              disabled={isReadOnly}
              className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30
                text-sm text-foreground placeholder:text-muted-foreground/60
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
                disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Clinical Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detailed objective and subjective findings..."
            rows={5}
            disabled={isReadOnly}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30
              text-sm text-foreground placeholder:text-muted-foreground/60 resize-none
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
              disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>
      </section>

      {/* ── Prescriptions ── */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">💊</span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
              Prescriptions
            </h2>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={addRxRow}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border
                text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Medicine
            </button>
          )}
        </div>

        {rxRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isReadOnly ? 'No prescriptions recorded.' : 'No medicines added yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border">
                  {['MEDICATION', 'DOSAGE', 'FREQUENCY', 'DURATION', ''].map((h) => (
                    <th key={h}
                      className="pb-2 pr-3 text-left text-[10px] font-semibold
                        uppercase tracking-widest text-muted-foreground last:pr-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rxRows.map((row) => (
                  <tr key={row.id}>
                    {isReadOnly ? (
                      <>
                        <td className="py-3 pr-3 text-sm font-semibold text-foreground">{row.medicineName}</td>
                        <td className="py-3 pr-3 text-sm text-muted-foreground">{row.dosage}</td>
                        <td className="py-3 pr-3 text-sm text-muted-foreground">{row.frequency}</td>
                        <td className="py-3 pr-3 text-sm text-muted-foreground">{row.duration}</td>
                        <td className="py-3 w-8" />
                      </>
                    ) : (
                      <>
                        {(['medicineName', 'dosage', 'frequency', 'duration'] as const).map((field) => (
                          <td key={field} className="py-2 pr-3">
                            <input
                              type="text"
                              value={row[field]}
                              onChange={(e) => updateRxRow(row.id, field, e.target.value)}
                              placeholder={
                                field === 'medicineName' ? 'e.g. Lisinopril' :
                                field === 'dosage'       ? '10mg'            :
                                field === 'frequency'    ? 'Once daily'      :
                                                           '30 days'
                              }
                              className="w-full h-8 px-2.5 rounded-md border border-border
                                bg-muted/30 text-sm text-foreground
                                placeholder:text-muted-foreground/50
                                focus:outline-none focus:ring-2 focus:ring-primary/20
                                focus:bg-white transition-colors"
                            />
                          </td>
                        ))}
                        <td className="py-2 w-8">
                          <button
                            type="button"
                            onClick={() => removeRxRow(row.id)}
                            className="h-8 w-8 flex items-center justify-center rounded-md
                              text-muted-foreground hover:text-red-500 hover:bg-red-50
                              transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Footer action bar ── */}
      {!isReadOnly && (
        <div className="sticky bottom-0 -mx-6 px-6 py-3
          bg-white/95 backdrop-blur border-t border-border
          flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
            {saved ? 'Draft saved' : 'Unsaved changes'}
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isPending}
              className="h-9 px-5 rounded-lg border border-border bg-white text-sm
                font-medium text-foreground hover:bg-muted transition-colors
                disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Draft
            </button>

            {canComplete && (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isPending}
                className="h-9 px-5 rounded-lg bg-primary text-primary-foreground
                  text-sm font-semibold hover:bg-primary/90 transition-colors
                  disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Complete Visit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
