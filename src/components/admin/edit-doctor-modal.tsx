'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDoctor, deleteDoctor } from '@/server/actions/doctors.actions';
import { X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditDoctorModal({
  doctorId,
  initialName,
  initialSpecialization,
  initialLicense,
}: {
  doctorId: string;
  initialName: string;
  initialSpecialization: string;
  initialLicense: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [specialization, setSpecialization] = useState(initialSpecialization);
  const [license, setLicense] = useState(initialLicense);

  function handleSave() {
    startTransition(async () => {
      try {
        await updateDoctor(doctorId, { name, specialization, licenseNumber: license });
        toast.success('Doctor updated.');
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update.');
      }
    });
  }

  function handleDelete() {
    if (!confirm('Delete this doctor profile? The user account will be demoted to patient. This cannot be undone.')) return;
    startTransition(async () => {
      try {
        await deleteDoctor(doctorId);
        toast.success('Doctor removed.');
        router.push('/admin/doctors');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete.');
      }
    });
  }

  const inputCls = 'w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
        Edit Doctor
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Edit Doctor</h3>
              <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className={labelCls}>Full Name</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><label className={labelCls}>Specialization</label><input className={inputCls} value={specialization} onChange={(e) => setSpecialization(e.target.value)} /></div>
              <div><label className={labelCls}>License Number</label><input className={inputCls} value={license} onChange={(e) => setLicense(e.target.value)} /></div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button type="button" onClick={handleDelete} disabled={isPending} className="h-10 px-3 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Remove Doctor
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
                  <button type="button" onClick={handleSave} disabled={isPending} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
