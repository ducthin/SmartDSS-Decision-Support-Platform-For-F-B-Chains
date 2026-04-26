import type { Testimonial } from '@/assets/coffee/content';
import Card from '@/components/coffee/Card';
import ImageWrapper from '@/components/coffee/ImageWrapper';
import RatingStars from '@/components/coffee/RatingStars';

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <Card variant="testimonial" className="flex h-full flex-col gap-4 p-6">
      <RatingStars rating={testimonial.rating} />
      <p className="text-sm leading-relaxed text-[rgba(62,42,31,0.86)]">"{testimonial.quote}"</p>
      <div className="mt-auto flex items-center gap-3 pt-2">
        <ImageWrapper src={testimonial.avatar} alt={testimonial.name} ratio="square" className="h-12 w-12 rounded-full" />
        <div>
          <p className="text-sm font-semibold text-[var(--coffee-dark)]">{testimonial.name}</p>
          <p className="text-xs text-[rgba(62,42,31,0.7)]">{testimonial.role}</p>
        </div>
      </div>
    </Card>
  );
}
