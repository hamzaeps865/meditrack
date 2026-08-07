'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  Bell, X, Calendar, UserCheck, XCircle,
  UserPlus, ShieldAlert, Info, Loader2,
  CheckCheck,
} from 'lucide-react';
import { getNotifications, type NotificationItem } from '@/server/actions/notifications.actions';
import { formatDistanceToNow } from 'date-fns';

// ─── Icon per type ────────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: NotificationItem['type'] }) {
  const cls = 'h-4 w-4 shrink-0';
  switch (type) {
    case 'checked_in':   return <UserCheck  className={`${cls} text-amber-500`}  />;
    case 'cancelled':    return <XCircle    className={`${cls} text-red-500`}    />;
    case 'new_patient':  return <UserPlus   className={`${cls} text-emerald-500`}/>;
    case 'audit':        return <ShieldAlert className={`${cls} text-red-500`}   />;
    case 'appointment':  return <Calendar   className={`${cls} text-blue-500`}   />;
    default:             return <Info       className={`${cls} text-muted-foreground`} />;
  }
}

// ─── Dot color per type ───────────────────────────────────────────────────────

const dotColor: Record<NotificationItem['type'], string> = {
  checked_in:  'bg-amber-400',
  cancelled:   'bg-red-400',
  new_patient: 'bg-emerald-400',
  audit:       'bg-red-500',
  appointment: 'bg-blue-400',
  system:      'bg-muted-foreground',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds,       setReadIds]       = useState<Set<string>>(new Set());
  const [isPending,     startTransition]  = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  // Load on first open
  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      try {
        const data = await getNotifications();
        setNotifications(data);
      } catch {
        // fail silently — bell is non-critical
      }
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current   && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  function markRead(id: string) {
    setReadIds((prev) => new Set([...prev, id]));
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  const unread = notifications.filter((n) => !n.read && !readIds.has(n.id));
  const unreadCount = unread.length;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={btnRef}
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        onClick={() => setOpen((v) => !v)}
        className="relative h-8 w-8 flex items-center justify-center rounded-full
          text-muted-foreground hover:bg-muted transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full
            bg-red-500 text-white text-[9px] font-bold flex items-center justify-center
            leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-10 z-50 w-80 bg-white rounded-2xl
            border border-border shadow-xl overflow-hidden"
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
            border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-foreground" />
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-red-500
                  text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  title="Mark all as read"
                  className="h-7 w-7 flex items-center justify-center rounded-lg
                    text-muted-foreground hover:text-primary hover:bg-muted
                    transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg
                  text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {isPending ? (
              <div className="flex items-center justify-center py-12 gap-2
                text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2
                text-muted-foreground">
                <Bell className="h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs">You're all caught up!</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n, idx) => {
                  const isRead  = n.read || readIds.has(n.id);
                  const isLast  = idx === notifications.length - 1;
                  return (
                    <li key={n.id}
                      className={`${!isLast ? 'border-b border-border' : ''}`}>
                      <Link
                        href={n.href}
                        onClick={() => { markRead(n.id); setOpen(false); }}
                        className={`flex items-start gap-3 px-4 py-3.5
                          hover:bg-muted/50 transition-colors
                          ${!isRead ? 'bg-primary/[0.03]' : ''}`}
                      >
                        {/* Unread dot */}
                        <div className="mt-1 shrink-0">
                          {!isRead
                            ? <div className={`h-2 w-2 rounded-full ${dotColor[n.type]}`} />
                            : <div className="h-2 w-2 rounded-full bg-transparent" />}
                        </div>

                        {/* Icon */}
                        <div className={`h-8 w-8 rounded-full flex items-center
                          justify-center shrink-0 mt-0.5
                          ${!isRead ? 'bg-muted' : 'bg-muted/50'}`}>
                          <NotifIcon type={n.type} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug
                            ${!isRead
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-muted-foreground'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5
                            leading-relaxed line-clamp-2">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-muted/10 text-center">
              <p className="text-xs text-muted-foreground">
                Showing recent activity · Updates on page refresh
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
