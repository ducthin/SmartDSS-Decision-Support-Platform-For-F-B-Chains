import type { FooterLink } from '@/assets/coffee/content';

interface FooterColumnProps {
  title: string;
  links: FooterLink[];
}

export default function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[rgba(245,230,211,0.72)]">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="coffee-interactive inline-flex text-sm text-[var(--coffee-secondary)]/90 hover:text-[var(--coffee-accent)]"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
