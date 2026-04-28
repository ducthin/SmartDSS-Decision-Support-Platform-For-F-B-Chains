import { ArrowRight, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMenuData } from '@/hooks/useHomepageData';
import Container from '@/components/coffee/Container';
import SectionTitle from '@/components/coffee/SectionTitle';
import type { MenuItemDTO } from '@/services/homepageApi';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80';

// ─── Compact highlight card ──────────────────────────────────────────────────

function HighlightCard({
  item,
  type,
}: {
  item: MenuItemDTO;
  type: 'new' | 'bestseller';
}) {
  const isBest = type === 'bestseller';

  return (
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(107,80,64,0.22)] hover:shadow-[0_12px_32px_-6px_rgba(26,14,7,0.13)]">
      {/* Accent stripe */}
      <div
        className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${
          isBest ? 'bg-[var(--coffee-primary)]' : 'bg-[var(--coffee-accent)]'
        }`}
      />

      {/* Thumbnail */}
      <div className="relative ml-1 h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <img
          src={item.imageUrl || FALLBACK_IMG}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
          }}
        />
        {/* Badge icon */}
        <div
          className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] shadow-sm ${
            isBest ? 'bg-[var(--coffee-primary)] text-white' : 'bg-[var(--coffee-accent)] text-white'
          }`}
        >
          {isBest ? '★' : '✦'}
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-[var(--coffee-dark)] transition-colors group-hover:text-[var(--coffee-primary)]">
            {item.name}
          </p>
        </div>
        {item.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-[rgba(26,14,7,0.55)]">
            {item.description}
          </p>
        )}
        <p className="mt-1 text-sm font-bold text-[var(--coffee-primary)]">
          {formatPrice(item.price)}
        </p>
      </div>

      {/* Badge label */}
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
          isBest
            ? 'bg-[rgba(107,80,64,0.1)] text-[var(--coffee-primary)]'
            : 'bg-[rgba(201,162,122,0.18)] text-[var(--coffee-primary)]'
        }`}
      >
        {isBest ? 'Best' : 'Mới'}
      </span>
    </div>
  );
}

// ─── Static fallback items (from content.ts) ─────────────────────────────────

const STATIC_BEST = [
  { id: 's1', name: 'Cà phê sữa đá signature', description: 'Blend đặc biệt của quán', price: '55.000 ₫' },
  { id: 's2', name: 'Croissant bơ pháp', description: 'Bánh xốp, lớp bơ tan ngay', price: '65.000 ₫' },
  { id: 's3', name: 'Matcha latte', description: 'Matcha ceremony grade + sữa tươi', price: '72.000 ₫' },
];
const STATIC_NEW = [
  { id: 'n1', name: 'Trà sả gừng mật ong', description: 'Không caffein, ấm dịu', price: '48.000 ₫' },
  { id: 'n2', name: 'Bánh mì bơ tỏi parmesan', description: 'Giòn ngoài mềm trong', price: '42.000 ₫' },
  { id: 'n3', name: 'Cold brew nho khô', description: 'Ngâm lạnh 18 giờ', price: '68.000 ₫' },
];

// ─── Main section ────────────────────────────────────────────────────────────

export default function MenuSection() {
  const { menuItems, loading } = useMenuData();

  const bestSellers = menuItems.filter((i) => i.badgeBestSeller).slice(0, 4);
  const newItems = menuItems.filter((i) => i.badgeNew && !i.badgeBestSeller).slice(0, 4);

  const hasDynamic = !loading && (bestSellers.length > 0 || newItems.length > 0);
  const showStatic = !loading && !hasDynamic;

  return (
    <section id="menu" className="scroll-mt-24 bg-[#fffdf9] py-16 sm:scroll-mt-28 sm:py-20">
      <Container>
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <SectionTitle
            align="left"
            eyebrow="Điểm nổi bật hôm nay"
            title="Món hot & vừa ra lò"
            subtitle="Những lựa chọn được yêu thích nhất và món mới vừa cập nhật."
          />
          <Link
            to="/menu"
            className="coffee-interactive mb-1 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[rgba(107,80,64,0.22)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--coffee-primary)] shadow-sm hover:bg-[var(--coffee-primary)] hover:text-white"
          >
            Xem toàn bộ thực đơn <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-10 flex justify-center py-8">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--coffee-primary)]" />
          </div>
        )}

        {/* Dynamic — real API data */}
        {hasDynamic && (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* Best sellers */}
            {bestSellers.length > 0 && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[var(--coffee-primary)]" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--coffee-primary)]">
                    Best Sellers
                  </h3>
                </div>
                <div className="space-y-3">
                  {bestSellers.map((item) => (
                    <HighlightCard key={item.id} item={item} type="bestseller" />
                  ))}
                </div>
              </div>
            )}

            {/* New items */}
            {newItems.length > 0 && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--coffee-accent)]" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--coffee-accent)]">
                    Mới ra lò
                  </h3>
                </div>
                <div className="space-y-3">
                  {newItems.map((item) => (
                    <HighlightCard key={item.id} item={item} type="new" />
                  ))}
                </div>
              </div>
            )}

            {/* If only one group exists, span full width */}
            {bestSellers.length === 0 && newItems.length > 0 && (
              <div className="lg:col-span-2 lg:mx-auto lg:max-w-xl">
                {/* already rendered above */}
              </div>
            )}
          </div>
        )}

        {/* Static fallback */}
        {showStatic && (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* Best sellers static */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--coffee-primary)]" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--coffee-primary)]">
                  Best Sellers
                </h3>
              </div>
              <div className="space-y-3">
                {STATIC_BEST.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-[var(--coffee-primary)]" />
                    <div className="ml-1 flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[rgba(201,162,122,0.12)] text-3xl">
                      ☕
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--coffee-dark)]">{item.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[rgba(26,14,7,0.55)]">{item.description}</p>
                      <p className="mt-1 text-sm font-bold text-[var(--coffee-primary)]">{item.price}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[rgba(107,80,64,0.1)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--coffee-primary)]">
                      Best
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* New items static */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--coffee-accent)]" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--coffee-accent)]">
                  Mới ra lò
                </h3>
              </div>
              <div className="space-y-3">
                {STATIC_NEW.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-[var(--coffee-accent)]" />
                    <div className="ml-1 flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[rgba(201,162,122,0.12)] text-3xl">
                      🍵
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--coffee-dark)]">{item.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[rgba(26,14,7,0.55)]">{item.description}</p>
                      <p className="mt-1 text-sm font-bold text-[var(--coffee-primary)]">{item.price}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[rgba(201,162,122,0.18)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--coffee-primary)]">
                      Mới
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA banner */}
        <div className="mt-10 flex items-center justify-between gap-4 rounded-2xl border border-[rgba(107,80,64,0.12)] bg-gradient-to-r from-[rgba(107,80,64,0.06)] to-[rgba(201,162,122,0.08)] px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-[var(--coffee-dark)]">
              Muốn xem toàn bộ {menuItems.length > 0 ? `${menuItems.length} món` : 'thực đơn'}?
            </p>
            <p className="mt-0.5 text-xs text-[rgba(26,14,7,0.55)]">
              Cà phê · Trà · Đồ uống · Bánh · Món nhẹ
            </p>
          </div>
          <Link
            to="/menu"
            className="coffee-interactive inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--coffee-primary)] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[rgba(107,80,64,0.25)] hover:bg-[var(--coffee-dark)]"
          >
            Xem thực đơn <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
