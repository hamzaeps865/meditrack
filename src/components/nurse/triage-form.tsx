'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTriageRecord } from '@/server/actions/triage.actions';
import { Loader2, AlertTriangle, Activity, Thermometer, Weight, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';

interface TriageFormProps {
  appointmentId: string;
  patientId: string;
  patientName: string;
}

const severityOptions = [
  { value: 'critical', label: 'Critical', desc: 'Life-threatening, needs immediate attention', bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', dot: 'bg-rose-500' },
  { value: 'urgent', label: 'Urgent', desc: 'Serious, should be seen soon', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500' },
  { value: 'standard', label: 'Standard', desc: 'Routine consultation', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' },
  { value: 'low', label: 'Low', desc: 'Minor / follow-up', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500' },
] as const;

export default function TriageForm({ appointmentId, patientId, patientName }: TriageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [severity, setSeverity] = useState<'critical' | 'urgent' | 'standard' | 'low'>('standard');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [bp, setBp] = useState('');
  const [temp, setTemp] = useState('');
  const [weight, setWeight] = useState('');
  const [pulse, setPulse] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chiefComplaint.trim()) {
      toast.error('Chief complaint is required.');
      return;
    }
    startTransition(async () => {
      try {
        await createTriageRecord({
          appointmentId,
          patientId,
          severity,
          chiefComplaint,
          vitalsBp: bp || undefined,
          vitalsTemp: temp || undefined,
          vitalsWeight: weight || undefined,
          vitalsPulse: pulse || undefined,
          notes: notes || undefined,
        });
        toast.success('Triage recorded. Patient is ready for the doctor.');
        router.push('/nurse');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to record triage.');
      }
    });
  }

  const inputCls =
    'w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Severity selector */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-foreground mb-3">
          Severity Assessment
        </label>
        <div className="grid grid-cols-2 gap-3">
          {severityOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSeverity(opt.value)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                severity === opt.value
                  ? `${opt.bg} ${opt.border} ring-2 ring-offset-1 ring-${opt.dot.replace('bg-', '')}`
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                <span className={`text-sm font-bold ${severity === opt.value ? opt.text : 'text-foreground'}`}>
                  {opt.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chief complaint */}
      <div>
        <label className={labelCls}>Chief Complaint *</label>
        <input
          className={inputCls}
          value={chiefComplaint}
          onChange={(e) => setChiefComplaint(e.target.value)}
          placeholder="e.g. Fever for 3 days, severe headache, chest pain"
          required
        />
      </div>

      {/* Vitals */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-foreground mb-3">
          Vital Signs
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>BP (mmHg)</label>
            <input className={inputCls} value={bp} onChange={(e) => setBp(e.target.value)} placeholder="120/80" />
          </div>
          <div>
            <label className={labelCls}>Temp (°F)</label>
            <input className={inputCls} value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="98.6" />
          </div>
          <div>
            <label className={labelCls}>Pulse (bpm)</label>
            <input className={inputCls} value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="72" />
          </div>
          <div>
            <label className={labelCls}>Weight (kg)</label>
            <input className={inputCls} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Triage Notes</label>
        <textarea
          className={`${inputCls} h-auto py-2.5 resize-none`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional observations for the doctor..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.push('/nurse')}
          className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Record Triage
        </button>
      </div>
    </form>
  );
}
