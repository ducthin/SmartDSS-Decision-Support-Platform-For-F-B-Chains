import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type BadgeVariant = 'accent' | 'dark' | 'subtle';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  accent: 'bg-[rgba(201,162,122,0.22)] text-[var(--coffee-primary)]',
  dark: 'bg-[rgba(26,14,7,0.9)] text-[var(--coffee-text-tertiary)]',
  subtle: 'bg-[rgba(107,80,64,0.1)] text-[rgba(26,14,7,0.88)]',
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
