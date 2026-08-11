'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import AddFamilyMemberForm from '@/components/patient/add-family-member-form';
import { removeFamilyMember as removeAction } from '@/server/actions/family.actions';
import { UserPlus, Droplet, MapPin, Trash2, Loader2, Users, Pencil, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Member {
 id: string;
 name: string;
 phone: string;
 dob: string;
 gender: 'male' | 'female' | 'other';
 bloodGroup: string | null;
 allergies: string | null;
 city: string | null;
 emergencyContact: string | null;
}

export default function FamilyMembersList({ members }: { members: Member[] }) {
 const router = useRouter();
 const [showAdd, setShowAdd] = useState(false);
 const [editing, setEditing] = useState<Member | null>(null);
 const [removingId, setRemovingId] = useState<string | null>(null);
 const [isPending, startTransition] = useTransition();

 function handleRemove(id: string, name: string) {
  if (!confirm(`Remove ${name} from your family? This can't be undone.`)) return;
  setRemovingId(id);
  startTransition(async () => {
   try {
    await removeAction(id);
    toast.success(`${name} removed.`);
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to remove member.');
   } finally {
    setRemovingId(null);
   }
  });
 }

 const genderColor: Record<string, string> = {
  male: 'bg-emerald-100 text-emerald-700',
  female: 'bg-pink-100 text-pink-700',
  other: 'bg-emerald-100 text-emerald-700',
 };

 return (
  <>
   {/* Add button */}
   <button
    type="button"
    onClick={() => setShowAdd(true)}
    className="w-full mb-4 h-12 border-2 border-dashed border-border
     flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground
     hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
   >
    <UserPlus className="h-4 w-4" />
    Add Family Member
   </button>

   {/* Members */}
   {members.length === 0 ? (
    <div className="bg-white border border-border p-10 text-center ">
     <Users className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
     <p className="text-sm font-medium text-foreground">No family members yet</p>
     <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
      Add profiles for your spouse, children, or elderly parents to manage their health alongside yours.
     </p>
    </div>
   ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
     {members.map((m) => {
      const ageMs = Date.now() - new Date(m.dob).getTime();
      const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
      return (
      <div key={m.id} className="premium-card premium-card-pad">
        <div className="flex items-start justify-between mb-3">
         <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
           {m.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
           <p className="text-sm font-bold text-foreground">{m.name}</p>
           <p className="text-xs text-muted-foreground">{age} years old</p>
          </div>
         </div>
          <div className="flex gap-1"><button type="button" onClick={() => setEditing(m)} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5" aria-label="View or edit"><Pencil className="h-3.5 w-3.5" /></button><button
           type="button"
           onClick={() => handleRemove(m.id, m.name)}
           disabled={removingId === m.id}
           className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
           aria-label="Remove"
          >
           {removingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button></div>
        </div>

        <div className="flex flex-wrap gap-1.5">
         <span className={`text-[10px] font-semibold px-2 py-0.5 capitalize ${genderColor[m.gender] ?? 'bg-muted text-muted-foreground'}`}>
          {m.gender}
         </span>
         {m.bloodGroup && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-600 flex items-center gap-0.5">
           <Droplet className="h-2.5 w-2.5" />
           {m.bloodGroup}
          </span>
         )}
         {m.city && (
          <span className="text-[10px] font-medium px-2 py-0.5 bg-muted text-muted-foreground flex items-center gap-0.5">
           <MapPin className="h-2.5 w-2.5" />
           {m.city}
          </span>
         )}
        </div>

        {m.allergies && (
         <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
          ⚠ Allergies: {m.allergies}
         </p>
        )}
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Phone className="h-3 w-3" /> {m.phone}</p>
       </div>
      );
     })}
    </div>
   )}

   {showAdd && <AddFamilyMemberForm onClose={() => setShowAdd(false)} />}
   {editing && <AddFamilyMemberForm member={editing} onClose={() => setEditing(null)} />}
  </>
 );
}
