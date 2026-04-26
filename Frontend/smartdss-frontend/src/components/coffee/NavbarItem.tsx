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
        'coffee-interactive rounded-xl px-3 py-2 text-sm font-medium text-[rgba(62,42,31,0.8)] hover:bg-[rgba(111,78,55,0.08)] hover:text-[var(--coffee-primary)]',
        className,
      )}
    >
      {label}
    </a>
  );
}
