import { cn } from '@/utils/cn';

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
  dark?: boolean;
}

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
  dark = false,
}: SectionTitleProps) {
  const centered = align === 'center';

  return (
    <div className={cn('space-y-3', centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl', className)}>
      {eyebrow && (
        <p
          className={cn(
            'inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
            dark
              ? 'bg-[rgba(201,162,122,0.2)] text-[var(--coffee-accent)]'
              : 'bg-[rgba(201,162,122,0.22)] text-[var(--coffee-primary)]',
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          'text-3xl font-bold leading-tight sm:text-4xl',
          dark ? 'text-[var(--coffee-text-secondary)]' : 'text-[var(--coffee-dark)]',
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            'text-sm leading-relaxed sm:text-base',
            dark ? 'text-[rgba(243,228,208,0.78)]' : 'text-[rgba(26,14,7,0.78)]',
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
