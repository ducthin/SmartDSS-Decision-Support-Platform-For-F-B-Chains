import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type CardVariant = 'default' | 'product' | 'testimonial';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'div';
  variant?: CardVariant;
  hover?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white',
  product: 'border border-[rgba(107,80,64,0.12)] bg-white',
  testimonial: 'border border-[rgba(107,80,64,0.14)] bg-[#fffaf3]',
};

export default function Card({
  as: Tag = 'article',
  variant = 'default',
  hover = true,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        'coffee-soft-shadow coffee-interactive rounded-xl p-5',
        variantStyles[variant],
        hover && 'hover:-translate-y-1 hover:shadow-[0_24px_48px_-30px_rgba(26,14,7,0.45)]',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
