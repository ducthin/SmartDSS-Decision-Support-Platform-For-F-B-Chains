import { useState } from 'react';
import { Clock, Facebook, Instagram, Mail, MapPin, Phone, Twitter } from 'lucide-react';
import { brandName, footerColumns } from '@/assets/coffee/content';
import { useStoreLocation } from '@/hooks/useHomepageData';
import Button from '@/components/coffee/Button';
import Container from '@/components/coffee/Container';
import FooterColumn from '@/components/coffee/FooterColumn';
import FormField from '@/components/coffee/FormField';

export default function FooterSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { location } = useStoreLocation();

  const storeAddress = location?.address ?? '42 Đường Grind, Quận 1, TP.HCM';

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail('');
  };

  const socialLabels = ['Instagram', 'Facebook', 'Twitter'];

  return (
    <footer
      id="contact"
      className="scroll-mt-24 mt-0 bg-[var(--coffee-surface-base)] text-[var(--coffee-text-tertiary)] sm:scroll-mt-28"
    >
      {/* Contact info bar */}
      <div className="border-b border-[rgba(243,228,208,0.1)] bg-[rgba(26,14,7,0.5)]">
        <Container className="py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              { icon: <MapPin className="h-4 w-4 text-[var(--coffee-accent)]" />, text: storeAddress },
              { icon: <Phone className="h-4 w-4 text-[var(--coffee-accent)]" />, text: '(+84) 28 3821 0138' },
              { icon: <Mail className="h-4 w-4 text-[var(--coffee-accent)]" />, text: 'hello@beanandbrew.vn' },
              { icon: <Clock className="h-4 w-4 text-[var(--coffee-accent)]" />, text: 'T2–T6 8h–22h · T7–CN 9h–21h' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[rgba(243,228,208,0.8)]">
                {item.icon}
                {item.text}
              </div>
            ))}
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-16">
        {/* Newsletter */}
        <div className="coffee-soft-shadow rounded-[var(--coffee-radius-lg)] border border-[rgba(243,228,208,0.12)] bg-gradient-to-r from-[rgba(107,80,64,0.5)] to-[rgba(26,14,7,0.7)] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgba(243,228,208,0.72)]">
                Bản tin
              </p>
              <h3 className="text-2xl font-bold text-[var(--coffee-text-secondary)] sm:text-3xl">
                Nhận thực đơn mới, công thức và ưu đãi mỗi tuần
              </h3>
              <p className="text-sm text-[rgba(243,228,208,0.82)]">
                Mẹo pha chế, món theo mùa và ưu đãi độc quyền gửi tặng thành viên.
              </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <FormField
                id="newsletter-email"
                label="Địa chỉ email"
                type="email"
                value={email}
                required
                placeholder="ban@vidu.com"
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (submitted) setSubmitted(false);
                }}
                fieldClassName="rounded-[var(--coffee-radius-sm)] border-[rgba(243,228,208,0.22)] bg-white text-[var(--coffee-dark)]"
              />
              <Button type="submit" variant="secondary" fullWidth className="rounded-[var(--coffee-radius-sm)]">
                Đăng ký nhận tin
              </Button>
              {submitted && (
                <p className="text-xs text-[var(--coffee-accent)]">
                  ✓ Cảm ơn bạn — đã thêm vào danh sách nhận tin!
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Main footer grid */}
        <div className="mt-12 grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          {/* Brand col */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--coffee-radius-sm)] bg-[var(--coffee-primary)] text-white text-lg font-bold">
                B
              </span>
              <h3 className="text-2xl font-semibold text-[var(--coffee-text-secondary)]">{brandName}</h3>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[rgba(243,228,208,0.82)]">
              Đồ uống craft, bánh lò và món nhẹ mỗi ngày — nguyên liệu rõ nguồn,
              phục vụ trọn vẹn cho cả khách ghé nhanh lẫn ngồi lâu.
            </p>

            {/* Address block */}
            <div className="space-y-2 text-sm text-[rgba(243,228,208,0.82)]">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--coffee-accent)]" />
                <span>42 Đường Grind, Quận 1, TP. Hồ Chí Minh</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-[var(--coffee-accent)]" />
                <span>T2–T6 8h–22h · T7–CN 9h–21h</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-[var(--coffee-accent)]" />
                <span>(+84) 28 3821 0138</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-[var(--coffee-accent)]" />
                <span>hello@beanandbrew.vn</span>
              </div>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-2 pt-1">
              {[Instagram, Facebook, Twitter].map((Icon, idx) => (
                <a
                  key={idx}
                  href="#"
                  aria-label={socialLabels[idx]}
                  className="coffee-interactive inline-flex h-9 w-9 items-center justify-center rounded-[var(--coffee-radius-sm)] border border-[rgba(243,228,208,0.22)] text-[rgba(243,228,208,0.92)] hover:bg-[rgba(201,162,122,0.18)] hover:text-[var(--coffee-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coffee-accent)]"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Footer columns */}
          {footerColumns.map((column) => (
            <FooterColumn key={column.title} title={column.title} links={column.links} />
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(243,228,208,0.14)] pt-4 text-xs text-[rgba(243,228,208,0.55)]">
          <p>© {new Date().getFullYear()} {brandName} · Đồ uống & ẩm thực nhẹ · Đã đăng ký bản quyền.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[var(--coffee-accent)] transition-colors">Chính sách</a>
            <a href="#" className="hover:text-[var(--coffee-accent)] transition-colors">Bảo mật</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
