import { cn } from '@/utils/cn';

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
}: SectionTitleProps) {
  const centered = align === 'center';

  return (
    <div className={cn('space-y-3', centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl', className)}>
      {eyebrow && (
        <p className="inline-flex rounded-full bg-[rgba(228,172,92,0.2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--coffee-primary)]">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold leading-tight text-[var(--coffee-dark)] sm:text-4xl">{title}</h2>
      {subtitle && <p className="text-sm leading-relaxed text-[rgba(62,42,31,0.78)] sm:text-base">{subtitle}</p>}
    </div>
  );
}
