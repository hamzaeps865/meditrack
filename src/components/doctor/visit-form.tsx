'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createVisit, updateVisit } from '@/server/actions/visits.actions';
import { createPrescription } from '@/server/actions/prescriptions.actions';
import { createLabOrders } from '@/server/actions/lab-orders.actions';
import { updateAppointmentStatus, scheduleFollowUp } from '@/server/actions/appointments.actions';
import { Plus, Trash2, Loader2, AlertCircle, Download, FlaskConical } from 'lucide-react';
import MedicineSearch from '@/components/doctor/medicine-search';
import DrugCheckButton from '@/components/ai/drug-check-button';
import NotesGeneratorButton from '@/components/ai/notes-generator-button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrescriptionRow {
 id: string; // local key only
 medicineId?: string;
 medicineName: string;
 dosage: string;
 frequency: string;
 duration: string;
 notes: string;
}

interface LabOrderRow {
 id: string; // local key only
 testName: string;
 instructions: string;
}

interface VisitFormProps {
 appointmentId: string;
 patientId: string;
 doctorId?: string;
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
  medicineId: string | null;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
 }[];
 appointmentStatus: string;
 /** Triage vitals recorded by nurse — used to pre-fill if no visit exists yet */
 triageVitals?: {
  vitalsBp: string | null;
  vitalsTemp: string | null;
  vitalsWeight: string | null;
 } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VisitForm({
 appointmentId,
 patientId,
 doctorId,
 existingVisit,
 existingPrescriptionItems = [],
 appointmentStatus,
 triageVitals = null,
}: VisitFormProps) {
 const router = useRouter();
 const [isDraftPending, startDraftTransition] = useTransition();
 const [isCompletePending, startCompleteTransition] = useTransition();
 const [error, setError]  = useState<string | null>(null);
 const [saved, setSaved]  = useState(false);

 // Vitals — pre-fill from triage if no visit exists yet (so the doctor
 // doesn't re-enter what the nurse already recorded)
 const [bp,   setBp]   = useState(existingVisit?.vitalsBp   ?? triageVitals?.vitalsBp   ?? '');
 const [temp,  setTemp]  = useState(existingVisit?.vitalsTemp  ?? triageVitals?.vitalsTemp  ?? '');
 const [weight, setWeight] = useState(existingVisit?.vitalsWeight ?? triageVitals?.vitalsWeight ?? '');

 // Clinical
 const [complaint, setComplaint] = useState(existingVisit?.chiefComplaint ?? '');
 const [diagnosis, setDiagnosis] = useState(existingVisit?.diagnosis   ?? '');
 const [notes,   setNotes]   = useState(existingVisit?.notes     ?? '');

 // Prescriptions — seed from existing items if the visit is already saved
 const [rxRows, setRxRows] = useState<PrescriptionRow[]>(
  existingPrescriptionItems.length > 0
   ? existingPrescriptionItems.map((item) => ({
     id:      item.id,
     medicineId:  item.medicineId ?? undefined,
     medicineName: item.medicineName,
     dosage:    item.dosage,
     frequency:  item.frequency,
     duration:   item.duration,
     notes:    item.notes ?? '',
    }))
   : [],
 );

 // Lab orders (empty initially — filled by the doctor during consultation)
 const [labRows, setLabRows] = useState<LabOrderRow[]>([]);

 // Follow-up scheduling
 const [wantsFollowUp, setWantsFollowUp] = useState(false);
 const [followUpDate, setFollowUpDate] = useState('');

 const isReadOnly  = appointmentStatus === 'completed';
 const canComplete = appointmentStatus === 'in_progress' || appointmentStatus === 'checked_in';

 // ── Add / remove lab order rows ─────────────────────────────────────────────

 function addLabRow() {
  setLabRows((prev) => [
   ...prev,
   { id: crypto.randomUUID(), testName: '', instructions: '' },
  ]);
 }

 function removeLabRow(id: string) {
  setLabRows((prev) => prev.filter((r) => r.id !== id));
 }

 function updateLabRow(id: string, field: keyof LabOrderRow, value: string) {
  setLabRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
 }

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
  setRxRows((prev) => prev.map((r) => r.id === id
   ? { ...r, [field]: value, ...(field === 'medicineName' ? { medicineId: undefined } : {}) }
   : r));
 }

 // ── Save draft ──────────────────────────────────────────────────────────────

 async function handleSaveDraft() {
  setError(null);
  setSaved(false);

  startDraftTransition(async () => {
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
      diagnosis:   diagnosis || undefined,
      notes:     notes   || undefined,
      vitalsBp:    bp    || undefined,
      vitalsTemp:   temp   || undefined,
      vitalsWeight:  weight  || undefined,
     });

     // Also move appointment to in_progress
     await updateAppointmentStatus({ id: appointmentId, status: 'in_progress' });
    } else {
     await updateVisit(existingVisit.id, {
      chiefComplaint: complaint || undefined,
      diagnosis:   diagnosis || undefined,
      notes:     notes   || undefined,
      vitalsBp:    bp    || undefined,
      vitalsTemp:   temp   || undefined,
      vitalsWeight:  weight  || undefined,
     });
    }
    setSaved(true);
   } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
   }
  });

  // Refresh outside the transition so the page re-fetches in the background
  // without keeping the draft button in a pending/disabled state.
  router.refresh();
 }

 // ── Complete visit ──────────────────────────────────────────────────────────

 async function handleComplete() {
  setError(null);

  // Validate upfront before entering the transition
  if (!existingVisit && !complaint.trim()) {
   setError('Chief complaint is required before completing the visit.');
   return;
  }

  startCompleteTransition(async () => {
   try {
    // 1. Upsert the visit record (must come first — visitId needed below)
    let visitId = existingVisit?.id;
    if (!existingVisit) {
     const visit = await createVisit({
      appointmentId,
      patientId,
      chiefComplaint: complaint,
      diagnosis:   diagnosis || undefined,
      notes:     notes   || undefined,
      vitalsBp:    bp    || undefined,
      vitalsTemp:   temp   || undefined,
      vitalsWeight:  weight  || undefined,
     });
     visitId = visit.id;
    } else {
     const visit = await updateVisit(existingVisit.id, {
      chiefComplaint: complaint || undefined,
      diagnosis:   diagnosis || undefined,
      notes:     notes   || undefined,
      vitalsBp:    bp    || undefined,
      vitalsTemp:   temp   || undefined,
      vitalsWeight:  weight  || undefined,
     });
     visitId = visit.id;
    }

    // 2 + 3. Save prescriptions and lab orders in parallel — they're independent
    const validRxRows = rxRows.filter((r) => r.medicineName.trim());
    const validLabRows = labRows.filter((r) => r.testName.trim());

    await Promise.all([
     validRxRows.length > 0 && visitId
      ? createPrescription({
        visitId,
        items: validRxRows.map((r) => ({
         medicineId:  r.medicineId,
         medicineName: r.medicineName,
         dosage:    r.dosage  || '—',
         frequency:  r.frequency || '—',
         duration:   r.duration || '—',
         notes:    r.notes   || undefined,
        })),
       })
      : Promise.resolve(),

     validLabRows.length > 0 && visitId
      ? createLabOrders({
        visitId,
        orders: validLabRows.map((r) => ({
         testName:   r.testName,
         instructions: r.instructions || undefined,
        })),
       })
      : Promise.resolve(),
    ]);

    // 4. Mark appointment completed
    await updateAppointmentStatus({ id: appointmentId, status: 'completed' });

    // 5. Schedule follow-up if requested (fire-and-forget — failure logged, not thrown)
    if (wantsFollowUp && followUpDate && doctorId) {
     scheduleFollowUp({
      originalAppointmentId: appointmentId,
      doctorId,
      patientId,
      scheduledAt: new Date(followUpDate).toISOString(),
      reason: `Follow-up for ${complaint || 'previous visit'}`,
     }).catch((err) => console.error('Follow-up scheduling failed:', err));
    }

    // Navigate immediately — outside any refresh so we don't wait for
    // the appointments page to re-render before releasing the spinner.
    router.push('/doctor/appointments');
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
    <div className="flex items-start gap-2.5 border border-red-200
     bg-red-50 px-4 py-3 text-sm text-red-700">
     <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
     {error}
    </div>
   )}

   {/* ── Patient Vitals ── */}
   <section className="bg-white border border-border p-5 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
     <span className="text-base">🩺</span>
     <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
      Patient Vitals
     </h2>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
     {[
      { label: 'Blood Pressure (mmHg)', placeholder: '120/80', value: bp,   setter: setBp },
      { label: 'Temperature (°F)',    placeholder: '98.6',  value: temp,  setter: setTemp },
      { label: 'Weight (lbs)',      placeholder: '184.5',  value: weight, setter: setWeight },
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
        className="w-full h-10 px-3 border border-border bg-muted/30
         text-sm text-foreground placeholder:text-muted-foreground/60
         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
         disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
       />
      </div>
     ))}
    </div>
   </section>

   {/* ── Clinical Documentation ── */}
   <section className="bg-white border border-border p-5 shadow-sm">
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
       className="w-full h-10 px-3 border border-border bg-muted/30
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
       className="w-full h-10 px-3 border border-border bg-muted/30
        text-sm text-foreground placeholder:text-muted-foreground/60
        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
        disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      />
     </div>
    </div>

    <div>
     <div className="flex items-center justify-between mb-1.5">
      <label className="block text-xs font-medium text-muted-foreground">
       Clinical Notes
      </label>
      {!isReadOnly && (
       <NotesGeneratorButton
        chiefComplaint={complaint}
        vitalsBp={bp}
        vitalsTemp={temp}
        vitalsWeight={weight}
        diagnosis={diagnosis}
        medicines={rxRows.map((r) => r.medicineName).filter((m) => m.trim())}
        onGenerate={(generated) => setNotes(generated)}
       />
      )}
     </div>
     <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Detailed objective and subjective findings... (or click AI Generate Notes above)"
      rows={5}
      disabled={isReadOnly}
      className="w-full px-3 py-2.5 border border-border bg-muted/30
       text-sm text-foreground placeholder:text-muted-foreground/60 resize-none
       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
       disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
     />
    </div>
   </section>

   {/* ── Prescriptions ── */}
   <section className="bg-white border border-border p-5 shadow-sm">
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
       className="flex items-center gap-1.5 h-8 px-3 border border-border
        text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
       <Plus className="h-3.5 w-3.5" />
       Add Medicine
      </button>
     )}
     {isReadOnly && existingPrescriptionItems.length > 0 && existingPrescriptionItems[0]?.prescriptionId && (
      <a
       href={`/prescriptions/${existingPrescriptionItems[0].prescriptionId}/print`}
       target="_blank"
       className="flex items-center gap-1.5 h-8 px-3 border border-border
        text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
       <Download className="h-3.5 w-3.5 text-primary" />
       Download
      </a>
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
            <td className="py-2 pr-3">
             <MedicineSearch
              value={row.medicineName}
              onChange={(val) => updateRxRow(row.id, 'medicineName', val)}
              onSelect={(medicineId, displayName) => {
               setRxRows((prev) => prev.map((r) => r.id === row.id
                ? { ...r, medicineId, medicineName: displayName }
                : r));
              }}
             />
            </td>
            {(['dosage', 'frequency', 'duration'] as const).map((field) => (
             <td key={field} className="py-2 pr-3">
              <input
               type="text"
               value={row[field]}
               onChange={(e) => updateRxRow(row.id, field, e.target.value)}
               placeholder={
                field === 'dosage'    ? '10mg'    :
                field === 'frequency'  ? 'Once daily' :
                              '30 days'
               }
               className="w-full h-8 px-2.5 border border-border
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
              className="h-8 w-8 flex items-center justify-center 
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

    {/* AI Drug Interaction Check */}
    {!isReadOnly && rxRows.filter((r) => r.medicineName.trim()).length >= 2 && (
     <div className="mt-3 flex justify-end">
      <DrugCheckButton medicines={rxRows.map((r) => r.medicineName).filter((m) => m.trim())} />
     </div>
    )}
   </section>

   {/* ── Lab Orders ── */}
   {!isReadOnly && (
    <section className="bg-white border border-border p-5 shadow-sm">
     <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
       <FlaskConical className="h-4 w-4 text-primary" />
       <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
        Lab Orders
       </h2>
      </div>
      <button
       type="button"
       onClick={addLabRow}
       className="flex items-center gap-1.5 h-8 px-3 border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
       <Plus className="h-3.5 w-3.5" />
       Add Test
      </button>
     </div>

     {labRows.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-6">
       No lab tests ordered.
      </p>
     ) : (
      <div className="space-y-3">
       {labRows.map((row) => (
        <div key={row.id} className="flex items-start gap-3">
         <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_1.5fr] gap-2">
          <input
           type="text"
           value={row.testName}
           onChange={(e) => updateLabRow(row.id, 'testName', e.target.value)}
           placeholder="Test name (e.g. CBC, NS1 Antigen)"
           className="w-full h-10 px-3 border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
          />
          <input
           type="text"
           value={row.instructions}
           onChange={(e) => updateLabRow(row.id, 'instructions', e.target.value)}
           placeholder="Instructions (e.g. Fasting required)"
           className="w-full h-10 px-3 border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
          />
         </div>
         <button
          type="button"
          onClick={() => removeLabRow(row.id)}
          className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
         >
          <Trash2 className="h-4 w-4" />
         </button>
        </div>
       ))}
      </div>
     )}
    </section>
   )}

   {/* ── Follow-up scheduling ── */}
   {!isReadOnly && canComplete && (
    <section className="bg-white border border-border p-5 shadow-sm">
     <label className="flex items-center gap-3 cursor-pointer mb-3">
      <input
       type="checkbox"
       checked={wantsFollowUp}
       onChange={(e) => setWantsFollowUp(e.target.checked)}
       className="h-4 w-4 border-border text-primary focus:ring-primary/20"
      />
      <span className="text-sm font-medium text-foreground">Schedule a follow-up appointment</span>
     </label>
     {wantsFollowUp && (
      <div className="ml-7">
       <input
        type="datetime-local"
        value={followUpDate}
        onChange={(e) => setFollowUpDate(e.target.value)}
        className="h-10 px-3 border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
       />
       <p className="text-xs text-muted-foreground mt-1.5">
        A new appointment will be created for this patient with the same doctor.
       </p>
      </div>
     )}
    </section>
   )}

   {/* ── Footer action bar ── */}
   {!isReadOnly && (
    <div className="sticky bottom-0 -mx-6 px-6 py-3
     bg-white/95 backdrop-blur border-t border-border
     flex items-center justify-between gap-4">
     <p className="text-xs text-muted-foreground flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 bg-emerald-500 inline-block" />
      {saved ? 'Draft saved' : 'Unsaved changes'}
     </p>

     <div className="flex items-center gap-2.5">
      <button
       type="button"
       onClick={handleSaveDraft}
       disabled={isDraftPending || isCompletePending}
       className="h-9 px-5 border border-border bg-white text-sm
        font-medium text-foreground hover:bg-muted transition-colors
        disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
      >
       {isDraftPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
       Save Draft
      </button>

      {canComplete && (
       <button
        type="button"
        onClick={handleComplete}
        disabled={isDraftPending || isCompletePending}
        className="h-9 px-5 bg-primary text-primary-foreground
         text-sm font-semibold hover:bg-primary/90 transition-colors
         disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
       >
        {isCompletePending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Complete Visit
       </button>
      )}
     </div>
    </div>
   )}
  </div>
 );
}
