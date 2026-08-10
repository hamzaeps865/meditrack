'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function NotesGeneratorButton({
 chiefComplaint,
 vitalsBp,
 vitalsTemp,
 vitalsWeight,
 diagnosis,
 medicines,
 onGenerate,
}: {
 chiefComplaint: string;
 vitalsBp: string;
 vitalsTemp: string;
 vitalsWeight: string;
 diagnosis: string;
 medicines: string[];
 onGenerate: (notes: string) => void;
}) {
 const [loading, setLoading] = useState(false);

 async function handleGenerate() {
  if (!chiefComplaint.trim()) {
   return; // Button is disabled anyway
  }
  setLoading(true);
  try {
   const res = await fetch('/api/ai/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     chiefComplaint,
     vitalsBp,
     vitalsTemp,
     vitalsWeight,
     diagnosis,
     medicines,
    }),
   });

   const data = await res.json();

   if (!res.ok) {
    return;
   }

   onGenerate(data.notes);
  } catch {
   // Silent fail
  } finally {
   setLoading(false);
  }
 }

 return (
  <button
   type="button"
   onClick={handleGenerate}
   disabled={loading || !chiefComplaint.trim()}
   className="inline-flex items-center gap-1.5 h-8 px-3 border border-emerald-200
    text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors
    disabled:opacity-50 disabled:cursor-not-allowed"
  >
   {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
   AI Generate Notes
  </button>
 );
}
