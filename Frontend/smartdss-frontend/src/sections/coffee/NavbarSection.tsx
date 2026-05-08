import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logoImg from '@/assets/img/logo.png';
import { navItems } from '@/assets/coffee/content';
import Button from '@/components/coffee/Button';
import Container from '@/components/coffee/Container';

/** Renders either a react-router <Link> or a plain <a> depending on href type */
function NavLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  className: string;
  onClick?: () => void;
}) {
  const isRoute = href.startsWith('/');
  if (isRoute) {
    return (
      <Link to={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

export default function NavbarSection() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isOnHomePage = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // On non-home pages, anchors (#home, #about...) should return to home first
  function resolveHref(href: string): string {
    if (!isOnHomePage && href.startsWith('#')) {
      return `/${href}`;
    }
    return href;
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-[rgba(107,80,64,0.16)] bg-[rgba(253,247,240,0.98)] shadow-[0_2px_20px_-4px_rgba(26,14,7,0.14)] backdrop-blur-md'
          : 'border-b border-transparent bg-[rgba(253,247,240,0.95)] backdrop-blur-sm'
      }`}
    >
      <Container className="py-2.5">
        <div className="flex items-center justify-between gap-3">

          {/* ── Brand logo ── */}
          <Link
            to="/"
            className="coffee-interactive inline-flex shrink-0 items-center gap-2 rounded-xl px-1.5 py-1 text-[var(--coffee-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coffee-accent)]"
          >
            <img src={logoImg} alt="SmartDSS Logo" className="h-13 w-auto max-w-[140px] object-contain" />
          </Link>

          {/* ── Desktop nav (≥1280px) ── */}
          <nav
            className="hidden items-center gap-0.5 xl:flex"
            aria-label="Điều hướng chính"
          >
            {navItems.map((item) => {
              const resolved = resolveHref(item.href);
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.href}
                  href={resolved}
                  className={`coffee-interactive whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coffee-accent)] transition-colors ${
                    isActive
                      ? 'bg-[rgba(107,80,64,0.1)] text-[var(--coffee-primary)]'
                      : 'text-[rgba(26,14,7,0.72)] hover:bg-[rgba(107,80,64,0.07)] hover:text-[var(--coffee-primary)]'
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* ── Desktop actions ── */}
          <div className="hidden items-center gap-2 xl:flex">
            <Button href="#booking" size="sm">
              Đặt bàn ngay
            </Button>
          </div>

          {/* ── Tablet: only show CTA + hamburger (lg..xl) ── */}
          <div className="hidden items-center gap-2 lg:flex xl:hidden">
            <Button href="#booking" size="sm">
              Đặt bàn
            </Button>
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="coffee-mobile-nav"
              aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
              className="coffee-interactive inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(107,80,64,0.18)] text-[var(--coffee-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coffee-accent)]"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          {/* ── Mobile hamburger only (<lg) ── */}
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="coffee-mobile-nav"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            className="coffee-interactive inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(107,80,64,0.18)] text-[var(--coffee-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coffee-accent)] lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* ── Mobile / tablet dropdown menu ── */}
        {mobileOpen && (
          <div
            id="coffee-mobile-nav"
            className="coffee-soft-shadow mt-2 rounded-xl border border-[rgba(107,80,64,0.12)] bg-white p-3 xl:hidden"
          >
            <nav className="space-y-0.5" aria-label="Menu di động">
              {navItems.map((item) => {
                const resolved = resolveHref(item.href);
                return (
                  <NavLink
                    key={item.href}
                    href={resolved}
                    className="coffee-interactive block rounded-lg px-3 py-2 text-sm font-medium text-[rgba(26,14,7,0.78)] hover:bg-[rgba(107,80,64,0.06)] hover:text-[var(--coffee-primary)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="mt-2 space-y-2 border-t border-[rgba(107,80,64,0.1)] pt-2.5">
              <Button href="#booking" size="sm" fullWidth onClick={() => setMobileOpen(false)}>
                Đặt bàn ngay
              </Button>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
