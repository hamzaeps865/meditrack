'use client';

import { useState } from 'react';
import { Sparkles, Loader2, X, AlertCircle } from 'lucide-react';

export default function LabExplainButton({
 testName,
 result,
 referenceRange,
 patientName,
}: {
 testName: string;
 result: string;
 referenceRange?: string | null;
 patientName?: string;
}) {
 const [explanation, setExplanation] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [showModal, setShowModal] = useState(false);

 async function handleExplain() {
  setLoading(true);
  setError(null);
  setExplanation(null);
  setShowModal(true);

  try {
   const res = await fetch('/api/ai/lab-explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testName, result, referenceRange, patientName }),
   });

   const data = await res.json();

   if (!res.ok) {
    setError(data.error || 'Failed to generate explanation.');
    return;
   }

   setExplanation(data.explanation);
  } catch {
   setError('Network error. Please try again.');
  } finally {
   setLoading(false);
  }
 }

 return (
  <>
   <button
    type="button"
    onClick={handleExplain}
    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-700"
   >
    <Sparkles className="h-3 w-3" />
    Explain in Simple Language
   </button>

   {showModal && (
    <div
     className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
     onClick={() => setShowModal(false)}
    >
     <div
      className="bg-white shadow-xl border border-border w-full max-w-md max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
     >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
       <div className="flex items-center gap-2">
        <div className="h-7 w-7 bg-emerald-100 flex items-center justify-center">
         <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
        </div>
        <h3 className="text-sm font-bold text-foreground">AI Explanation</h3>
       </div>
       <button
        type="button"
        onClick={() => setShowModal(false)}
        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-muted"
       >
        <X className="h-4 w-4" />
       </button>
      </div>

      {/* Body */}
      <div className="p-5">
       {/* Test context */}
       <div className="bg-muted/40 px-3 py-2 mb-4">
        <p className="text-xs font-semibold text-foreground">{testName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Result: {result}</p>
        {referenceRange && (
         <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          Normal range: {referenceRange.split('\n')[0]}
          {referenceRange.includes('\n') ? '...' : ''}
         </p>
        )}
       </div>

       {/* Loading */}
       {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
         <Loader2 className="h-4 w-4 animate-spin" />
         <span className="text-sm">AI is analyzing your results...</span>
        </div>
       )}

       {/* Error */}
       {error && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2">
         <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
         <p className="text-xs text-amber-700">{error}</p>
        </div>
       )}

       {/* Explanation */}
       {explanation && (
        <div className="space-y-3">
         <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
          {explanation}
         </p>
        </div>
       )}
      </div>
     </div>
    </div>
   )}
  </>
 );
}
