import type { FooterLink } from '@/assets/coffee/content';

interface FooterColumnProps {
  title: string;
  links: FooterLink[];
}

export default function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[rgba(243,228,208,0.72)]">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="coffee-interactive inline-flex text-sm text-[rgba(243,228,208,0.92)] hover:text-[var(--coffee-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coffee-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--coffee-surface-base)]"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
