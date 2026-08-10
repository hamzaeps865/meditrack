'use client';

import { useState } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, X, Sparkles } from 'lucide-react';

export default function DrugCheckButton({
  medicines,
}: {
  medicines: string[];
}) {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasWarning, setHasWarning] = useState(false);

  // Only show if 2+ medicines are entered
  const validMeds = medicines.filter((m) => m.trim().length > 0);
  if (validMeds.length < 2) return null;

  async function handleCheck() {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowModal(true);

    try {
      const res = await fetch('/api/ai/drug-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicines: validMeds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult(data.error || 'Failed to check interactions.');
        return;
      }

      setResult(data.explanation);
      setHasWarning(data.hasInteractions);
    } catch {
      setResult('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={handleCheck}
        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Check Drug Interactions
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center ${hasWarning ? 'bg-amber-100' : 'bg-violet-100'}`}>
                  {hasWarning ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />}
                </div>
                <h3 className="text-sm font-bold text-foreground">AI Drug Interaction Check</h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Medicines list */}
              <div className="bg-muted/40 rounded-lg px-3 py-2 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Checking</p>
                <p className="text-xs text-foreground">{validMeds.join(', ')}</p>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Checking for interactions...</span>
                </div>
              )}

              {result && !loading && (
                <div className={`rounded-lg p-3 ${hasWarning ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{result}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
