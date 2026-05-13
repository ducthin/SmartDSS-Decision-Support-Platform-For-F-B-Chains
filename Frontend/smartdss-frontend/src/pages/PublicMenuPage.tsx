import '@/styles/coffee-theme.css';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Coffee, Loader2, Search, ShoppingBag, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { menuCategories } from '@/assets/coffee/content';
import { useMenuData } from '@/hooks/useHomepageData';
import NavbarSection from '@/sections/coffee/NavbarSection';
import FooterSection from '@/sections/coffee/FooterSection';
import type { MenuItemDTO, PublicOnlineOrderDTO } from '@/services/homepageApi';
import { fetchPersonalVouchers, previewPublicOrderDiscount, submitPublicOnlineOrder } from '@/services/homepageApi';
import { provincesApi, type ProvinceItem, type WardItem } from '@/services/provincesApi';
import { publicConfigService } from '@/services/publicConfigService';
import type { Order, QrDiscountPreview } from '@/types';
import { publicPaymentService } from '@/services/publicPaymentService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  const safePrice = Number.isFinite(price) ? price : 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(safePrice);
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
const ONLINE_DRAFT_STORAGE_KEY = 'smartdss_online_order_draft_v1';
const ITEM_NOTES_MARKER = '[ITEM_NOTES]';

interface OnlineDraftState {
  customerName: string;
  customerPhone: string;
  deliveryDetail: string;
  provinceCode: number | '';
  wardCode: number | '';
  selectedVoucherCodes: string[];
  note: string;
  cartLines: CartLine[];
}

// ─── Single menu item card ───────────────────────────────────────────────────

interface CartLine {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  selectedSizeCode?: string;
  selectedSizeLabel?: string;
  selectedToppingCodes?: string[];
  selectedToppingLabels?: string[];
  itemNote?: string;
}

interface SearchableOption {
  code: number;
  name: string;
}

function getToppingCode(tp: unknown): string {
  if (!tp || typeof tp !== 'object') return '';
  const obj = tp as Record<string, unknown>;
  const fromId = obj.toppingId;
  const fromCode = obj.code;
  if (typeof fromId === 'number' || typeof fromId === 'string') return String(fromId);
  if (typeof fromCode === 'number' || typeof fromCode === 'string') return String(fromCode);
  return '';
}

function getToppingLabel(tp: unknown): string {
  if (!tp || typeof tp !== 'object') return 'Topping';
  const obj = tp as Record<string, unknown>;
  const label = obj.name ?? obj.label ?? obj.code ?? obj.toppingId;
  return typeof label === 'string' || typeof label === 'number' ? String(label) : 'Topping';
}

