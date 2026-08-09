// ─── Gamification tier logic (pure, client + server safe) ─────────────────────
// Pure helpers kept OUT of the 'use server' file because a server-actions module
// can only export async functions. These are consumed by both server actions and
// client components.

export const SCORE_TIERS = [
  { min: 1000, name: 'Platinum', color: 'text-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-200' },
  { min: 500, name: 'Gold', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  { min: 200, name: 'Silver', color: 'text-slate-500', bg: 'bg-slate-100', ring: 'ring-slate-300' },
  { min: 50, name: 'Bronze', color: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-orange-200' },
  { min: 0, name: 'Starter', color: 'text-muted-foreground', bg: 'bg-muted', ring: 'ring-border' },
] as const;

export const LOYALTY_TIERS = [
  { minMonths: 12, name: 'Platinum', color: 'text-cyan-700', bg: 'bg-cyan-100', icon: '💎' },
  { minMonths: 6, name: 'Gold', color: 'text-amber-700', bg: 'bg-amber-100', icon: '🥇' },
  { minMonths: 3, name: 'Silver', color: 'text-slate-600', bg: 'bg-slate-200', icon: '🥈' },
  { minMonths: 1, name: 'Bronze', color: 'text-orange-700', bg: 'bg-orange-100', icon: '🥉' },
] as const;

export function tierForScore(score: number) {
  return SCORE_TIERS.find((t) => score >= t.min) ?? SCORE_TIERS[SCORE_TIERS.length - 1];
}

export function nextTier(score: number) {
  const currentIdx = SCORE_TIERS.findIndex((t) => score >= t.min);
  return currentIdx > 0 ? SCORE_TIERS[currentIdx - 1] : null;
}

export function tierForMonths(months: number) {
  return LOYALTY_TIERS.find((t) => months >= t.minMonths) ?? null;
}

// Thresholds for progress-bar math (used by HealthScoreCard)
export function scoreThresholdBefore(min: number): number {
  const thresholds = [0, 50, 200, 500, 1000];
  const idx = thresholds.indexOf(min);
  return idx > 0 ? thresholds[idx - 1] : 0;
}
