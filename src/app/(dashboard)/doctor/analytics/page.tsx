import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { getDoctorAnalytics } from '@/server/actions/doctor-analytics.actions';
import { StarRating } from '@/components/shared/star-rating';
import NotificationBell from '@/components/shared/notification-bell';
import {
  BarChart2, Activity, Users, Star, CheckCircle2,
  TrendingUp, Stethoscope,
} from 'lucide-react';

export default async function DoctorAnalyticsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'doctor') redirect('/login');

  let data: Awaited<ReturnType<typeof getDoctorAnalytics>>;
  try {
    data = await getDoctorAnalytics();
  } catch {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <Stethoscope className="h-12 w-12 text-muted-foreground opacity-40" />
        <h2 className="text-lg font-semibold text-foreground">Doctor profile not set up</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          An administrator needs to link your account to a doctor profile before analytics are available.
        </p>
      </div>
    );
  }

  const maxTrend = Math.max(...data.visitsTrend.map((t) => t.count), 1);
  const maxDiagnosis = Math.max(...data.topDiagnoses.map((d) => d.count), 1);
  const totalRatings = data.rating.distribution.reduce((sum, d) => sum + d.count, 0);

  // Donut chart conic-gradient for appointment status
  const { completed, cancelled, scheduled, total } = data.appointmentStats;
  const pctCompleted = total > 0 ? (completed / total) * 100 : 0;
  const pctCancelled = total > 0 ? (cancelled / total) * 100 : 0;
  const pctScheduled = total > 0 ? (scheduled / total) * 100 : 0;
  const donutGradient = `conic-gradient(#10b981 0% ${pctCompleted}%, #f43f5e ${pctCompleted}% ${pctCompleted + pctCancelled}%, #3b82f6 ${pctCompleted + pctCancelled}% 100%)`;

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Performance Analytics</p>
        </div>
        <NotificationBell />
      </div>

      <div className="px-6 py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your clinical activity overview · {data.specialization}
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Activity} label="Total Visits" value={data.totalVisits} color="text-blue-600" bg="bg-blue-50" />
          <StatCard icon={Users} label="Unique Patients" value={data.distinctPatients} color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard icon={Star} label="Avg Rating" value={data.rating.average > 0 ? data.rating.average.toFixed(1) : '—'} color="text-amber-600" bg="bg-amber-50" />
          <StatCard icon={CheckCircle2} label="Completion Rate" value={`${data.appointmentStats.completionRate}%`} color="text-violet-600" bg="bg-violet-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── 14-day visits trend (SVG line chart) ── */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Visits — Last 14 Days</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {data.visitsTrend.reduce((s, t) => s + t.count, 0)} visits
              </span>
            </div>
            <TrendChart data={data.visitsTrend} max={maxTrend} />
          </div>

          {/* ── Appointment status donut ── */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <h2 className="text-sm font-bold text-foreground mb-5">Appointment Status</h2>
            <div className="flex items-center gap-6">
              <div className="relative h-32 w-32 shrink-0">
                <div className="absolute inset-0 rounded-full" style={{ background: donutGradient }} />
                <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-foreground">{total}</p>
                  <p className="text-[10px] text-muted-foreground">total</p>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                <Legend color="bg-emerald-500" label="Completed" value={completed} pct={pctCompleted} />
                <Legend color="bg-blue-500" label="Scheduled" value={scheduled} pct={pctScheduled} />
                <Legend color="bg-rose-500" label="Cancelled/No-show" value={cancelled} pct={pctCancelled} />
              </div>
            </div>
          </div>

          {/* ── Rating histogram ── */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-foreground">Rating Distribution</h2>
              <StarRating rating={data.rating.average} showNumber count={data.rating.count} />
            </div>
            {totalRatings === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No ratings yet.</p>
            ) : (
              <div className="space-y-2">
                {data.rating.distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">{d.star}★</span>
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${totalRatings > 0 ? (d.count / totalRatings) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Top diagnoses ── */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-bold text-foreground mb-5">Top Diagnoses</h2>
            {data.topDiagnoses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No diagnoses recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topDiagnoses.map((d, i) => (
                  <div key={d.diagnosis} className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{d.diagnosis}</span>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">{d.count} cases</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(d.count / maxDiagnosis) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, bg }: { icon: typeof Activity; label: string; value: number | string; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-3xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

function Legend({ color, label, value, pct }: { color: string; label: string; value: number; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color} shrink-0`} />
      <span className="text-xs text-foreground flex-1">{label}</span>
      <span className="text-xs font-medium text-muted-foreground">{value} ({Math.round(pct)}%)</span>
    </div>
  );
}

function TrendChart({ data, max }: { data: { day: string; label: string; count: number }[]; max: number }) {
  const w = 100; // viewBox width units per bar spacing
  const h = 100;
  const barW = w / data.length;
  const points = data.map((d, i) => {
    const x = i * barW + barW / 2;
    const y = h - (d.count / max) * (h - 10);
    return { x, y, ...d };
  });

  // Build a smooth area path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#trendGrad)" />
        <path d={linePath} fill="none" stroke="rgb(59,130,246)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {points.map((p) => (
          <circle key={p.day} cx={p.x} cy={p.y} r="1.5" fill="rgb(59,130,246)" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-1">
        {data.map((d, i) => (
          <span key={d.day} className={`text-[9px] text-muted-foreground ${i % 2 === 1 ? 'hidden sm:inline' : ''}`}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
