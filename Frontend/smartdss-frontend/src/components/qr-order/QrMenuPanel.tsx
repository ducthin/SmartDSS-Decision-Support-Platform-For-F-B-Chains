import type { RefObject } from 'react';
import { Check, ChevronDown, Coffee, Minus, Plus, Search } from 'lucide-react';
import { resolveBackendUrl } from '@/services/settingsService';
import type { MenuItem } from '@/types';
import type { CartItem } from '@/components/qr-order/types';

interface QrMenuPanelProps {
  menuSearch: string;
  onMenuSearchChange: (value: string) => void;
  filterCat: string;
  categories: string[];
  catDropdownOpen: boolean;
  catDropdownRef: RefObject<HTMLDivElement | null>;
  onToggleCategoryDropdown: () => void;
  onSelectCategory: (category: string) => void;
  visibleMenu: MenuItem[];
  cart: CartItem[];
  qtyForMenuItem: (menuItemId: number) => number;
  onAddToCart: (item: MenuItem) => void;
  onUpdateQty: (lineKey: string, delta: number) => void;
  formatPrice: (amount: number) => string;
  getMenuPrice: (item: MenuItem) => { prefix: string; amount: number };
}

export default function QrMenuPanel({
  menuSearch,
  onMenuSearchChange,
  filterCat,
  categories,
  catDropdownOpen,
  catDropdownRef,
  onToggleCategoryDropdown,
  onSelectCategory,
  visibleMenu,
  cart,
  qtyForMenuItem,
  onAddToCart,
  onUpdateQty,
  formatPrice,
  getMenuPrice,
}: QrMenuPanelProps) {
  return (
    <>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(111,78,55,0.55)]" />
        <input
          value={menuSearch}
          onChange={(e) => onMenuSearchChange(e.target.value)}
          placeholder="Tìm món, mô tả..."
          className="w-full rounded-xl border border-[rgba(111,78,55,0.18)] bg-white/95 py-3 pl-10 pr-4 text-sm text-(--coffee-dark) outline-none transition focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.22)]"
        />
      </div>

      <div className="coffee-soft-shadow mb-4 rounded-xl border border-[rgba(111,78,55,0.14)] bg-white/95 p-3">
        <div className="relative" ref={catDropdownRef}>
          <button
            type="button"
            onClick={onToggleCategoryDropdown}
            className="flex w-full items-center justify-between rounded-xl border border-[rgba(111,78,55,0.18)] bg-[linear-gradient(90deg,rgba(245,230,211,0.54),rgba(255,255,255,0.95),rgba(245,230,211,0.4))] py-2.5 pl-3 pr-3 text-sm font-semibold text-(--coffee-dark) shadow-sm outline-none transition hover:border-[rgba(111,78,55,0.3)] focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.2)]"
          >
            <span className="truncate">{filterCat === 'all' ? 'Tất cả danh mục' : filterCat}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-(--coffee-primary) transition-transform ${catDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {catDropdownOpen && (
            <div className="coffee-soft-shadow absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-[rgba(111,78,55,0.14)] bg-white">
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition ${
                  filterCat === 'all'
                    ? 'bg-[rgba(245,230,211,0.6)] font-semibold text-(--coffee-primary)'
                    : 'text-[rgba(62,42,31,0.85)] hover:bg-[rgba(245,230,211,0.35)]'
                }`}
              >
                <span>Tất cả danh mục</span>
                {filterCat === 'all' && <Check className="h-4 w-4" />}
              </button>
              <div className="max-h-64 overflow-y-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition ${
                      filterCat === cat
                        ? 'bg-[rgba(245,230,211,0.6)] font-semibold text-(--coffee-primary)'
                        : 'text-[rgba(62,42,31,0.85)] hover:bg-[rgba(245,230,211,0.35)]'
                    }`}
                  >
                    <span>{cat}</span>
                    {filterCat === cat && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {visibleMenu.map((item) => {
          const inCart = cart.find((c) => c.menuItem.id === item.id && !item.drink);
          const qDrink = item.drink ? qtyForMenuItem(item.id) : 0;
          const { prefix, amount } = getMenuPrice(item);
          const canOrder = item.available;
          const imageSrc = resolveBackendUrl(item.imageUrl) ?? item.imageUrl;

          return (
            <article
              key={item.id}
              className={`group coffee-interactive flex flex-col overflow-hidden rounded-xl border border-[rgba(111,78,55,0.14)] bg-white/95 coffee-soft-shadow ${
                canOrder ? '' : 'opacity-[0.72]'
              }`}
            >
              <div className="relative aspect-4/3 bg-[linear-gradient(135deg,rgba(245,230,211,0.85),rgba(252,248,242,0.95),rgba(228,172,92,0.2))]">
                {imageSrc ? (
                  <img src={imageSrc} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex select-none items-center justify-center text-5xl text-[rgba(111,78,55,0.3)]">☕</div>
                )}

                {!canOrder && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgba(62,42,31,0.52)] backdrop-blur-[2px]">
                    <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white">Tạm hết</span>
                  </div>
                )}

                <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
                  {item.badgeNew && (
                    <span className="rounded-full bg-(--coffee-dark) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--coffee-secondary) shadow-sm">
                      Mới
                    </span>
                  )}
                  {item.badgeBestSeller && (
                    <span className="rounded-full bg-(--coffee-accent) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--coffee-dark) shadow-sm">
                      Bán chạy
                    </span>
                  )}
                </div>

                {item.drink && canOrder && (
                  <span className="absolute bottom-2 right-2 rounded-full border border-[rgba(111,78,55,0.14)] bg-white/90 px-2 py-0.5 text-[10px] font-bold text-(--coffee-primary) shadow-sm">
                    Size & topping
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-3">
                <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-(--coffee-dark)">{item.name}</h3>
                {item.description ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[rgba(62,42,31,0.66)]">{item.description}</p>
                ) : null}
                <div className="mt-auto flex items-end justify-between gap-2 border-t border-[rgba(111,78,55,0.08)] pt-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[rgba(62,42,31,0.5)]">Giá</p>
                    <p className="text-base font-bold text-(--coffee-primary)">
                      <span className="text-xs font-semibold text-[rgba(111,78,55,0.82)]">{prefix}</span>
                      {formatPrice(amount)}
                    </p>
                  </div>

                  {item.drink ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {qDrink > 0 && (
                        <span className="rounded-full bg-[rgba(228,172,92,0.2)] px-2 py-0.5 text-xs font-bold tabular-nums text-(--coffee-primary)">
                          ×{qDrink}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={!canOrder}
                        onClick={() => onAddToCart(item)}
                        className="coffee-interactive flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--coffee-primary),var(--coffee-dark))] text-(--coffee-secondary) shadow-md shadow-[rgba(62,42,31,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
                        title="Chọn size & topping"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  ) : inCart ? (
                    <div className="flex items-center gap-1 rounded-xl bg-[rgba(245,230,211,0.42)] p-0.5 ring-1 ring-[rgba(111,78,55,0.16)]">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(inCart.key, -1)}
                        className="coffee-interactive flex h-9 w-9 items-center justify-center rounded-lg bg-white text-(--coffee-primary) shadow-sm"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-5 text-center text-sm font-bold tabular-nums text-(--coffee-dark)">{inCart.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(inCart.key, 1)}
                        className="coffee-interactive flex h-9 w-9 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--coffee-primary),var(--coffee-dark))] text-(--coffee-secondary) shadow-sm"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canOrder}
                      onClick={() => onAddToCart(item)}
                      className="coffee-interactive flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--coffee-primary),var(--coffee-dark))] text-(--coffee-secondary) shadow-md shadow-[rgba(62,42,31,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {visibleMenu.length === 0 && (
        <div className="rounded-xl border border-dashed border-[rgba(111,78,55,0.24)] bg-white/70 py-14 text-center text-[rgba(62,42,31,0.7)]">
          <Coffee className="mx-auto mb-3 h-12 w-12 text-[rgba(111,78,55,0.32)]" />
          <p className="text-sm font-medium">Không có món phù hợp</p>
          <p className="mt-1 text-xs text-[rgba(62,42,31,0.56)]">Thử đổi danh mục hoặc từ khóa tìm kiếm</p>
        </div>
      )}
    </>
  );
}
