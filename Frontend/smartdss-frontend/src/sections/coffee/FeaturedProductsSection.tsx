import { ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { featuredProducts } from '@/assets/coffee/content';
import { useBestProducts } from '@/hooks/useHomepageData';
import Container from '@/components/coffee/Container';
import SectionTitle from '@/components/coffee/SectionTitle';
import type { RankedProduct } from '@/hooks/useHomepageData';

// ─── Helpers ────────────────────────────────────────────────────────────────

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80';

// Rank badge styling
const RANK_CONFIG: Record<number, { badge: string; label: string; glow: string; border: string; scale: string }> = {
  1: {
    badge: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-[0_0_16px_rgba(251,191,36,0.6)]',
    label: '1',
    glow: 'shadow-[0_20px_60px_-10px_rgba(251,191,36,0.35)]',
    border: 'border-amber-300',
    scale: 'scale-105 z-10',
  },
  2: {
    badge: 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 shadow-[0_0_12px_rgba(156,163,175,0.5)]',
    label: '2',
    glow: 'shadow-[0_16px_48px_-8px_rgba(156,163,175,0.3)]',
    border: 'border-gray-300',
    scale: '',
  },
  3: {
    badge: 'bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-[0_0_12px_rgba(251,146,60,0.5)]',
    label: '3',
    glow: 'shadow-[0_16px_48px_-8px_rgba(251,146,60,0.25)]',
    border: 'border-orange-300',
    scale: '',
  },
  4: {
    badge: 'bg-[rgba(107,80,64,0.15)] text-[var(--coffee-primary)]',
    label: '4',
    glow: 'shadow-sm',
    border: 'border-[rgba(107,80,64,0.15)]',
    scale: '',
  },
  5: {
    badge: 'bg-[rgba(107,80,64,0.1)] text-[var(--coffee-primary)]',
    label: '5',
    glow: 'shadow-sm',
    border: 'border-[rgba(107,80,64,0.12)]',
    scale: '',
  },
};

// ─── Card components ──────────────────────────────────────────────────────────

/** Large card for top 1-3 (podium) */
function PodiumCard({ rank, name, description, price, image }: {
  rank: number;
  name: string;
  description?: string;
  price: string;
  image?: string;
}) {
  const cfg = RANK_CONFIG[rank] ?? RANK_CONFIG[5];
  const isFirst = rank === 1;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-white transition-all duration-300 hover:-translate-y-1.5 ${cfg.border} ${cfg.glow} ${cfg.scale}`}
    >
      {/* Rank badge */}
      <div className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${cfg.badge}`}>
        {rank <= 3 ? cfg.label : `#${rank}`}
      </div>

      {/* Rank number watermark */}
      <div className="absolute -right-2 -top-2 z-10 select-none font-black text-[6rem] leading-none text-[rgba(107,80,64,0.04)]">
        {rank}
      </div>

      {/* Image */}
      <div className={`relative overflow-hidden ${isFirst ? 'aspect-[4/3]' : 'aspect-[4/3]'}`}>
        <img
          src={image || FALLBACK_IMG}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[rgba(13,7,5,0.55)] via-transparent to-transparent p-4">
          <div>
            <p className={`font-bold leading-tight text-white drop-shadow ${isFirst ? 'text-xl' : 'text-base'}`}>
              {name}
            </p>
            {isFirst && description && (
              <p className="mt-1 line-clamp-2 text-xs text-[rgba(255,255,255,0.8)]">{description}</p>
            )}
          </div>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(13,7,5,0.4)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--coffee-dark)] shadow-lg"
          >
            Xem thực đơn <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        {!isFirst && (
          <p className="line-clamp-1 text-xs text-[rgba(26,14,7,0.55)] min-w-0 flex-1">{description}</p>
        )}
        <span className={`shrink-0 font-bold text-[var(--coffee-primary)] ${isFirst ? 'ml-auto text-lg' : 'text-sm'}`}>
          {price}
        </span>
      </div>
    </div>
  );
}

/** Compact horizontal card for ranks 4-5 */
function RankRowCard({ rank, name, description, price, image }: {
  rank: number;
  name: string;
  description?: string;
  price: string;
  image?: string;
}) {
  const cfg = RANK_CONFIG[rank] ?? RANK_CONFIG[5];

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(107,80,64,0.22)] hover:shadow-md">
      {/* Rank number */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${cfg.badge}`}>
        #{rank}
      </div>

      {/* Thumbnail */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
        <img
          src={image || FALLBACK_IMG}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--coffee-dark)] transition-colors group-hover:text-[var(--coffee-primary)]">
          {name}
        </p>
        {description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-[rgba(26,14,7,0.55)]">{description}</p>
        )}
      </div>

      {/* Price */}
      <span className="shrink-0 text-sm font-bold text-[var(--coffee-primary)]">{price}</span>
    </div>
  );
}

// ─── Main Section ────────────────────────────────────────────────────────────

type RankItem = { name: string; description?: string; price: string; image?: string; sold?: number };

function buildRankItems(
  dynamic: RankedProduct[],
  fallback: typeof featuredProducts,
): RankItem[] {
  if (dynamic.length > 0) {
    return dynamic.map((p) => ({
      name: p.name,
      description: p.description,
      price: p.price != null
        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)
        : '—',
      image: p.imageUrl,
      sold: p.totalQuantitySold,
    }));
  }
  return fallback.slice(0, 5).map((p) => ({
    name: p.name,
    description: p.description,
    price: p.price,
    image: p.image,
  }));
}

export default function FeaturedProductsSection() {
  const { rankedProducts, loading } = useBestProducts();

  const rankItems = buildRankItems(rankedProducts, featuredProducts);

  const [top1, top2, top3, ...rest] = rankItems;

  return (
    <section id="featured" className="scroll-mt-24 bg-[#fffdf9] py-16 sm:scroll-mt-28 sm:py-24">
      <Container>
        <SectionTitle
          align="center"
          eyebrow="Đồ uống · Bánh · Món nhẹ"
          title="Món được khách chọn nhiều nhất"
          subtitle="Xếp hạng theo lượt gọi — từ vị trí quán quân đến những lựa chọn phổ biến."
        />

        {/* Loading */}
        {loading && (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--coffee-primary)]" />
          </div>
        )}

        {!loading && rankItems.length > 0 && (
          <>
            {/* ── Podium: Top 1 center, Top 2 left, Top 3 right ── */}
            <div className="mt-12 grid items-end gap-4 sm:grid-cols-3">
              {/* Top 2 — left, slightly lower */}
              {top2 && (
                <div className="sm:mt-8">
                  <PodiumCard rank={2} {...top2} />
                </div>
              )}

              {/* Top 1 — center, tallest */}
              {top1 && (
                <div className="order-first sm:order-none">
                  <PodiumCard rank={1} {...top1} />
                </div>
              )}

              {/* Top 3 — right, slightly lower */}
              {top3 && (
                <div className="sm:mt-10">
                  <PodiumCard rank={3} {...top3} />
                </div>
              )}
            </div>

            {/* ── Ranks 4-5: horizontal rows ── */}
            {rest.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {rest.map((item, i) => (
                  <RankRowCard key={item.name} rank={i + 4} {...item} />
                ))}
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            to="/menu"
            className="coffee-interactive inline-flex items-center gap-2 rounded-2xl border border-[rgba(107,80,64,0.22)] bg-white px-7 py-3 text-sm font-semibold text-[var(--coffee-primary)] shadow-sm hover:bg-[var(--coffee-primary)] hover:text-white hover:shadow-md"
          >
            Xem toàn bộ thực đơn <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
