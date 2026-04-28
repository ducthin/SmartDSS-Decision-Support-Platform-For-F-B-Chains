import { Calendar } from 'lucide-react';
import { promotions } from '@/assets/coffee/content';
import Container from '@/components/coffee/Container';
import SectionTitle from '@/components/coffee/SectionTitle';


export default function PromotionsSection() {
  return (
    <section
      id="promotions"
      className="scroll-mt-24 py-16 sm:scroll-mt-28 sm:py-24 bg-gradient-to-br from-[var(--coffee-surface-base)] via-[#1a0e07] to-[#0d0705]"
    >
      <Container>
        <SectionTitle
          align="center"
          eyebrow="Ưu đãi & Khuyến mãi"
          title="Những deal không thể bỏ lỡ"
          subtitle="Từ combo buổi sáng đến đặt bàn nhóm — luôn có điều bất ngờ chờ bạn mỗi lần ghé."
          dark
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {promotions.map((promo, index) => (
            <div
              key={promo.id}
              className="group relative overflow-hidden rounded-[var(--coffee-radius-lg)] border border-[rgba(243,228,208,0.12)] bg-[rgba(243,228,208,0.06)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(201,162,122,0.4)] hover:bg-[rgba(243,228,208,0.1)] cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background gradient */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at 30% 30%, ${promo.bgColor}, transparent 70%)` }}
              />

              {/* Badge */}
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[rgba(201,162,122,0.35)] bg-[rgba(201,162,122,0.15)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--coffee-accent)]">
                <span>{promo.icon}</span>
                {promo.badge}
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-[var(--coffee-text-secondary)]">
                {promo.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[rgba(243,228,208,0.78)]">
                {promo.description}
              </p>

              {promo.validUntil && (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-[rgba(243,228,208,0.5)]">
                  <Calendar className="h-3.5 w-3.5" />
                  Áp dụng đến {promo.validUntil}
                </p>
              )}

              {/* Decorative corner */}
              <div className="absolute -right-6 -top-6 text-6xl opacity-10 transition-opacity group-hover:opacity-20">
                {promo.icon}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-[var(--coffee-radius-lg)] border border-[rgba(243,228,208,0.15)] bg-[rgba(243,228,208,0.07)] p-6 text-center">
          <p className="text-sm text-[rgba(243,228,208,0.72)]">
            Đăng ký nhận bản tin bên dưới để không bỏ lỡ ưu đãi mới nhất mỗi tuần!
          </p>
          <a
            href="#contact"
            className="coffee-interactive mt-3 inline-flex items-center gap-2 rounded-[var(--coffee-radius-sm)] bg-[var(--coffee-accent)] px-6 py-2.5 text-sm font-semibold text-[var(--coffee-dark)] hover:brightness-110"
          >
            Đăng ký ngay
          </a>
        </div>
      </Container>
    </section>
  );
}
