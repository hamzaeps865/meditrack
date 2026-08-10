'use client';

import { useState, useEffect } from 'react';
import { Megaphone, X, ShieldAlert } from 'lucide-react';

// ─── Health Alerts Banner ─────────────────────────────────────────────────────
// Client component that receives active alerts (fetched server-side) and renders
// dismissible severity-colored banners. Dismissed state is per-session (memory).

interface AlertData {
  id: string;
  title: string;
  message: string;
  disease: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  city: string | null;
}

const severityStyle: Record<string, { bg: string; border: string; icon: typeof ShieldAlert; iconColor: string }> = {
  low:      { bg: 'bg-emerald-50',     border: 'border-emerald-300',     icon: Megaphone,   iconColor: 'text-emerald-700' },
  medium:   { bg: 'bg-amber-50',    border: 'border-amber-300',    icon: ShieldAlert, iconColor: 'text-amber-600' },
  high:     { bg: 'bg-orange-50',   border: 'border-orange-300',   icon: ShieldAlert, iconColor: 'text-orange-600' },
  critical: { bg: 'bg-rose-50',     border: 'border-rose-300',     icon: ShieldAlert, iconColor: 'text-rose-600' },
};

export default function HealthAlertsBanner({ alerts }: { alerts: AlertData[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Keep dismissed in memory only (resets on page refresh — intentional, so
  // active public-health warnings re-surface on each visit)
  const visible = alerts.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((alert) => {
        const style = severityStyle[alert.severity] ?? severityStyle.medium;
        const Icon = style.icon;
        return (
          <div key={alert.id} className={`${style.bg} ${style.border} border rounded-xl px-4 py-3 flex items-start gap-3`}>
            <Icon className={`h-5 w-5 ${style.iconColor} shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-foreground">{alert.title}</p>
                {alert.disease && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/60 text-foreground">
                    {alert.disease}
                  </span>
                )}
                {alert.city && (
                  <span className="text-[10px] text-muted-foreground">· {alert.city}</span>
                )}
              </div>
              <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{alert.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
              className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-white/40 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
