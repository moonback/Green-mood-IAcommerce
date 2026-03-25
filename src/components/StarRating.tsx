import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (rating: number) => void;
  showCount?: boolean;
  count?: number;
}

export default function StarRating({
  rating,
  size = 'sm',
  interactive = false,
  onRate,
  showCount,
  count,
}: StarRatingProps) {
  const sizeClass = size === 'sm'
    ? 'w-3.5 h-3.5'
    : size === 'md'
    ? 'w-5 h-5'
    : 'w-6 h-6';

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate && onRate(i + 1)}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          >
            <Star
              className={`${sizeClass} transition-colors ${
                filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-zinc-600 fill-transparent'
              } ${interactive ? 'hover:fill-yellow-300 hover:text-yellow-300' : ''}`}
            />
          </button>
        );
      })}
      {showCount && count !== undefined && (
        <span className="text-xs text-zinc-500 ml-1">({count})</span>
      )}
    </div>
  );
}
