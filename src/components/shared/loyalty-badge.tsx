import { Award } from 'lucide-react';

// ─── Loyalty Badge ────────────────────────────────────────────────────────────
// Renders a tiered badge based on the patient's active months.

export function LoyaltyBadge({
 months,
 tier,
}: {
 months: number;
 tier: { name: string; color: string; bg: string; icon: string } | null;
}) {
 if (!tier) {
  return (
   <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground">
    <Award className="h-3 w-3" />
    New Patient
   </span>
  );
 }

 return (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${tier.bg} ${tier.color}`}>
   <span className="text-sm leading-none">{tier.icon}</span>
   {tier.name}
   <span className="opacity-70 font-normal">· {months}mo</span>
  </span>
 );
}
