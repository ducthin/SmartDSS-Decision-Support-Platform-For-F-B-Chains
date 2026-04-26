import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type BadgeVariant = 'accent' | 'dark' | 'subtle';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  accent: 'bg-[rgba(228,172,92,0.2)] text-[var(--coffee-primary)]',
  dark: 'bg-[rgba(62,42,31,0.88)] text-[var(--coffee-secondary)]',
  subtle: 'bg-[rgba(111,78,55,0.1)] text-[rgba(62,42,31,0.88)]',
};

export default function Badge({ children, variant = 'accent', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
