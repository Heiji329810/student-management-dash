import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div
      className="flex gap-0.5"
      onMouseLeave={() => !readonly && setHover(0)}
      role={readonly ? 'img' : 'group'}
      aria-label={readonly ? `${value} out of 5 stars` : 'Rate this event'}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        const StarIcon = (
          <Star
            className={cn(
              iconSize,
              'transition-colors',
              filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
            )}
          />
        );

        if (readonly) {
          return (
            <span key={star} aria-hidden="true">
              {StarIcon}
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHover(star)}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
          >
            {StarIcon}
          </button>
        );
      })}
    </div>
  );
}
