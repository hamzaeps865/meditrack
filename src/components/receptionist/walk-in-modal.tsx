'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createWalkInAppointment } from '@/server/actions/appointments.actions';
import { searchPatients } from '@/server/actions/patients.actions';
import { Loader2, X, UserPlus, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function WalkInModal({ doctors }: { doctors: { id: string; name: string | null; specialization: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? '');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await searchPatients(query);
        setResults(r.map((p) => ({ id: p.id, name: p.name, phone: p.phone })));
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function handleSubmit() {
    if (!selectedPatient || !doctorId) { toast.error('Select a patient and doctor.'); return; }
    startTransition(async () => {
      try {
        await createWalkInAppointment({
          patientId: selectedPatient.id,
          doctorId,
          reason: reason || undefined,
        });
        toast.success(`Walk-in created for ${selectedPatient.name}.`);
        setOpen(false);
        setSelectedPatient(null);
        setQuery('');
        setReason('');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create walk-in.');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white border border-border text-xs font-bold text-foreground hover:bg-muted/40 transition-colors flex items-center gap-1.5 shadow-sm"
      >
        <UserPlus className="h-3.5 w-3.5 text-primary" />
        Walk-In Patient
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Walk-In Patient</h3>
              <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {!selectedPatient ? (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search Patient</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Name or phone..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  {results.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {results.map((p) => (
                        <button key={p.id} type="button" onClick={() => { setSelectedPatient({ id: p.id, name: p.name }); setQuery(''); setResults([]); }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{selectedPatient.name}</span>
                  <button type="button" onClick={() => setSelectedPatient(null)} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Doctor</label>
                <select className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name ?? 'Doctor'} ({d.specialization})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason (optional)</label>
                <input className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fever, check-up" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
                <button type="button" onClick={handleSubmit} disabled={isPending || !selectedPatient} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create Walk-In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
