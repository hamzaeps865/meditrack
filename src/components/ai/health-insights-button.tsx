'use client';

import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';

export default function HealthInsightsButton() {
 const [insights, setInsights] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [showModal, setShowModal] = useState(false);

 async function handleGenerate() {
  setLoading(true);
  setInsights(null);
  setShowModal(true);

  try {
   const res = await fetch('/api/ai/insights', { method: 'POST' });
   const data = await res.json();
   if (!res.ok) {
    setInsights(data.error || 'Failed to generate insights.');
    return;
   }
   setInsights(data.insights);
  } catch {
   setInsights('Network error. Please try again.');
  } finally {
   setLoading(false);
  }
 }

 return (
  <>
   <button
    type="button"
    onClick={handleGenerate}
    className="inline-flex items-center gap-1.5 h-10 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold hover:opacity-90 transition-opacity "
   >
    <Sparkles className="h-4 w-4" />
    AI Health Insights
   </button>

   {showModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowModal(false)}>
     <div className="bg-white  border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
       <div className="flex items-center gap-2">
        <div className="h-7 w-7 bg-gradient-to-r from-emerald-600 to-emerald-700 flex items-center justify-center">
         <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <h3 className="text-sm font-bold text-foreground">AI Health Insights</h3>
       </div>
       <button type="button" onClick={() => setShowModal(false)} className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-muted">
        <X className="h-4 w-4" />
       </button>
      </div>

      <div className="p-5">
       {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
         <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
         <span className="text-sm">AI is analyzing your health data...</span>
        </div>
       ) : insights ? (
        <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
         {insights}
        </div>
       ) : null}
      </div>
     </div>
    </div>
   )}
  </>
 );
}
