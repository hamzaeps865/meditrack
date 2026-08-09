'use client';

import { useState, useTransition } from 'react';
import {
  setDoctorAvailability,
  deleteAvailabilityWindow,
} from '@/server/actions/availability.actions';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Loader2, AlertTriangle,
  Calendar, Zap, RefreshCw, Info,
  Trash2, Check,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type DayOfWeek =
  | 'monday' | 'tuesday' | 'wednesday'
  | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface TimeWindow {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

interface Exception {
  id: string;
  label: string;
  date: string; // display string
}

interface Props {
  doctorId: string;
  initialWindows: TimeWindow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_ORDER: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format "09:00" → "09:00 AM" */
function fmt(t: string): string {
  const [hStr, m] = t.split(':');
  const h = parseInt(hStr, 10);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${m} ${suffix}`;
}

/** Returns true if [a, b) overlaps [c, d) */
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

// ─── Inline add-block form (renders inside a day row) ─────────────────────────

function AddBlockForm({
  doctorId,
  day,
  onClose,
  onAdded,
}: {
  doctorId: string;
  day: DayOfWeek;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [start, setStart] = useState('09:00');
  const [end,   setEnd]   = useState('17:00');
  const [err,   setErr]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (start >= end) { setErr('End time must be after start time.'); return; }
    setErr(null);
    startTransition(async () => {
      try {
        await setDoctorAvailability({ doctorId, dayOfWeek: day, startTime: start, endTime: end });
        toast.success(`Availability added: ${day} ${fmt(start)} – ${fmt(end)}`);
        onAdded();
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to add block.');
        toast.error('Failed to add availability block.');
      }
    });
  }

  return (
    <div className="mt-2 ml-[88px] flex flex-wrap items-end gap-2 pb-1">
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">Start</label>
        <input type="time" value={start}
          onChange={(e) => setStart(e.target.value)}
          className="h-8 px-2 rounded-lg border border-border bg-muted/30 text-sm
            text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">End</label>
        <input type="time" value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="h-8 px-2 rounded-lg border border-border bg-muted/30 text-sm
            text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>
      <button type="button" onClick={submit} disabled={isPending}
        className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm
          font-bold hover:bg-primary/90 transition-colors disabled:opacity-60
          disabled:cursor-not-allowed flex items-center gap-2 shadow-sm">
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {isPending ? 'Saving...' : 'Save Block'}
      </button>
      <button type="button" onClick={onClose}
        className="h-9 px-4 rounded-lg border border-border text-sm font-medium
          text-foreground hover:bg-muted transition-colors">
        Cancel
      </button>
      {err && (
        <p className="w-full text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {err}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AvailabilityManager({ doctorId, initialWindows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local optimistic state so UI responds instantly
  const [windows, setWindows] = useState<TimeWindow[]>(initialWindows);

  // Which day has the inline add-form open
  const [addingDay, setAddingDay] = useState<DayOfWeek | null>(null);

  // Days that have been toggled OFF (no windows → unavailable, toggle is visual)
  // A day is "active" if it has ≥1 window. Toggle simply opens add-form.
  const activeDays = new Set(windows.map((w) => w.dayOfWeek));

  // Exceptions — UI-only (no backend model yet)
  const [exceptions, setExceptions] = useState<Exception[]>([
    { id: '1', label: 'Out of office', date: 'Sunday, July 14, 2024' },
  ]);

  // ── Delete window ──────────────────────────────────────────────────────────
  function handleDelete(windowId: string) {
    // Optimistic remove
    setWindows((prev) => prev.filter((w) => w.id !== windowId));
    startTransition(async () => {
      try {
        await deleteAvailabilityWindow(windowId);
        toast.success('Availability block removed.');
        router.refresh();
      } catch {
        toast.error('Failed to remove block.');
        // Revert on failure
        router.refresh();
      }
    });
  }

  // ── After adding — refresh from server ────────────────────────────────────
  function handleAdded() {
    router.refresh();
  }

  // ── Group windows by day ───────────────────────────────────────────────────
  const byDay = new Map<DayOfWeek, TimeWindow[]>();
  for (const day of DAY_ORDER) byDay.set(day, []);
  for (const w of windows) byDay.get(w.dayOfWeek)?.push(w);

  // ── Overlap detection ─────────────────────────────────────────────────────
  function hasOverlap(day: DayOfWeek): { win1: TimeWindow; win2: TimeWindow } | null {
    const dayWins = byDay.get(day) ?? [];
    for (let i = 0; i < dayWins.length; i++) {
      for (let j = i + 1; j < dayWins.length; j++) {
        const a = dayWins[i], b = dayWins[j];
        if (overlaps(a.startTime, a.endTime, b.startTime, b.endTime)) {
          return { win1: a, win2: b };
        }
      }
    }
    return null;
  }

  return (
    <div className="space-y-6">

      {/* ── Schedule table ── */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">

        {/* Table header */}
        <div className="grid grid-cols-[88px_1fr_110px] px-5 py-3
          border-b border-border bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Day
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Active Time Blocks
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">
            Actions
          </p>
        </div>

        {/* One row per day */}
        {DAY_ORDER.map((day, dayIdx) => {
          const dayWins  = byDay.get(day) ?? [];
          const active   = dayWins.length > 0;
          const overlap  = hasOverlap(day);
          const isLast   = dayIdx === DAY_ORDER.length - 1;
          const isAdding = addingDay === day;

          return (
            <div key={day}
              className={`${!isLast ? 'border-b border-border' : ''}`}>
              <div className="grid grid-cols-[88px_1fr_110px] items-center px-5 py-4">

                {/* Toggle + day name */}
                <div className="flex items-center gap-2.5">
                  {/* Toggle pill — opens add form for inactive days */}
                  <button
                    type="button"
                    onClick={() => setAddingDay(isAdding ? null : day)}
                    aria-label={active ? `${DAY_LABELS[day]} active` : `Enable ${DAY_LABELS[day]}`}
                    className={`h-6 w-11 rounded-full flex items-center px-0.5
                      transition-colors shrink-0 cursor-pointer
                      ${active ? 'bg-primary justify-end' : 'bg-muted justify-start'}`}
                  >
                    <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  </button>
                  <span className={`text-sm font-semibold
                    ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {DAY_LABELS[day]}
                  </span>
                </div>

                {/* Time block chips */}
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  {dayWins.length === 0 ? (
                    <span className="text-sm italic text-muted-foreground/60">
                      Unavailable
                    </span>
                  ) : (
                    dayWins.map((w) => {
                      const isOverlapping = overlap !== null &&
                        (overlap.win1.id === w.id || overlap.win2.id === w.id);
                      return (
                        <div key={w.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                            text-xs font-semibold border transition-colors
                            ${isOverlapping
                              ? 'bg-red-50 border-red-400 text-red-600'
                              : 'bg-muted/40 border-border text-foreground'}`}>
                          <span>{fmt(w.startTime)} – {fmt(w.endTime)}</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(w.id)}
                            disabled={isPending}
                            aria-label="Remove block"
                            className={`rounded transition-colors disabled:opacity-40
                              ${isOverlapping
                                ? 'text-red-400 hover:text-red-600'
                                : 'text-muted-foreground hover:text-red-500'}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add block action */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAddingDay(isAdding ? null : day)}
                    className="text-xs font-semibold text-primary hover:underline
                      flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add block
                  </button>
                </div>
              </div>

              {/* Overlap warning */}
              {overlap && (
                <div className="mx-5 mb-3 flex items-center gap-2 rounded-lg
                  bg-red-50 border border-red-100 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">
                    This overlaps with your{' '}
                    <span className="font-semibold">
                      {fmt(overlap.win1.startTime)}–{fmt(overlap.win1.endTime)}
                    </span>{' '}
                    block
                  </p>
                </div>
              )}

              {/* Inline add form */}
              {isAdding && (
                <div className="px-5 pb-4">
                  <AddBlockForm
                    doctorId={doctorId}
                    day={day}
                    onClose={() => setAddingDay(null)}
                    onAdded={handleAdded}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Upcoming Exceptions ── */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3">
          Upcoming Exceptions
        </h2>
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Existing exceptions */}
          {exceptions.map((ex) => (
            <div key={ex.id}
              className="flex items-center justify-between px-5 py-4
                border-b border-border last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center
                  justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{ex.label}</p>
                  <p className="text-xs text-muted-foreground">{ex.date}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExceptions((prev) => prev.filter((e) => e.id !== ex.id))}
                aria-label="Delete exception"
                className="h-8 w-8 flex items-center justify-center rounded-lg
                  text-muted-foreground hover:text-red-500 hover:bg-red-50
                  transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Add exception CTA */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-5 py-4
              text-sm font-medium text-muted-foreground hover:text-foreground
              hover:bg-muted/30 transition-colors border-dashed border border-border
              rounded-b-2xl"
            onClick={() => {
              const label = 'Out of office';
              const date  = new Date();
              date.setDate(date.getDate() + 7);
              setExceptions((prev) => [
                ...prev,
                {
                  id:    crypto.randomUUID(),
                  label,
                  date:  date.toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  }),
                },
              ]);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Exception
          </button>
        </div>
      </div>

      {/* ── Info cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Standard Policy */}
        <div className="rounded-2xl p-5 text-white"
          style={{ backgroundColor: '#1E3A5F' }}>
          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center
            justify-center mb-3">
            <Info className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">Standard Policy</h3>
          <p className="text-xs text-white/70 leading-relaxed">
            Slots are generated 30 days in advance based on these weekly
            recurring hours.
          </p>
        </div>

        {/* Emergency Blocks */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center
            justify-center mb-3">
            <Zap className="h-4 w-4 text-foreground" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1.5">Emergency Blocks</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Need to clear today's schedule? Use the dashboard "Clear Day"
            feature instead.
          </p>
        </div>

        {/* Auto-Sync */}
        <div className="bg-muted/40 rounded-2xl border border-border p-5">
          <div className="h-8 w-8 rounded-full bg-white flex items-center
            justify-center mb-3 shadow-sm">
            <RefreshCw className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1.5">Auto-Sync</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your availability is automatically synced with the MediTrack
            Patient App.
          </p>
        </div>
      </div>
    </div>
  );
}
