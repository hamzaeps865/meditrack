'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createFamilyMember } from '@/server/actions/family.actions';
import { Plus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function AddFamilyMemberForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [city, setCity] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !dob) {
      toast.error('Name and date of birth are required.');
      return;
    }
    startTransition(async () => {
      try {
        await createFamilyMember({
          name,
          dob,
          gender,
          bloodGroup: bloodGroup || undefined,
          allergies: allergies || undefined,
          emergencyContact: emergencyContact || undefined,
          city: city || undefined,
        });
        toast.success(`${name} added to your family.`);
        router.refresh();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add family member.');
      }
    });
  }

  const inputCls =
    'w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">Add Family Member</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
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
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
