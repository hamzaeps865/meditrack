'use client';

import { useEffect } from 'react';
import { Printer } from 'lucide-react';

// ─── Print Trigger ────────────────────────────────────────────────────────────
// Shows a "Print / Save as PDF" button (hidden when actually printing) and
// auto-opens the print dialog on page load.

export default function PrintTrigger() {
 useEffect(() => {
  // Small delay so the page fully renders before the dialog opens
  const t = setTimeout(() => window.print(), 500);
  return () => clearTimeout(t);
 }, []);

 return (
  <div className="no-print fixed bottom-6 right-6 z-50 flex gap-2">
   <button
    type="button"
    onClick={() => window.print()}
    className="flex items-center gap-2 h-11 px-5 bg-emerald-700 text-white text-sm font-semibold shadow-lg hover:bg-emerald-800 transition-colors"
   >
    <Printer className="h-4 w-4" />
    Save as PDF
   </button>
  </div>
 );
}
