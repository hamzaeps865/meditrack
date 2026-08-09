import { Star } from 'lucide-react';

// ─── Read-only star display ───────────────────────────────────────────────────
// Shows a numeric rating as filled/half/empty stars.

export function StarRating({
  rating,
  size = 14,
  showNumber = false,
  count,
}: {
  rating: number;
  size?: number;
  showNumber?: boolean;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = rating >= star ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30';
          return <Star key={star} className={`${fill}`} style={{ width: size, height: size }} />;
        })}
      </div>
      {showNumber && (
        <span className="text-xs font-medium text-muted-foreground ml-1">
          {rating > 0 ? rating.toFixed(1) : 'New'}
          {count !== undefined && rating > 0 ? ` (${count})` : ''}
        </span>
      )}
    </div>
  );
}