function SearchableSelect({
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
}: {
  value: number | '';
  options: SearchableOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (code: number | '') => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedLabel = useMemo(
    () => options.find((o) => o.code === value)?.name ?? '',
    [options, value],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 200);
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 200);
  }, [options, query]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-60"
      >
        {selectedLabel || placeholder}
      </button>
      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border bg-white p-2 shadow-lg">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gõ để tìm..."
            className="mb-2 w-full rounded border px-2 py-1.5 text-sm"
          />
          <div className="max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
            >
              Bỏ chọn
            </button>
            {filtered.map((o) => (
              <button
                key={o.code}
                type="button"
                onClick={() => {
                  onChange(o.code);
                  setOpen(false);
                }}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
              >
                {o.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-gray-500">Không tìm thấy</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function toSafeNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseAddressCode(value: unknown): number | '' {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return '';
}

function buildOnlineOrderNotePayload(globalNote: string, cartLines: CartLine[]): string | undefined {
  const cleanedGlobal = (globalNote || '').trim();
  const itemNotes = cartLines
    .map((line, idx) => ({ idx, note: (line.itemNote || '').trim() }))
    .filter((x) => !!x.note);

  if (itemNotes.length === 0) return cleanedGlobal || undefined;

  const itemNotesPart = itemNotes
    .map((x) => `${x.idx}=${x.note.replace(/\r?\n/g, ' ')}`)
    .join('\n');

  if (cleanedGlobal) {
    return `${cleanedGlobal}\n${ITEM_NOTES_MARKER}\n${itemNotesPart}`;
  }
  return `${ITEM_NOTES_MARKER}\n${itemNotesPart}`;
}

function MenuCard({ item, onAdd }: { item: MenuItemDTO; onAdd: (item: MenuItemDTO) => void }) {
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
              Best seller
            </span>
          )}
          {item.badgeNew && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--coffee-accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              Mới
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
                key={s.code}
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
          <button
            type="button"
            onClick={() => onAdd(item)}
            className="coffee-interactive rounded-lg border border-[rgba(107,80,64,0.22)] bg-[rgba(107,80,64,0.05)] px-3 py-1.5 text-xs font-semibold text-[var(--coffee-primary)] transition-all hover:bg-[var(--coffee-primary)] hover:text-white"
          >
            Thêm món
          </button>
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
  const navigate = useNavigate();
  const { categories, menuItems, loading, error } = useMenuData();
  const [activeCategoryId, setActiveCategoryId] = useState<number | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryDetail, setDeliveryDetail] = useState('');
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [wards, setWards] = useState<WardItem[]>([]);
  const [provinceCode, setProvinceCode] = useState<number | ''>('');
  const [wardCode, setWardCode] = useState<number | ''>('');
  const [voucherInput, setVoucherInput] = useState('');
  const [selectedVoucherCodes, setSelectedVoucherCodes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [discountPreview, setDiscountPreview] = useState<QrDiscountPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<Array<{ code: string; title: string; discountLabel?: string }>>([]);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [configItem, setConfigItem] = useState<MenuItemDTO | null>(null);
  const [configSizeCode, setConfigSizeCode] = useState<string>('');
  const [configToppingCodes, setConfigToppingCodes] = useState<string[]>([]);
  const [configItemNote, setConfigItemNote] = useState<string>('');

  const [onlinePaymentOrder, setOnlinePaymentOrder] = useState<Order | null>(null);
  const [onlinePaymentMethod, setOnlinePaymentMethod] = useState<'COD' | 'TRANSFER'>('COD');
  const [paymentBank, setPaymentBank] = useState<{ bankBin: string; bankAccount: string; bankAccountName: string } | null>(null);
  const [loadingPaymentBank, setLoadingPaymentBank] = useState(false);
  const [loadingOnlineQr, setLoadingOnlineQr] = useState(false);
  const [onlineQr, setOnlineQr] = useState<null | { qrImageUrl: string; checkoutUrl?: string; transferContent: string }>(null);
  const [onlineQrError, setOnlineQrError] = useState<string>('');
  const [onlinePaymentPaid, setOnlinePaymentPaid] = useState(false);

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
  const subtotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cartLines],
  );
  const finalAmount = discountPreview?.finalAmount ?? subtotal;
  const cartCount = useMemo(() => cartLines.reduce((sum, line) => sum + line.quantity, 0), [cartLines]);
  const appliedVoucherCodes = useMemo(
    () => (discountPreview?.voucherCodes || []).filter((x) => !!x),
    [discountPreview?.voucherCodes],
  );
  const selectedVoucherSet = useMemo(() => new Set(selectedVoucherCodes), [selectedVoucherCodes]);
  const voucherCode = useMemo(() => selectedVoucherCodes.join(','), [selectedVoucherCodes]);
  const selectedProvince = useMemo(
    () => provinces.find((p) => p.code === provinceCode) || null,
    [provinces, provinceCode],
  );
  const selectedWard = useMemo(
    () => wards.find((w) => w.code === wardCode) || null,
    [wards, wardCode],
  );

  const normalizePhone = (raw: string) => {
    const cleaned = raw.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+84')) return `0${cleaned.slice(3)}`;
    if (cleaned.startsWith('84') && cleaned.length > 9) return `0${cleaned.slice(2)}`;
    return cleaned;
  };

  const defaultSize = (item: MenuItemDTO) => item.drinkSizes?.[0];

  const addToCart = (
    item: MenuItemDTO,
    options?: { sizeCode?: string; toppingCodes?: string[]; itemNote?: string },
  ) => {
    const selectedSize =
      item.drinkSizes?.find((s) => s.code === options?.sizeCode) || defaultSize(item);
    const toppingCodes = options?.toppingCodes || [];
    const selectedToppings = (item.drinkToppings || []).filter((t) =>
      toppingCodes.includes(getToppingCode(t)),
    );
    const basePrice = toSafeNumber(item.price);
    const extraPrice = toSafeNumber(selectedSize?.priceExtra);
    const toppingPrice = selectedToppings.reduce((sum, t) => sum + toSafeNumber(t.price), 0);
    const selectedToppingCodes = selectedToppings.map((t) => getToppingCode(t)).filter(Boolean);
    const selectedToppingLabels = selectedToppings.map((t) => getToppingLabel(t)).filter(Boolean);
    const toppingKey = [...selectedToppingCodes].sort().join('|');
    const key = `${item.id}-${selectedSize?.code || 'nosize'}-${toppingKey || 'notopping'}-${(options?.itemNote || '').trim() || 'nonote'}`;
    setCartLines((prev) => {
      const idx = prev.findIndex((line) => {
        const lineToppingKey = [...(line.selectedToppingCodes || [])].sort().join('|') || 'notopping';
        const lineItemNoteKey = (line.itemNote || '').trim() || 'nonote';
        return `${line.menuItemId}-${line.selectedSizeCode || 'nosize'}-${lineToppingKey}-${lineItemNoteKey}` === key;
      });
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: basePrice + extraPrice + toppingPrice,
          quantity: 1,
          selectedSizeCode: selectedSize?.code,
          selectedSizeLabel: selectedSize?.label,
          selectedToppingCodes,
          selectedToppingLabels,
          itemNote: (options?.itemNote || '').trim() || undefined,
        },
      ];
    });
    toast.success(`Đã thêm ${item.name}`);
  };

  const startAddToCart = (item: MenuItemDTO) => {
    const hasSizeChoice = (item.drinkSizes?.length || 0) > 1;
    const hasToppingChoice = (item.drinkToppings?.length || 0) > 0;
    if (!hasSizeChoice && !hasToppingChoice) {
      addToCart(item);
      return;
    }
    setConfigItem(item);
    setConfigSizeCode(defaultSize(item)?.code || '');
    setConfigToppingCodes([]);
    setConfigItemNote('');
  };

  const confirmAddConfiguredItem = () => {
    if (!configItem) return;
    addToCart(configItem, {
      sizeCode: configSizeCode || undefined,
      toppingCodes: configToppingCodes,
      itemNote: configItemNote || undefined,
    });
    setConfigItem(null);
    setConfigSizeCode('');
    setConfigToppingCodes([]);
    setConfigItemNote('');
  };

  const setLineQty = (index: number, qty: number) => {
    setCartLines((prev) => {
      if (qty <= 0) return prev.filter((_, i) => i !== index);
      return prev.map((line, i) => (i === index ? { ...line, quantity: qty } : line));
    });
  };

  const addVoucherToken = async (raw: string) => {
    const token = (raw || '').toUpperCase().trim().split(/[,\s;|]+/).filter(Boolean)[0];
    if (!token) return;
    if (selectedVoucherCodes.includes(token)) return;

    const nextVoucherCodes = [...selectedVoucherCodes, token];
    try {
      const preview = await previewPublicOrderDiscount({
        subtotal,
        voucherCode: nextVoucherCodes.join(','),
        customerPhone: normalizePhone(customerPhone).trim() || undefined,
      });
      const validCodes = (preview?.voucherCodes || []).map((x) => (x || '').toUpperCase());
      if (!validCodes.includes(token)) {
        toast.error('Mã voucher không hợp lệ hoặc chưa đủ điều kiện');
        return;
      }
      setSelectedVoucherCodes(nextVoucherCodes);
      setDiscountPreview(preview);
    } catch {
      toast.error('Không thể kiểm tra mã voucher lúc này');
    }
  };

  const submitVoucherInput = async () => {
    if (!voucherInput.trim()) return;
    await addVoucherToken(voucherInput);
    setVoucherInput('');
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONLINE_DRAFT_STORAGE_KEY);
      if (!raw) {
        setDraftHydrated(true);
        return;
      }
      const draft = JSON.parse(raw) as Partial<OnlineDraftState>;
      setCustomerName(draft.customerName || '');
      setCustomerPhone(draft.customerPhone || '');
      setDeliveryDetail(draft.deliveryDetail || '');
      setProvinceCode(parseAddressCode(draft.provinceCode));
      setWardCode(parseAddressCode(draft.wardCode));
      setSelectedVoucherCodes(Array.isArray(draft.selectedVoucherCodes) ? draft.selectedVoucherCodes : []);
      setNote(draft.note || '');
      if (Array.isArray(draft.cartLines)) {
        const safeLines = draft.cartLines
          .filter((line) => line && Number.isFinite(line.menuItemId) && Number.isFinite(line.quantity))
          .map((line) => ({
            menuItemId: Number(line.menuItemId),
            name: line.name || '',
            price: toSafeNumber(line.price),
            quantity: Math.max(1, Math.floor(Number(line.quantity))),
            selectedSizeCode: line.selectedSizeCode || undefined,
            selectedSizeLabel: line.selectedSizeLabel || undefined,
            selectedToppingCodes: Array.isArray(line.selectedToppingCodes)
              ? line.selectedToppingCodes.map((x) => String(x))
              : [],
            selectedToppingLabels: Array.isArray(line.selectedToppingLabels)
              ? line.selectedToppingLabels.map((x) => String(x))
              : [],
            itemNote: typeof (line as any).itemNote === 'string' ? (line as any).itemNote : undefined,
          }));
        setCartLines(safeLines);
      }
    } catch {
      localStorage.removeItem(ONLINE_DRAFT_STORAGE_KEY);
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    const draft: OnlineDraftState = {
      customerName,
      customerPhone,
      deliveryDetail,
      provinceCode,
      wardCode,
      selectedVoucherCodes,
      note,
      cartLines,
    };
    localStorage.setItem(ONLINE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draftHydrated, customerName, customerPhone, deliveryDetail, provinceCode, wardCode, selectedVoucherCodes, note, cartLines]);

  useEffect(() => {
    let cancelled = false;
    provincesApi.getProvinces()
      .then((data) => {
        if (!cancelled) setProvinces(data || []);
      })
      .catch(() => {
        if (!cancelled) setProvinces([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated) {
      return;
    }
    if (!provinceCode) {
      setWards([]);
      setWardCode('');
      return;
    }
    let cancelled = false;
    provincesApi.getWardsByProvince(provinceCode)
      .then((data) => {
        if (cancelled) return;
        const list = data || [];
        setWards(list);
        setWardCode((prev) => (typeof prev === 'number' && list.some((w) => w.code === prev) ? prev : ''));
      })
      .catch(() => {
        if (!cancelled) {
          setWards([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draftHydrated, provinceCode]);

  useEffect(() => {
    const normalizedPhone = normalizePhone(customerPhone).trim();
    if (!/^0\d{9,10}$/.test(normalizedPhone)) {
      setAvailableVouchers([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const vouchers = await fetchPersonalVouchers(normalizedPhone);
        if (!cancelled) {
          setAvailableVouchers(
            (vouchers || []).map((x) => ({
              code: x.code?.toUpperCase?.() || '',
              title: x.title,
              discountLabel: x.discountLabel,
            })).filter((x) => !!x.code),
          );
        }
      } catch {
        if (!cancelled) setAvailableVouchers([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerPhone]);

  useEffect(() => {
    if (!onlinePaymentOrder) return;
    setOnlinePaymentPaid(false);
    setLoadingPaymentBank(true);
    publicConfigService
      .getPaymentBankConfig()
      .then((res) => {
        setPaymentBank(res.data.data || null);
      })
      .catch(() => setPaymentBank(null))
      .finally(() => setLoadingPaymentBank(false));
  }, [onlinePaymentOrder]);

  // Polling: khi webhook từ provider cập nhật xong, frontend sẽ nhận PAID và tự đóng modal
  useEffect(() => {
    if (!onlinePaymentOrder) return;
    if (onlinePaymentMethod !== 'TRANSFER') return;
    if (onlinePaymentPaid) return;

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 80; // ~ 4 phút (80 * 3s)
    const intervalMs = 3000;

    const poll = async () => {
      if (cancelled) return;
      if (!onlinePaymentOrder) return;
      attempt += 1;
      if (attempt > maxAttempts) return;

      try {
        const res = await publicPaymentService.getOrderPaymentStatus(onlinePaymentOrder.id);
        const status = res.data?.data?.status;
        if (status === 'PAID' && !cancelled) {
          setOnlinePaymentPaid(true);
          toast.success('Nhận thanh toán thành công!');
          setTimeout(() => {
            const phone = normalizePhone(customerPhone).trim();
            if (phone) {
              navigate(`/order-tracking?customerPhone=${encodeURIComponent(phone)}`);
            } else {
              navigate('/order-tracking');
            }
            setOnlinePaymentOrder(null);
          }, 1500);
          return;
        }
      } catch (e) {
        // Chỉ im lặng retry; lỗi tạm thời có thể do backend chưa kịp cập nhật webhook
      }
    };

    poll().catch(() => { });
    const timer = window.setInterval(() => {
      poll().catch(() => { });
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [onlinePaymentOrder, onlinePaymentMethod, onlinePaymentPaid, customerPhone, navigate]);

  useEffect(() => {
    if (!onlinePaymentOrder) return;
    if (onlinePaymentMethod !== 'TRANSFER') return;

    let cancelled = false;
    setLoadingOnlineQr(true);
    setOnlineQrError('');
    setOnlineQr(null);

    publicPaymentService
      .initQrPayment(onlinePaymentOrder.id)
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data;
        if (!data) return;
        setOnlineQr({
          qrImageUrl: data.qrImageUrl,
          checkoutUrl: data.checkoutUrl,
          transferContent: data.transferContent,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Không thể tạo mã QR';
        setOnlineQrError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingOnlineQr(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onlinePaymentOrder, onlinePaymentMethod]);

  useEffect(() => {
    if (!cartLines.length) {
      setDiscountPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const preview = await previewPublicOrderDiscount({
          subtotal,
          voucherCode: voucherCode.trim() || undefined,
          customerPhone: normalizePhone(customerPhone).trim() || undefined,
        });
        setDiscountPreview(preview);
      } catch {
        setDiscountPreview(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [subtotal, voucherCode, customerPhone, cartLines.length]);

  const placeOnlineOrder = async () => {
    if (!customerName.trim()) {
      toast.error('Vui lòng nhập họ tên');
      return;
    }
    const normalizedPhone = normalizePhone(customerPhone);
    if (!/^0\d{9,10}$/.test(normalizedPhone)) {
      toast.error('Số điện thoại không hợp lệ');
      return;
    }
    if (!deliveryDetail.trim() || !selectedProvince || !selectedWard) {
      toast.error('Vui lòng nhập đầy đủ địa chỉ giao hàng');
      return;
    }
    if (!cartLines.length) {
      toast.error('Giỏ hàng đang trống');
      return;
    }

    const deliveryAddress = `${deliveryDetail.trim()}, ${selectedWard.name}, ${selectedProvince.name}`;

    const payload: PublicOnlineOrderDTO = {
      customerName: customerName.trim(),
      customerPhone: normalizedPhone,
      deliveryAddress: deliveryAddress.trim(),
      voucherCode: voucherCode.trim() || undefined,
      note: buildOnlineOrderNotePayload(note, cartLines),
      orderItems: cartLines.map((line) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        selectedSizeCode: line.selectedSizeCode,
        selectedToppingCodes: line.selectedToppingCodes,
      })),
    };

    setSubmitting(true);
    try {
      const createdOrder = await submitPublicOnlineOrder(payload);
      setOnlinePaymentOrder(createdOrder);
      setOnlinePaymentMethod('COD');
      toast.success('Đặt hàng thành công! Quán sẽ gọi xác nhận sớm.');
      setCartLines([]);
      setVoucherInput('');
      setSelectedVoucherCodes([]);
      setDeliveryDetail('');
      setProvinceCode('');
      setWardCode('');
      setNote('');
      setDiscountPreview(null);
      setCartOpen(false);
      localStorage.removeItem(ONLINE_DRAFT_STORAGE_KEY);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đặt hàng lúc này';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

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
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${activeCategoryId === 'ALL'
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
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${activeCategoryId === cat.id
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
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${activeCategoryId === 'ALL'
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
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${activeCategoryId === cat.id
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
                    <MenuCard key={item.id} item={item} onAdd={startAddToCart} />
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

      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[var(--coffee-primary)] px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        <ShoppingBag className="h-4 w-4" />
        Giỏ hàng ({cartCount})
      </button>

      {cartOpen && !onlinePaymentOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--coffee-dark)]">Đặt hàng online</h3>
              <button type="button" onClick={() => setCartOpen(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {cartLines.map((line, idx) => (
                <div key={`${line.menuItemId}-${line.selectedSizeCode || 'nosize'}-${idx}`} className="rounded-xl border p-3">
                  <div className="text-sm font-semibold">{line.name}{line.selectedSizeLabel ? ` (${line.selectedSizeLabel})` : ''}</div>
                  {line.selectedToppingLabels && line.selectedToppingLabels.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      Topping: {line.selectedToppingLabels.join(', ')}
                    </div>
                  )}
                  {line.itemNote ? (
                    <div className="mt-1 text-xs text-violet-800">
                      Ghi chú món: {line.itemNote}
                    </div>
                  ) : null}
                  <div className="mt-1 text-xs text-gray-500">{formatPrice(line.price)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" onClick={() => setLineQty(idx, line.quantity - 1)} className="rounded border px-2">-</button>
                    <span className="w-8 text-center text-sm">{line.quantity}</span>
                    <button type="button" onClick={() => setLineQty(idx, line.quantity + 1)} className="rounded border px-2">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t pt-4">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Họ tên"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Số điện thoại"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={deliveryDetail}
                onChange={(e) => setDeliveryDetail(e.target.value)}
                placeholder="Số nhà, tên đường"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <SearchableSelect
                value={provinceCode}
                options={provinces}
                placeholder="Chọn Tỉnh/Thành phố"
                onChange={(code) => setProvinceCode(code)}
              />
              <SearchableSelect
                value={wardCode}
                options={wards}
                placeholder="Chọn Phường/Xã"
                disabled={!provinceCode}
                onChange={(code) => setWardCode(code)}
              />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitVoucherInput();
                    }
                  }}
                  placeholder="Mã voucher (nhập mã và bấm Thêm)"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={submitVoucherInput}
                  className="rounded-lg border border-[rgba(107,80,64,0.3)] px-3 py-2 text-sm font-semibold text-[var(--coffee-primary)] hover:bg-[rgba(107,80,64,0.06)]"
                >
                  Thêm mã
                </button>
              </div>
              {selectedVoucherCodes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedVoucherCodes.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSelectedVoucherCodes((prev) => prev.filter((x) => x !== code))}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                      title="Bấm để bỏ mã"
                    >
                      {code} ×
                    </button>
                  ))}
                </div>
              )}
              {availableVouchers.length > 0 && (
                <div className="rounded-lg border border-[rgba(107,80,64,0.15)] bg-[rgba(107,80,64,0.04)] p-2.5">
                  <p className="mb-2 text-xs font-semibold text-[var(--coffee-primary)]">Voucher của bạn:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableVouchers.map((v) => (
                      <button
                        key={v.code}
                        type="button"
                        onClick={() => {
                          if (selectedVoucherSet.has(v.code)) return;
                          setSelectedVoucherCodes((prev) => [...prev, v.code]);
                          setVoucherInput('');
                        }}
                        className="rounded-full border border-[rgba(107,80,64,0.25)] bg-white px-2.5 py-1 text-xs text-[var(--coffee-primary)] hover:bg-[rgba(107,80,64,0.07)]"
                        title={v.title}
                      >
                        {v.code}{v.discountLabel ? ` · ${v.discountLabel}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Ghi chú giao hàng/nhận tại quán..."
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />

              <div className="rounded-lg bg-[rgba(107,80,64,0.06)] p-3 text-sm">
                <div className="flex items-center justify-between"><span>Tạm tính</span><span>{formatPrice(subtotal)}</span></div>
                <div className="flex items-center justify-between"><span>Giảm giá</span><span>-{formatPrice(discountPreview?.totalDiscountAmount || 0)}</span></div>
                <div className="mt-2 flex items-center justify-between font-bold"><span>Thành tiền</span><span>{formatPrice(finalAmount)}</span></div>
                {appliedVoucherCodes.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-[var(--coffee-primary)]">Mã đang áp dụng:</span>
                    {appliedVoucherCodes.map((code) => (
                      <span
                        key={code}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                )}
                {discountPreview?.voucherError ? (
                  <p className="mt-2 text-xs text-rose-600">{discountPreview.voucherError}</p>
                ) : null}
              </div>

              <button
                type="button"
                disabled={!cartLines.length || submitting}
                onClick={placeOnlineOrder}
                className="w-full rounded-lg bg-[var(--coffee-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? 'Đang gửi đơn...' : 'Đặt hàng ngay'}
              </button>
              <p className="text-xs text-gray-500">Quán sẽ gọi xác nhận để chốt đơn trước khi chuẩn bị.</p>
            </div>
          </div>
        </div>
      )}

      {configItem && !onlinePaymentOrder && (
        <div
          className="fixed inset-0 z-[60] bg-black/40"
          onClick={() => setConfigItem(null)}
        >
          <div
            className="mx-auto mt-8 flex max-h-[88vh] w-[94%] max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b px-5 py-4">
              <h3 className="text-base font-bold text-[var(--coffee-dark)]">
                Chọn tuỳ chọn cho {configItem.name}
              </h3>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              {configItem.drinkSizes && configItem.drinkSizes.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Size</p>
                  <div className="space-y-2">
                    {configItem.drinkSizes.map((size) => (
                      <label
                        key={size.code}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${configSizeCode === size.code
                            ? 'border-[var(--coffee-primary)] bg-[rgba(107,80,64,0.06)]'
                            : 'border-gray-200'
                          }`}
                      >
                        <span className="font-medium">{size.label || size.code}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            +{formatPrice(toSafeNumber(size.priceExtra))}
                          </span>
                          <input
                            type="radio"
                            name="size-choice"
                            checked={configSizeCode === size.code}
                            onChange={() => setConfigSizeCode(size.code)}
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {configItem.drinkToppings && configItem.drinkToppings.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Topping</p>
                  <div className="space-y-2">
                    {configItem.drinkToppings.map((tp, idx) => (
                      <label
                        key={getToppingCode(tp) || `topping-${idx}`}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${configToppingCodes.includes(getToppingCode(tp))
                            ? 'border-[var(--coffee-primary)] bg-[rgba(107,80,64,0.06)]'
                            : 'border-gray-200'
                          }`}
                      >
                        <span className="font-medium">{getToppingLabel(tp)}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            +{formatPrice(toSafeNumber(tp.price))}
                          </span>
                          <input
                            type="checkbox"
                            checked={configToppingCodes.includes(getToppingCode(tp))}
                            onChange={(e) => {
                              const code = getToppingCode(tp);
                              if (!code) return;
                              setConfigToppingCodes((prev) =>
                                e.target.checked
                                  ? [...prev, code]
                                  : prev.filter((x) => x !== code),
                              );
                            }}
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1">
                <p className="mb-2 text-sm font-semibold">Ghi chú cho món (tuỳ chọn)</p>
                <textarea
                  value={configItemNote}
                  onChange={(e) => setConfigItemNote(e.target.value)}
                  rows={2}
                  placeholder="Ví dụ: ít đá, không đường..."
                  className="w-full resize-none rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t px-5 py-4">
              <button
                type="button"
                onClick={() => setConfigItem(null)}
                className="rounded-lg border px-3 py-2 text-sm font-semibold"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={confirmAddConfiguredItem}
                className="rounded-lg bg-[var(--coffee-primary)] px-3 py-2 text-sm font-semibold text-white"
              >
                Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {onlinePaymentOrder && (
        <div
          className="fixed inset-0 z-[70] bg-black/40"
          onClick={() => setOnlinePaymentOrder(null)}
        >
          <div
            className="mx-auto mt-10 w-[94%] max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--coffee-dark)]">Thanh toán đơn online</h3>
              <button
                type="button"
                onClick={() => setOnlinePaymentOrder(null)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span>Mã đơn</span>
                <span className="font-semibold">#{onlinePaymentOrder.id}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Tổng</span>
                <span className="font-bold text-[var(--coffee-primary)]">{formatPrice(onlinePaymentOrder.totalAmount ?? 0)}</span>
              </div>
            </div>

            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setOnlinePaymentMethod('COD')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${onlinePaymentMethod === 'COD'
                    ? 'bg-[var(--coffee-primary)] text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                COD
              </button>
              <button
                type="button"
                onClick={() => setOnlinePaymentMethod('TRANSFER')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${onlinePaymentMethod === 'TRANSFER'
                    ? 'bg-[var(--coffee-primary)] text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Chuyển khoản
              </button>
            </div>

            {onlinePaymentMethod === 'COD' ? (
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-5">
                <p className="font-semibold text-gray-900">Thanh toán tiền mặt khi nhận hàng</p>
                <p className="mt-1 text-gray-600">
                  Quán sẽ gọi xác nhận trước khi giao món. Bạn thanh toán trực tiếp cho nhân viên.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-5">
                <p className="font-semibold text-gray-900">Thông tin chuyển khoản</p>
                {loadingOnlineQr ? (
                  <p className="mt-2 text-gray-600">Đang tạo QR thanh toán...</p>
                ) : onlineQr ? (
                  <>
                    <div className="mt-3 flex flex-col items-center gap-2">
                      {onlineQr.qrImageUrl ? (
                        <img
                          src={onlineQr.qrImageUrl}
                          alt="QR chuyển khoản"
                          className="h-48 w-48 rounded-lg border border-gray-200 object-contain"
                        />
                      ) : null}
                      <div className="w-full rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold">Nội dung CK:</span>{' '}
                            <span className="font-mono">{onlineQr.transferContent}</span>
                          </div>
                          <button
                            type="button"
                            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              const text = onlineQr.transferContent;
                              navigator.clipboard?.writeText?.(text).then(() => toast.success('Đã copy nội dung CK')).catch(() => { });
                            }}
                          >
                            Copy
                          </button>
                        </div>
                        <p className="mt-2 text-gray-600">
                          Quét QR hoặc chuyển khoản theo nội dung phía trên.
                        </p>
                      </div>
                    </div>
                  </>
                ) : onlineQrError ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900">
                    <p className="font-semibold text-sm">Chưa tạo được QR ngay</p>
                    <p className="mt-1 text-xs text-amber-800">{onlineQrError}</p>
                    <p className="mt-2 text-xs text-amber-800">
                      Bạn có thể chờ quán xác nhận xong rồi thử lại. Trong lúc đó có thể chuyển khoản theo thông tin bên dưới.
                    </p>
                  </div>
                ) : loadingPaymentBank && !paymentBank ? (
                  <p className="mt-2 text-gray-600">Đang tải thông tin ngân hàng...</p>
                ) : (
                  <div className="mt-2 space-y-1 text-gray-700">
                    <div>
                      <span className="font-semibold">Ngân hàng:</span> {paymentBank?.bankBin || '—'}
                    </div>
                    <div>
                      <span className="font-semibold">Số tài khoản:</span> {paymentBank?.bankAccount || '—'}
                    </div>
                    <div>
                      <span className="font-semibold">Chủ tài khoản:</span> {paymentBank?.bankAccountName || '—'}
                    </div>
                    <div className="mt-2 rounded-lg bg-gray-50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold">Nội dung CK:</span>{' '}
                          <span className="font-mono">BILL-{onlinePaymentOrder.id}</span>
                        </div>
                        <button
                          type="button"
                          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => {
                            const text = `BILL-${onlinePaymentOrder.id}`;
                            navigator.clipboard?.writeText?.(text).then(() => toast.success('Đã copy nội dung CK')).catch(() => { });
                          }}
                        >
                          Copy
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-600">
                        Vui lòng chuyển đúng số tiền để quán xác nhận nhanh.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  // COD: chuyển sang trang theo dõi ngay khi khách chọn COD
                  if (onlinePaymentMethod === 'COD') {
                    const phone = normalizePhone(customerPhone).trim();
                    if (phone) {
                      navigate(`/order-tracking?customerPhone=${encodeURIComponent(phone)}`);
                    } else {
                      navigate('/order-tracking');
                    }
                    setOnlinePaymentOrder(null);
                    return;
                  }
                  // TRANSFER: chỉ đóng modal, chuyển sang trang sau khi webhook báo PAID
                  setOnlinePaymentOrder(null);
                }}
                disabled={onlinePaymentPaid}
                className="w-full rounded-lg bg-[var(--coffee-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {onlinePaymentPaid
                  ? 'Đã nhận thành công'
                  : onlinePaymentMethod === 'COD'
                    ? 'Đã hiểu, chờ quán gọi'
                    : 'Tôi đã chuyển khoản'}
              </button>
              {onlinePaymentPaid ? (
                <p className="mt-2 text-xs text-emerald-700 font-medium">
                  Đã nhận thanh toán thành công. Quán sẽ chuẩn bị món.
                </p>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  Nếu cần hỗ trợ, giữ mã đơn để nhân viên tra cứu.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <FooterSection />
    </div>
  );
}
