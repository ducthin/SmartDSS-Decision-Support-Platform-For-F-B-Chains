import { cn } from '@/utils/cn';

interface NavbarItemProps {
  label: string;
  href: string;
  className?: string;
  onClick?: () => void;
}

export default function NavbarItem({ label, href, className, onClick }: NavbarItemProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        'coffee-interactive rounded-[var(--coffee-radius-sm)] px-3 py-2 text-sm font-medium text-[rgba(26,14,7,0.82)] hover:bg-[rgba(107,80,64,0.08)] hover:text-[var(--coffee-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coffee-accent)] focus-visible:ring-offset-2',
        className,
      )}
    >
      {label}
    </a>
  );
}
