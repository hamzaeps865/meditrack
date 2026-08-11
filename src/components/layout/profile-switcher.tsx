'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { setActivePatient } from '@/server/actions/active-patient-actions';
import { ChevronDown, User, Users, Check, Loader2 } from 'lucide-react';

interface Profile {
 id: string;
 name: string;
 isManaged: boolean;
}

export default function ProfileSwitcher({
 profiles,
 activeId,
}: {
 profiles: Profile[];
 activeId: string | null;
}) {
 const [open, setOpen] = useState(false);
 const [isPending, startTransition] = useTransition();
 const ref = useRef<HTMLDivElement>(null);

 // Close on outside click
 useEffect(() => {
  if (!open) return;
  function handler(e: MouseEvent) {
   if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  }
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
 }, [open]);

 const active = profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;

 if (profiles.length === 0) return null;

 function switchTo(id: string) {
  setOpen(false);
  startTransition(async () => {
   await setActivePatient(id);
   window.location.reload();
  });
 }

 function switchToSelf() {
  setOpen(false);
  startTransition(async () => {
   await setActivePatient(null);
   window.location.reload();
  });
 }

 return (
  <div ref={ref} className="relative px-4 pb-3">
   <button
    type="button"
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between gap-2 px-3 py-2 
     border border-border bg-muted/40 hover:bg-muted transition-colors text-left"
   >
    <div className="flex items-center gap-2 min-w-0">
     <div className={`h-6 w-6 flex items-center justify-center shrink-0
      ${active?.isManaged ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'}`}>
      {active?.isManaged ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
     </div>
     <div className="min-w-0">
      <p className="text-xs font-semibold text-foreground truncate">
       {active?.name ?? 'Select profile'}
      </p>
      <p className="text-[10px] text-muted-foreground">
       {active?.isManaged ? 'Managing' : 'My profile'}
      </p>
     </div>
    </div>
    {isPending ? (
     <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
    ) : (
     <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    )}
   </button>

   {open && (
    <div className="absolute left-4 right-4 top-full mt-1 z-50 bg-white 
     border border-border  overflow-hidden">
     {profiles.map((p) => {
      const isActive = p.id === active?.id;
      return (
       <button
        key={p.id}
        type="button"
        onClick={() => (p.isManaged ? switchTo(p.id) : switchToSelf())}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left
         hover:bg-muted transition-colors ${isActive ? 'bg-primary/5' : ''}`}
       >
        <div className={`h-6 w-6 flex items-center justify-center shrink-0
         ${p.isManaged ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'}`}>
         {p.isManaged ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
        </div>
        <div className="flex-1 min-w-0">
         <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
         <p className="text-[10px] text-muted-foreground">
          {p.isManaged ? 'Family member' : 'My profile'}
         </p>
        </div>
        {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
       </button>
      );
     })}
    </div>
   )}
  </div>
 );
}
