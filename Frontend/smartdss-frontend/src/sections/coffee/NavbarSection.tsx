import { useState } from 'react';
import { Coffee, Menu, X } from 'lucide-react';
import { navItems } from '@/assets/coffee/content';
import Button from '@/components/coffee/Button';
import Container from '@/components/coffee/Container';
import NavbarItem from '@/components/coffee/NavbarItem';

export default function NavbarSection() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(111,78,55,0.1)] bg-[rgba(245,230,211,0.9)] backdrop-blur-md">
      <Container className="py-3">
        <div className="flex items-center justify-between gap-4">
          <a href="#home" className="coffee-interactive inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[var(--coffee-dark)]">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--coffee-primary)] text-[var(--coffee-secondary)]">
              <Coffee className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold">Velvet Roast</span>
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavbarItem key={item.href} label={item.label} href={item.href} />
            ))}
          </nav>

          <div className="hidden md:block">
            <Button href="#contact" size="sm">
              Reserve Table
            </Button>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            className="coffee-interactive inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(111,78,55,0.18)] text-[var(--coffee-primary)] md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="coffee-soft-shadow mt-3 space-y-1 rounded-xl border border-[rgba(111,78,55,0.12)] bg-white p-3 md:hidden">
            {navItems.map((item) => (
              <NavbarItem
                key={item.href}
                label={item.label}
                href={item.href}
                className="block"
                onClick={() => setMobileOpen(false)}
              />
            ))}
            <Button href="#contact" size="sm" fullWidth className="mt-2" onClick={() => setMobileOpen(false)}>
              Reserve Table
            </Button>
          </div>
        )}
      </Container>
    </header>
  );
}
