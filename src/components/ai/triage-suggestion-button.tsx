'use client';

import { useState } from 'react';
import { Sparkles, Loader2, X, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function TriageSuggestionButton({
  chiefComplaint,
  vitalsBp,
  vitalsTemp,
  vitalsPulse,
  vitalsWeight,
  patientAge,
  patientGender,
  patientAllergies,
}: {
  chiefComplaint: string;
  vitalsBp?: string;
  vitalsTemp?: string;
  vitalsPulse?: string;
  vitalsWeight?: string;
  patientAge?: number;
  patientGender?: string;
  patientAllergies?: string;
}) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!chiefComplaint.trim()) return null;

  async function handleSuggest() {
    setLoading(true);
    setSuggestion(null);
    setShowModal(true);

    try {
      const res = await fetch('/api/ai/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chiefComplaint,
          vitalsBp,
          vitalsTemp,
          vitalsPulse,
          vitalsWeight,
          patientAge,
          patientGender,
          patientAllergies,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSuggestion('Failed to get AI suggestion. Please try again.');
        return;
      }
      setSuggestion(data.suggestion);
    } catch {
      setSuggestion('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Parse severity from suggestion
  const severityMatch = suggestion?.match(/SEVERITY:\s*(CRITICAL|URGENT|STANDARD|LOW)/i);
  const severity = severityMatch?.[1]?.toUpperCase();
  const severityConfig: Record<string, { icon: typeof ShieldCheck; color: string; bg: string }> = {
    CRITICAL: { icon: Zap, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
    URGENT:   { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    STANDARD: { icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    LOW:      { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  };

  return (
    <>
      <button
        type="button"
        onClick={handleSuggest}
        disabled={loading}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-violet-200 text-xs font-semibold text-violet-600 hover:bg-violet-50 transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        AI Triage Suggestion
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <h3 className="text-sm font-bold text-foreground">AI Triage Suggestion</h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is analyzing patient data...</span>
                </div>
              ) : suggestion ? (
                <div className="space-y-3">
                  {/* Severity badge */}
                  {severity && severityConfig[severity] && (
                    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${severityConfig[severity].bg}`}>
                      {(() => {
                        const Icon = severityConfig[severity].icon;
                        return <Icon className={`h-4 w-4 ${severityConfig[severity].color}`} />;
                      })()}
                      <span className={`text-sm font-bold ${severityConfig[severity].color}`}>
                        {severity}
                      </span>
                    </div>
                  )}

                  {/* Full suggestion text */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{suggestion}</p>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center">
                    ⚠ AI suggestion only. Use clinical judgment for final triage decision.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
