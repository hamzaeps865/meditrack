import { TrendingUp, Sparkles } from 'lucide-react';
import { scoreThresholdBefore } from '@/lib/gamification';

// ─── Health Score Card ────────────────────────────────────────────────────────
// Displays the patient's gamified health score, current tier, and progress bar.

export function HealthScoreCard({
 total,
 tier,
 next,
}: {
 total: number;
 tier: { name: string; color: string; bg: string; ring: string };
 next: { name: string; min: number; color: string; bg: string; ring: string } | null;
}) {
 // Progress to the next tier
 const prevThreshold = next ? scoreThresholdBefore(next.min) : 0;
 const progress = next
  ? Math.min(((total - prevThreshold) / (next.min - prevThreshold)) * 100, 100)
  : 100;

 return (
    <div className={`premium-card premium-card-pad ${tier.ring} ring-1`}>
   <div className="flex items-center justify-between mb-4">
    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
     Health Score
    </h3>
    <Sparkles className="h-4 w-4 text-amber-400" />
   </div>

   <div className="flex items-end gap-3 mb-1">
    <p className={`text-4xl font-bold ${tier.color}`}>{total}</p>
    <p className="text-sm text-muted-foreground mb-1.5">points</p>
   </div>

   <span className={`inline-block px-2.5 py-1 text-xs font-bold ${tier.bg} ${tier.color} mb-4`}>
    {tier.name} Tier
   </span>

   {next ? (
    <div>
     <div className="flex items-center justify-between mb-1.5">
      <p className="text-xs text-muted-foreground">
       {next.min - total} points to <span className="font-medium text-foreground">{next.name}</span>
      </p>
     </div>
     <div className="h-2 bg-muted overflow-hidden">
      <div
       className="h-full bg-primary transition-all"
       style={{ width: `${progress}%` }}
      />
     </div>
    </div>
   ) : (
    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
     <TrendingUp className="h-3.5 w-3.5" />
     Highest tier reached!
    </div>
   )}
  </div>
 );
}
