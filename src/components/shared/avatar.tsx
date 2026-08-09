// ─── Shared Avatar Component ──────────────────────────────────────────────────
// Shows a profile photo if available, otherwise falls back to initials.

export function Avatar({
  name,
  avatarUrl,
  size = 40,
  className = '',
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = getInitials(name);
  const fontSize = Math.max(10, Math.floor(size * 0.35));

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name ?? 'Avatar'}
        width={size}
        height={size}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initials}
    </div>
  );
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}
