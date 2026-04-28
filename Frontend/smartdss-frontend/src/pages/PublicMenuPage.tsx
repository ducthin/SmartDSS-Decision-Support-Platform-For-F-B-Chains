import '@/styles/coffee-theme.css';
import { useMemo, useState } from 'react';
import { ArrowLeft, Coffee, Loader2, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { menuCategories } from '@/assets/coffee/content';
import { useMenuData } from '@/hooks/useHomepageData';
import NavbarSection from '@/sections/coffee/NavbarSection';
import FooterSection from '@/sections/coffee/FooterSection';
import type { MenuItemDTO } from '@/services/homepageApi';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
}

function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('cà phê') || n.includes('coffee')) return '☕';
  if (n.includes('trà') || n.includes('tea')) return '🍵';
  if (n.includes('sinh tố') || n.includes('smoothie')) return '🥤';
  if (n.includes('bánh') || n.includes('cake') || n.includes('pastry')) return '🥐';
  if (n.includes('ăn') || n.includes('brunch') || n.includes('food')) return '🍳';
  if (n.includes('nước') || n.includes('drink')) return '🧃';
  return '🍽️';
}

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80';

// ─── Single menu item card ───────────────────────────────────────────────────

function MenuCard({ item }: { item: MenuItemDTO }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-8px_rgba(26,14,7,0.15)]">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[rgba(253,247,240,0.8)]">
        <img
          src={item.imageUrl || FALLBACK_IMG}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
          }}
        />

        {/* Badges overlay */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {item.badgeBestSeller && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--coffee-primary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              ⭐ Best seller
            </span>
          )}
          {item.badgeNew && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--coffee-accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              🆕 Mới
            </span>
          )}
        </div>

        {/* Drink badge */}
        {item.drink && (
          <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
            Đồ uống
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-bold leading-snug text-[var(--coffee-dark)] transition-colors group-hover:text-[var(--coffee-primary)]">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[rgba(26,14,7,0.6)]">
            {item.description}
          </p>
        )}

        {/* Size options preview */}
        {item.drink && item.drinkSizes && item.drinkSizes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.drinkSizes.map((s) => (
              <span
                key={s.sizeCode}
                className="rounded-md border border-[rgba(107,80,64,0.15)] px-1.5 py-0.5 text-[10px] text-[rgba(26,14,7,0.6)]"
              >
                {s.label}
              </span>
            ))}
          </div>
        )}

        {/* Price row */}
        <div className="mt-auto flex items-center justify-between border-t border-[rgba(107,80,64,0.07)] pt-3">
          <span className="text-base font-bold text-[var(--coffee-primary)]">
            {formatPrice(item.price)}
          </span>
          <a
            href="/#booking"
            className="coffee-interactive rounded-lg border border-[rgba(107,80,64,0.22)] bg-[rgba(107,80,64,0.05)] px-3 py-1.5 text-xs font-semibold text-[var(--coffee-primary)] transition-all hover:bg-[var(--coffee-primary)] hover:text-white"
          >
            Đặt bàn
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Static fallback card (from content.ts) ──────────────────────────────────

