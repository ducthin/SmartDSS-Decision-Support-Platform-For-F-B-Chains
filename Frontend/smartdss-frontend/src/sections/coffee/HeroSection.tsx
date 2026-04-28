import { useEffect, useState } from 'react';
import { ArrowRight, MapPin, Sparkles, Star, TrendingUp, Zap } from 'lucide-react';
import { heroImage, heroStats, trustStripItems } from '@/assets/coffee/content';
import { useStoreLocation } from '@/hooks/useHomepageData';
import Container from '@/components/coffee/Container';

export default function HeroSection() {
  const stripDoubled = [...trustStripItems, ...trustStripItems];
  const [visible, setVisible] = useState(false);
  const { location } = useStoreLocation();
  const storeAddress = location?.address?.trim() || '42 Đường Grind, Quận 1, TP.HCM';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="home"
      className="scroll-mt-24 relative overflow-hidden sm:scroll-mt-28"
    >
      {/* Trust strip */}
      <div
        className="w-full overflow-hidden border-y border-[rgba(243,228,208,0.12)] bg-[var(--coffee-surface-base)] py-2.5"
        aria-hidden
      >
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap pr-10">
          {stripDoubled.map((label, idx) => (
            <span
              key={`${label}-${idx}`}
              className="inline-flex items-center gap-2 text-[13px] font-medium tracking-wide text-[var(--coffee-text-tertiary)]"
            >
              <span className="text-[var(--coffee-accent)]" aria-hidden>✦</span>
              {label}
              <span className="text-[rgba(243,228,208,0.35)]">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero main */}
      <div className="relative min-h-[90vh] flex items-center">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Không gian quán Bean & Brew"
            className="h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(13,7,5,0.82)] via-[rgba(13,7,5,0.6)] to-[rgba(13,7,5,0.25)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,7,5,0.65)] via-transparent to-transparent" />
        </div>

        {/* Decorative orbs */}
        <div className="pointer-events-none absolute top-20 right-1/4 h-48 w-48 rounded-full bg-[rgba(201,162,122,0.2)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 right-10 h-64 w-64 rounded-full bg-[rgba(107,80,64,0.25)] blur-3xl" />

        <Container className="relative z-10 py-20 sm:py-28">
          <div className="max-w-2xl">
            {/* Opening badge */}
            <div
              className={`inline-flex items-center gap-2 rounded-full border border-[rgba(201,162,122,0.4)] bg-[rgba(201,162,122,0.15)] px-3 py-1.5 backdrop-blur-sm transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '0ms' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--coffee-accent)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--coffee-accent)]" />
              </span>
              <span className="text-[13px] font-medium text-[var(--coffee-accent)]">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Đang phục vụ · T2–T6 8h–22h · T7–CN 9h–21h
              </span>
            </div>

            {/* Headline */}
            <h1
              className={`mt-5 text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-[3.5rem] transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: '100ms' }}
            >
              Nơi{' '}
              <em className="not-italic text-[var(--coffee-accent)]">hương vị</em>{' '}
              gặp <br className="hidden sm:block" />
              khoảnh khắc bình yên
            </h1>

            <p
              className={`mt-4 max-w-lg text-base leading-relaxed text-[rgba(243,228,208,0.88)] sm:text-lg transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: '200ms' }}
            >
              Đồ uống craft pha tay, bánh handmade và món brunch tươi ngon — chuẩn bị
              có chủ đích, phục vụ trong không gian ấm và gọn giữa lòng thành phố
            </p>

            {/* CTA Buttons */}
            <div
              className={`mt-7 flex flex-wrap gap-3 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: '300ms' }}
            >
              <a
                href="#featured"
                className="coffee-interactive inline-flex items-center gap-2 rounded-[var(--coffee-radius-sm)] bg-[var(--coffee-accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[rgba(201,162,122,0.4)] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coffee-accent)]"
              >
                Xem món nổi bật
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#contact"
                className="coffee-interactive inline-flex items-center gap-2 rounded-[var(--coffee-radius-sm)] border border-[rgba(243,228,208,0.4)] bg-[rgba(243,228,208,0.1)] px-6 py-3 text-sm font-semibold text-[rgba(243,228,208,0.95)] backdrop-blur-sm hover:bg-[rgba(243,228,208,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(243,228,208,0.5)]"
              >
                Đặt bàn ngay
              </a>
            </div>

            {/* Location pill */}
            <div
              className={`mt-5 inline-flex items-center gap-1.5 text-sm text-[rgba(243,228,208,0.7)] transition-all duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: '400ms' }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--coffee-accent)]" />
              {storeAddress}
            </div>
          </div>

          {/* Stats row */}
          <div
            className={`mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-2xl transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: '500ms' }}
          >
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[var(--coffee-radius-sm)] border border-[rgba(243,228,208,0.18)] bg-[rgba(13,7,5,0.55)] px-4 py-3 text-center backdrop-blur-sm"
              >
                <p className="text-xl font-bold text-[var(--coffee-accent)] sm:text-2xl">{stat.value}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-[rgba(243,228,208,0.75)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* Quick features strip */}
      <div className="bg-white border-b border-[rgba(107,80,64,0.1)]">
        <Container className="py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            {[
              { icon: <Zap className="h-4 w-4 text-[var(--coffee-accent)]" />, text: 'Đặt qua QR — nhận tại bàn' },
              { icon: <Star className="h-4 w-4 text-[var(--coffee-accent)]" />, text: '98% khách hàng hài lòng' },
              { icon: <TrendingUp className="h-4 w-4 text-[var(--coffee-accent)]" />, text: 'Thực đơn cập nhật theo mùa' },
              { icon: <MapPin className="h-4 w-4 text-[var(--coffee-accent)]" />, text: `${storeAddress} · Mở mỗi ngày` },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-[rgba(26,14,7,0.78)]">
                {f.icon}
                <span className="font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}
