import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  className?: string;
}

export default function RatingStars({ rating, reviewCount, className }: RatingStarsProps) {
  const filledStars = Math.round(rating);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, idx) => {
          const filled = idx < filledStars;
          return (
            <Star
              key={idx}
              className={cn(
                'h-4 w-4',
                filled ? 'fill-[var(--coffee-accent)] text-[var(--coffee-accent)]' : 'text-[rgba(111,78,55,0.3)]',
              )}
            />
          );
        })}
      </div>
      <span className="text-xs text-[rgba(26,14,7,0.75)]">
        {rating.toFixed(1).replace('.', ',')}
        {typeof reviewCount === 'number' ? ` · ${reviewCount} đánh giá` : ''}
      </span>
    </div>
  );
}