function StaticCard({ item }: { item: { name: string; description: string; price: string; tag?: string } }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-8px_rgba(26,14,7,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--coffee-dark)] group-hover:text-[var(--coffee-primary)]">
              {item.name}
            </h3>
            {item.tag && (
              <span className="rounded-full bg-[rgba(201,162,122,0.2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--coffee-primary)]">
                {item.tag}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[rgba(26,14,7,0.6)]">
            {item.description}
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-[var(--coffee-primary)]">
          {item.price}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PublicMenuPage() {
  const { categories, menuItems, loading, error } = useMenuData();
  const [activeCategoryId, setActiveCategoryId] = useState<number | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const hasDynamic = !loading && !error && categories.length > 0;

  // Filter items by active category + search
  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (activeCategoryId !== 'ALL') {
      items = items.filter((i) => i.categoryId === activeCategoryId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description ?? '').toLowerCase().includes(q) ||
          i.categoryName.toLowerCase().includes(q),
      );
    }
    return items;
  }, [menuItems, activeCategoryId, search]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  return (
    <div className="coffee-theme min-h-screen bg-[#fffdf9] text-[var(--coffee-dark)]">
      <NavbarSection />

      {/* ── Hero strip ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[var(--coffee-dark)] via-[var(--coffee-primary)] to-[rgba(201,162,122,0.9)] px-4 py-14 text-center text-white sm:py-20">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
            <Coffee className="h-3.5 w-3.5" />
            Bean &amp; Brew
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Thực đơn của chúng tôi
          </h1>
          <p className="mt-3 text-base text-[rgba(243,228,208,0.85)]">
            Đồ uống pha tay, bánh tươi handmade và món nhẹ — từ quầy bar đến bếp.
          </p>

          {/* Back link */}
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[rgba(243,228,208,0.75)] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </Link>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Search bar ── */}
        {hasDynamic && (
          <div className="relative mx-auto mb-8 max-w-lg">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(107,80,64,0.5)]" />
            <input
              type="search"
              placeholder="Tìm kiếm món ăn, đồ uống..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[rgba(107,80,64,0.2)] bg-white py-3 pl-11 pr-10 text-sm text-[var(--coffee-dark)] shadow-sm outline-none placeholder:text-[rgba(26,14,7,0.4)] focus:border-[var(--coffee-primary)] focus:ring-2 focus:ring-[rgba(107,80,64,0.12)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[rgba(107,80,64,0.5)] hover:text-[var(--coffee-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-24">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--coffee-primary)]" />
            <p className="text-sm text-[rgba(26,14,7,0.55)]">Đang tải thực đơn từ hệ thống...</p>
          </div>
        )}

        {/* ── Dynamic content (from API) ── */}
        {hasDynamic && (
          <div className="flex gap-8">
            {/* Sidebar categories */}
            <aside className="hidden w-56 shrink-0 lg:block">
              <div className="sticky top-24 space-y-1 rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white p-3 shadow-sm">
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[rgba(26,14,7,0.4)]">
                  Danh mục
                </p>
                <button
                  type="button"
                  onClick={() => setActiveCategoryId('ALL')}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    activeCategoryId === 'ALL'
                      ? 'bg-[var(--coffee-primary)] text-white'
                      : 'text-[rgba(26,14,7,0.72)] hover:bg-[rgba(107,80,64,0.07)] hover:text-[var(--coffee-primary)]'
                  }`}
                >
                  🍽️ Tất cả ({menuItems.length})
                </button>
                {categories.map((cat) => {
                  const count = menuItems.filter((i) => i.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        activeCategoryId === cat.id
                          ? 'bg-[var(--coffee-primary)] text-white'
                          : 'text-[rgba(26,14,7,0.72)] hover:bg-[rgba(107,80,64,0.07)] hover:text-[var(--coffee-primary)]'
                      }`}
                    >
                      {getCategoryEmoji(cat.name)} {cat.name}
                      <span className={`ml-1.5 text-[11px] ${activeCategoryId === cat.id ? 'text-white/70' : 'text-[rgba(26,14,7,0.4)]'}`}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Main content */}
            <div className="min-w-0 flex-1">
              {/* Mobile tabs */}
              <div className="mb-6 flex flex-wrap gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setActiveCategoryId('ALL')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    activeCategoryId === 'ALL'
                      ? 'bg-[var(--coffee-primary)] text-white shadow-md'
                      : 'border border-[rgba(107,80,64,0.2)] bg-white text-[var(--coffee-primary)]'
                  }`}
                >
                  🍽️ Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      activeCategoryId === cat.id
                        ? 'bg-[var(--coffee-primary)] text-white shadow-md'
                        : 'border border-[rgba(107,80,64,0.2)] bg-white text-[var(--coffee-primary)]'
                    }`}
                  >
                    {getCategoryEmoji(cat.name)} {cat.name}
                  </button>
                ))}
              </div>

              {/* Category heading */}
              {activeCategoryId !== 'ALL' && activeCategory && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--coffee-primary)] to-[var(--coffee-dark)] p-5 text-white">
                  <span className="text-4xl">{getCategoryEmoji(activeCategory.name)}</span>
                  <div>
                    <h2 className="text-xl font-bold">{activeCategory.name}</h2>
                    {activeCategory.description && (
                      <p className="text-sm text-[rgba(243,228,208,0.8)]">{activeCategory.description}</p>
                    )}
                  </div>
                  <span className="ml-auto text-sm text-[rgba(243,228,208,0.7)]">
                    {filteredItems.length} món
                  </span>
                </div>
              )}

              {/* Search empty state */}
              {search && filteredItems.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <Search className="h-12 w-12 text-[rgba(107,80,64,0.25)]" />
                  <p className="font-semibold text-[var(--coffee-dark)]">
                    Không tìm thấy món nào
                  </p>
                  <p className="text-sm text-[rgba(26,14,7,0.55)]">
                    Thử tìm với từ khoá khác
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="mt-1 text-sm font-medium text-[var(--coffee-primary)] hover:underline"
                  >
                    Xoá tìm kiếm
                  </button>
                </div>
              )}

              {/* Items grid */}
              {filteredItems.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredItems.map((item) => (
                    <MenuCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Fallback: static data ── */}
        {!loading && error && (
          <div>
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ Không thể tải thực đơn từ hệ thống — đang hiển thị dữ liệu mẫu.
            </div>

            {menuCategories.map((cat) => (
              <div key={cat.title} className="mb-10">
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--coffee-primary)] to-[var(--coffee-dark)] p-5 text-white">
                  <span className="text-3xl">{cat.emoji}</span>
                  <div>
                    <h2 className="text-lg font-bold">{cat.title}</h2>
                    <p className="text-sm text-[rgba(243,228,208,0.8)]">{cat.subtitle}</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.items.map((item) => (
                    <StaticCard key={item.name} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer note ── */}
        {!loading && (
          <p className="mt-12 text-center text-xs text-[rgba(26,14,7,0.45)]">
            * Giá có thể thay đổi theo mùa. Hỏi nhân viên về món đặc biệt trong ngày.
          </p>
        )}
      </div>

      <FooterSection />
    </div>
  );
}
