import { useState } from 'react';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { footerColumns } from '@/assets/coffee/content';
import Button from '@/components/coffee/Button';
import Container from '@/components/coffee/Container';
import FooterColumn from '@/components/coffee/FooterColumn';
import FormField from '@/components/coffee/FormField';

export default function FooterSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    setSubmitted(true);
    setEmail('');
  };

  return (
    <footer id="contact" className="mt-10 bg-[var(--coffee-dark)] text-[var(--coffee-secondary)] sm:mt-16">
      <Container className="py-14 sm:py-16">
        <div className="coffee-soft-shadow rounded-xl border border-[rgba(245,230,211,0.12)] bg-[rgba(245,230,211,0.08)] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgba(245,230,211,0.72)]">Newsletter</p>
              <h3 className="text-3xl font-bold text-white">Get Monthly Coffee Notes and Seasonal Drops</h3>
              <p className="text-sm text-[rgba(245,230,211,0.8)]">
                Receive curated brew guides, tasting profiles, and member-only offers.
              </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <FormField
                id="newsletter-email"
                label="Email Address"
                type="email"
                value={email}
                required
                placeholder="you@example.com"
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (submitted) {
                    setSubmitted(false);
                  }
                }}
                fieldClassName="border-[rgba(245,230,211,0.18)] bg-white text-[var(--coffee-dark)]"
              />
              <Button type="submit" variant="secondary" fullWidth>
                Subscribe
              </Button>
              {submitted ? <p className="text-xs text-[var(--coffee-accent)]">Thanks. You are now on our coffee list.</p> : null}
            </form>
          </div>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-white">Velvet Roast</h3>
            <p className="max-w-sm text-sm leading-relaxed text-[rgba(245,230,211,0.82)]">
              28 Nguyen Hue Street, District 1, Ho Chi Minh City
              <br />
              Open daily: 07:00 - 22:30
            </p>
            <div className="flex items-center gap-2">
              {[Instagram, Facebook, Twitter].map((Icon, idx) => (
                <a
                  key={idx}
                  href="#"
                  aria-label="Social link"
                  className="coffee-interactive inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(245,230,211,0.2)] text-[rgba(245,230,211,0.92)] hover:bg-[rgba(228,172,92,0.16)] hover:text-[var(--coffee-accent)]"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {footerColumns.map((column) => (
            <FooterColumn key={column.title} title={column.title} links={column.links} />
          ))}
        </div>

        <div className="mt-10 border-t border-[rgba(245,230,211,0.14)] pt-4 text-xs text-[rgba(245,230,211,0.65)]">
          © {new Date().getFullYear()} Velvet Roast. Crafted with care.
        </div>
      </Container>
    </footer>
  );
}
