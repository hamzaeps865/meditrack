'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePatient } from '@/server/actions/patients.actions';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditPatientModal({
 patientId,
 initialName,
 initialPhone,
 initialEmail,
 initialAddress,
 initialEmergencyContact,
 initialBloodGroup,
 initialAllergies,
}: {
 patientId: string;
 initialName: string;
 initialPhone: string;
 initialEmail?: string | null;
 initialAddress?: string | null;
 initialEmergencyContact?: string | null;
 initialBloodGroup?: string | null;
 initialAllergies?: string | null;
}) {
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [isPending, startTransition] = useTransition();
 const [name, setName] = useState(initialName);
 const [phone, setPhone] = useState(initialPhone);
 const [email, setEmail] = useState(initialEmail ?? '');
 const [address, setAddress] = useState(initialAddress ?? '');
 const [emergencyContact, setEmergencyContact] = useState(initialEmergencyContact ?? '');
 const [bloodGroup, setBloodGroup] = useState(initialBloodGroup ?? '');
 const [allergies, setAllergies] = useState(initialAllergies ?? '');

 function handleSave() {
  startTransition(async () => {
   try {
    await updatePatient(patientId, {
     name, phone, email: email || undefined, address: address || undefined,
     emergencyContact: emergencyContact || undefined,
     bloodGroup: (bloodGroup || undefined) as any,
     allergies: allergies || undefined,
    });
    toast.success('Patient updated.');
    setOpen(false);
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update.');
   }
  });
 }

 const inputCls = 'w-full h-10 px-3 border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20';
 const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5';

 return (
  <>
   <button type="button" onClick={() => setOpen(true)}
    className="flex items-center gap-2 h-9 px-4 border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
    Edit Patient
   </button>

   {open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
     <div className="bg-white shadow-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
       <h3 className="text-base font-bold text-foreground">Edit Patient</h3>
       <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-4">
       <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Full Name *</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className={labelCls}>Phone *</label><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
       </div>
       <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Email</label><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div>
         <label className={labelCls}>Blood Group</label>
         <select className={inputCls} value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
          <option value="">Unknown</option>
          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((b) => <option key={b} value={b}>{b}</option>)}
         </select>
        </div>
       </div>
       <div><label className={labelCls}>Address</label><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
       <div><label className={labelCls}>Allergies</label><input className={inputCls} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. Penicillin, Peanuts" /></div>
       <div><label className={labelCls}>Emergency Contact</label><input className={inputCls} value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} /></div>
       <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button type="button" onClick={handleSave} disabled={isPending} className="h-10 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
         {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
        </button>
       </div>
      </div>
     </div>
    </div>
   )}
  </>
 );
}
