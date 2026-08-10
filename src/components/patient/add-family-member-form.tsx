'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createFamilyMember, updateFamilyMember } from '@/server/actions/family.actions';
import { Plus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { isValidPakistaniPhone, pakistaniPhoneMessage } from '@/lib/validators/phone';

type Member = { id: string; name: string; dob: string; gender: 'male' | 'female' | 'other'; phone: string; bloodGroup: string | null; allergies: string | null; city: string | null; emergencyContact: string | null };
export default function AddFamilyMemberForm({ onClose, member }: { onClose: () => void; member?: Member | null }) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();
 const [name, setName] = useState(member?.name ?? ''); const [dob, setDob] = useState(member?.dob ?? '');
 const [gender, setGender] = useState<'male' | 'female' | 'other'>(member?.gender ?? 'male'); const [phone, setPhone] = useState(member?.phone ?? '');
 const [bloodGroup, setBloodGroup] = useState(member?.bloodGroup ?? ''); const [allergies, setAllergies] = useState(member?.allergies ?? '');
 const [emergencyContact, setEmergencyContact] = useState(member?.emergencyContact ?? ''); const [city, setCity] = useState(member?.city ?? '');

 function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!name.trim() || !dob) {
   toast.error('Please enter name and date of birth.');
   return;
  }
  if (!isValidPakistaniPhone(phone)) {
   toast.error(pakistaniPhoneMessage);
   return;
  }
  startTransition(async () => {
   try {
    const input = { name: name.trim(),
     dob,
     gender,
     phone: phone.trim(),
     bloodGroup: bloodGroup || undefined,
     allergies: allergies || undefined,
     emergencyContact: emergencyContact || undefined,
     city: city || undefined };
    if (member) await updateFamilyMember(member.id, input); else await createFamilyMember(input);
    toast.success(`${name} ${member ? 'updated' : 'added to your family'}.`);
    router.refresh();
    onClose();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to add family member.');
   }
  });
 }

 const inputCls =
  'w-full h-10 px-3 border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';
 const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5';

 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
   <div className="bg-white shadow-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
    <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
     <div className="flex items-center gap-2">
      <Plus className="h-4 w-4 text-primary" />
      <h3 className="text-base font-bold text-foreground">{member ? 'Edit Family Member' : 'Add Family Member'}</h3>
     </div>
     <button
      type="button"
      onClick={onClose}
      className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted"
     >
      <X className="h-4 w-4" />
     </button>
    </div>

    <form onSubmit={handleSubmit} className="p-5 space-y-4">
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
       <label className={labelCls}>Full Name *</label>
       <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed Khan" required />
      </div>
      <div>
       <label className={labelCls}>Date of Birth *</label>
       <input type="date" className={inputCls} value={dob} onChange={(e) => setDob(e.target.value)} required />
      </div>
     </div>
     <div><label className={labelCls}>Phone Number *</label><input type="tel" pattern="0[0-9]{10}" maxLength={11} title="11 digits starting with 0" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 03001234567" required /></div>

     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
       <label className={labelCls}>Gender</label>
       <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
       </select>
      </div>
      <div>
       <label className={labelCls}>Blood Group</label>
       <select className={inputCls} value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
        <option value="">Unknown</option>
        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
         <option key={b} value={b}>{b}</option>
        ))}
       </select>
      </div>
     </div>

     <div>
      <label className={labelCls}>City</label>
      <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Karachi" />
     </div>

     <div>
      <label className={labelCls}>Allergies</label>
      <input className={inputCls} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. Penicillin, Peanuts" />
     </div>

     <div>
      <label className={labelCls}>Emergency Contact</label>
      <input className={inputCls} value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Name + phone" />
     </div>

     <div className="flex items-center justify-end gap-2 pt-2">
      <button type="button" onClick={onClose} className="h-10 px-4 border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
       Cancel
      </button>
      <button type="submit" disabled={isPending} className="h-10 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
       {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
       {member ? 'Save Changes' : 'Add Member'}
      </button>
     </div>
    </form>
   </div>
  </div>
 );
}
