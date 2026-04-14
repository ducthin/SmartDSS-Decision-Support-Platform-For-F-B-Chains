import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Minus,
  Send,
  ClipboardList,
  Coffee,
  X,
  Bell,
  Star,
  MessageSquareText,
  ImagePlus,
  Trash2,
  Search,
  MapPin,
  ChevronDown,
  Check,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { qrService } from '@/services/qrService';
import { publicConfigService } from '@/services/publicConfigService';
import type { MenuItem, Order, DiningTable, QrFeedbackForm, TaxPolicy } from '@/types';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { calculateVatBreakdown, drinkCartLineKey, unitPriceWithDrinkOptions, formatOrderItemExtras } from '@/utils/helpers';
import DrinkCustomizeModal from '@/components/DrinkCustomizeModal';
import { getOrCreateQrClientSessionId, getOrderQrSessionId } from '@/utils/qrClientSession';

interface CartItem {
  key: string;
  menuItem: MenuItem;
  quantity: number;
  selectedSizeCode?: string;
  selectedToppingCodes?: string[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  PREPARING: 'Đang pha chế',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200/80',
  PREPARING: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200/80',
  COMPLETED: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80',
  CANCELLED: 'bg-red-100 text-red-800 ring-1 ring-red-200/80',
};
const MAX_FEEDBACK_CONTENT = 2000;

type Tab = 'menu' | 'orders' | 'feedback';

function displayMenuPrice(item: MenuItem): { prefix: string; amount: number } {
  if (item.drink && item.drinkSizes && item.drinkSizes.length > 0) {
    const totals = item.drinkSizes.map((s) => item.price + s.priceExtra);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    if (min !== max) return { prefix: 'Từ ', amount: min };
    return { prefix: '', amount: min };
  }
  return { prefix: '', amount: item.price };
}

export default function QrOrderPage() {
  const { token } = useParams<{ token: string }>();
  const [table, setTable] = useState<DiningTable | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drinkModal, setDrinkModal] = useState<{ item: MenuItem; initialSizeCode?: string } | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('menu');
  const [showCart, setShowCart] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [callingStaff, setCallingStaff] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackPreviewUrls, setFeedbackPreviewUrls] = useState<string[]>([]);
  const [taxPolicy, setTaxPolicy] = useState<TaxPolicy>({ vatRatePercent: 8, priceIncludesVat: true });
  const [feedback, setFeedback] = useState<QrFeedbackForm>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    rating: 5,
    content: '',
    images: [],
  });

  /**
   * Một mã cố định / token bàn — dùng ref để tránh Strict Mode gọi getOrCreate 2 lần tạo 2 ID khác nhau.
   */
  const qrSessionRef = useRef<{ t: string; id: string } | null>(null);
  const catDropdownRef = useRef<HTMLDivElement | null>(null);
  const clientSessionId = useMemo(() => {
    if (!token) return '';
    const r = qrSessionRef.current;
    if (r && r.t === token) return r.id;
    const id = getOrCreateQrClientSessionId(token);
    qrSessionRef.current = { t: token, id };
    return id;
  }, [token]);
  const qrOrderTopic = useMemo(
    () => (clientSessionId ? `/topic/qr-orders/${clientSessionId}` : '/topic/qr-orders/unknown'),
    [clientSessionId],
  );

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [tableRes, menuRes, taxRes] = await Promise.all([
        qrService.getTableInfo(token),
        qrService.getMenu(token),
        publicConfigService.getTaxPolicy(),
      ]);
      setTable(tableRes.data.data);
      setMenuItems(menuRes.data.data);
      setTaxPolicy(taxRes.data.data);
      setError('');
    } catch {
      setError('Mã QR không hợp lệ hoặc bàn không hoạt động');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadOrders = useCallback(async () => {
    if (!token || !clientSessionId) return;
    try {
      const res = await qrService.getOrders(token, clientSessionId);
      const raw = res.data.data ?? [];
      // Luôn lọc theo phiên — phòng server cũ / proxy trả nhầm toàn bộ đơn bàn
      setOrders(raw.filter((o) => getOrderQrSessionId(o) === clientSessionId));
    } catch {
      /* ignore */
    }
  }, [token, clientSessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const urls = (feedback.images || []).map((f) => URL.createObjectURL(f));
    setFeedbackPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [feedback.images]);

  const handleSocketUpdate = useCallback(
    (data?: Order) => {
      if (data && data.id && table && data.tableNumber === table.name) {
        const sid = getOrderQrSessionId(data);
        if (!sid || sid !== clientSessionId) {
          return;
        }
        setOrders((prev) => {
          const exists = prev.find((o) => o.id === data.id);
          if (exists) {
            return prev.map((o) => (o.id === data.id ? data : o));
          }
          return [data, ...prev];
        });
      }
      if (!data?.id && tab === 'orders') {
        loadOrders();
      }
    },
    [loadOrders, table, tab, clientSessionId],
  );

  useEffect(() => {
    if (tab === 'orders') loadOrders();
  }, [tab, loadOrders]);

  useEffect(() => {
    if (!catDropdownOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!catDropdownRef.current) return;
      if (!catDropdownRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCatDropdownOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [catDropdownOpen]);

  useOrderSocket(handleSocketUpdate, { publicMode: true, topicDestination: qrOrderTopic });

  const categories = useMemo(() => [...new Set(menuItems.map((m) => m.categoryName))], [menuItems]);

  const filtered = filterCat === 'all' ? menuItems : menuItems.filter((m) => m.categoryName === filterCat);

  const searchQ = menuSearch.trim().toLowerCase();
  const visibleMenu = useMemo(() => {
    const base = !searchQ
      ? filtered
      : filtered.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQ) ||
        (m.description && m.description.toLowerCase().includes(searchQ)) ||
        m.categoryName.toLowerCase().includes(searchQ),
    );
    // Món còn bán lên trên để khách chọn nhanh hơn.
    return [...base].sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [filtered, searchQ]);

  const qtyForMenuItem = (menuItemId: number) =>
    cart.filter((c) => c.menuItem.id === menuItemId).reduce((s, c) => s + c.quantity, 0);

  const addToCart = (item: MenuItem) => {
    if (!item.available) {
      toast.error('Món này tạm hết hàng');
      return;
    }
    if (item.drink) {
      setDrinkModal({ item });
      return;
    }
    const key = drinkCartLineKey(item.id, undefined, []);
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) return prev.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { key, menuItem: item, quantity: 1 }];
    });
    toast.success(`Đã thêm ${item.name}`, { duration: 1500 });
  };

  const addDrinkLineToCart = (sizeCode: string, toppingCodes: string[]) => {
    if (!drinkModal) return;
    const item = drinkModal.item;
    const key = drinkCartLineKey(item.id, sizeCode, toppingCodes);
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) return prev.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { key, menuItem: item, quantity: 1, selectedSizeCode: sizeCode, selectedToppingCodes: toppingCodes }];
    });
    setDrinkModal(null);
    toast.success(`Đã thêm ${item.name}`, { duration: 1500 });
  };

  const updateQty = (lineKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.key !== lineKey) return c;
          const newQty = c.quantity + delta;
          return { ...c, quantity: newQty };
        })
        .filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (lineKey: string) => {
    setCart((prev) => prev.filter((c) => c.key !== lineKey));
  };

  const cartTotal = cart.reduce(
    (sum, c) => sum + unitPriceWithDrinkOptions(c.menuItem, c.selectedSizeCode, c.selectedToppingCodes) * c.quantity,
    0,
  );
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const vat = calculateVatBreakdown(cartTotal, taxPolicy.vatRatePercent, taxPolicy.priceIncludesVat);

  const placeOrder = async () => {
    if (!token || cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await qrService.placeOrder(token, {
        clientSessionId,
        note: note || undefined,
        orderItems: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          ...(c.menuItem.drink && c.selectedSizeCode
            ? { selectedSizeCode: c.selectedSizeCode, selectedToppingCodes: c.selectedToppingCodes || [] }
            : {}),
        })),
      });
      const created = res.data.data;
      if (created?.id) {
        const withSession: Order = {
          ...created,
          qrClientSessionId: created.qrClientSessionId ?? clientSessionId,
        };
        setOrders((prev) => (prev.some((o) => o.id === withSession.id) ? prev : [withSession, ...prev]));
      }
      toast.success('Đặt hàng thành công! Vui lòng chờ pha chế.');
      setCart([]);
      setNote('');
      setShowCart(false);
      setTab('orders');
      void loadOrders();
    } catch {
      toast.error('Lỗi đặt hàng, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const callStaff = async () => {
    if (!token) return;
    if (callingStaff) return;
    setCallingStaff(true);
    try {
      await qrService.callStaff(token);
      toast.success('Đã gọi nhân viên. Vui lòng chờ một chút.');
    } catch {
      toast.error('Không thể gọi nhân viên, vui lòng thử lại');
    } finally {
      setCallingStaff(false);
    }
  };

  const submitFeedback = async () => {
    if (!token) return;
    if (submittingFeedback) return;

    if (!feedback.customerName.trim()) return toast.error('Vui lòng nhập họ tên');
    if (!feedback.customerPhone.trim()) return toast.error('Vui lòng nhập số điện thoại');
    if (!feedback.customerEmail.trim()) return toast.error('Vui lòng nhập email');
    if (!feedback.content.trim()) return toast.error('Vui lòng nhập nội dung feedback');
    if (feedback.content.trim().length > MAX_FEEDBACK_CONTENT) return toast.error('Nội dung feedback tối đa 2000 ký tự');

    setSubmittingFeedback(true);
    try {
      await qrService.submitFeedback(token, {
        ...feedback,
        customerName: feedback.customerName.trim(),
        customerPhone: feedback.customerPhone.trim(),
        customerEmail: feedback.customerEmail.trim(),
        content: feedback.content.trim(),
      });
      toast.success('Cảm ơn bạn đã gửi feedback cho quán!');
      setFeedback({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        rating: 5,
        content: '',
        images: [],
      });
      setTab('menu');
    } catch {
      toast.error('Gửi feedback thất bại, vui lòng thử lại');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatPrice = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const removeSelectedImage = (idx: number) => {
    setFeedback((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== idx),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-orange-50 via-amber-50/90 to-stone-100">
        <div className="h-12 w-12 rounded-2xl bg-white shadow-lg shadow-orange-200/50 flex items-center justify-center">
          <Coffee className="h-6 w-6 text-orange-500 animate-pulse" />
        </div>
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
        <p className="text-sm text-gray-500">Đang tải thực đơn…</p>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-stone-100 flex items-center justify-center p-6">
        <div className="text-center max-w-sm rounded-3xl bg-white/90 backdrop-blur border border-orange-100 shadow-xl shadow-orange-900/5 p-8">
          <Coffee className="mx-auto h-16 w-16 text-orange-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy bàn</h1>
          <p className="text-gray-500 text-sm leading-relaxed">{error || 'Vui lòng quét lại mã QR'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/95 via-amber-50/60 to-stone-100 pb-28">
      <Toaster
        position="top-center"
        toastOptions={{
          className: '!rounded-xl !shadow-lg !text-sm',
          style: { background: '#fff', color: '#1c1917' },
        }}
      />
      <DrinkCustomizeModal
        open={!!drinkModal}
        item={drinkModal?.item ?? null}
        initialSizeCode={drinkModal?.initialSizeCode}
        onClose={() => setDrinkModal(null)}
        onConfirm={addDrinkLineToCart}
        variant="qr"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/20 bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-900/10">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-100/90">Đặt món tại bàn</p>
              <h1 className="text-xl font-extrabold tracking-tight mt-0.5">SmartDSS</h1>
              <p className="flex items-center gap-1.5 text-sm text-orange-50 mt-1">
                <span className="inline-flex h-7 items-center gap-1 rounded-full bg-white/20 px-2.5 text-xs font-semibold">
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-90" />
                  {table.name}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={callStaff}
              disabled={callingStaff}
              className="shrink-0 mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 transition hover:bg-white/30 disabled:opacity-50 active:scale-95"
              title="Gọi nhân viên"
            >
              <Bell className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
            {(
              [
                { id: 'menu' as const, label: 'Thực đơn', Icon: Coffee },
                { id: 'orders' as const, label: 'Đơn của tôi', Icon: ClipboardList },
                { id: 'feedback' as const, label: 'Góp ý', Icon: MessageSquareText },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex shrink-0 snap-start items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                  tab === id
                    ? 'bg-white text-orange-600 shadow-md'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {tab === 'menu' && (
          <>
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Tìm món, mô tả…"
                className="w-full rounded-2xl border border-orange-100/80 bg-white/90 py-3 pl-10 pr-4 text-sm shadow-sm shadow-orange-900/5 outline-none ring-orange-400/0 transition focus:border-orange-300 focus:ring-4 focus:ring-orange-400/15"
              />
            </div>

            <div className="mb-4 rounded-2xl border border-orange-100/80 bg-white/90 p-3 shadow-sm shadow-orange-900/[0.04]">
              <div className="relative" ref={catDropdownRef}>
                <button
                  type="button"
                  onClick={() => setCatDropdownOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50/70 via-white to-amber-50/70 py-2.5 pl-3 pr-3 text-sm font-semibold text-gray-700 shadow-sm outline-none transition hover:border-orange-300 focus:border-orange-300 focus:ring-4 focus:ring-orange-400/15"
                >
                  <span className="truncate">
                    {filterCat === 'all' ? 'Tất cả danh mục' : filterCat}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-orange-400 transition-transform ${
                      catDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {catDropdownOpen && (
                  <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl shadow-orange-900/10">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterCat('all');
                        setCatDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition ${
                        filterCat === 'all'
                          ? 'bg-orange-50 font-semibold text-orange-700'
                          : 'hover:bg-orange-50/50 text-gray-700'
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
                          onClick={() => {
                            setFilterCat(cat);
                            setCatDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition ${
                            filterCat === cat
                              ? 'bg-orange-50 font-semibold text-orange-700'
                              : 'hover:bg-orange-50/50 text-gray-700'
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

            <div className="grid grid-cols-2 gap-3">
              {visibleMenu.map((item) => {
                const inCart = cart.find((c) => c.menuItem.id === item.id && !item.drink);
                const qDrink = item.drink ? qtyForMenuItem(item.id) : 0;
                const { prefix, amount } = displayMenuPrice(item);
                const canOrder = item.available;

                return (
                  <article
                    key={item.id}
                    className={`group flex flex-col overflow-hidden rounded-2xl border border-white/90 bg-white/95 shadow-md shadow-orange-900/[0.06] transition ${
                      canOrder ? '' : 'opacity-[0.72]'
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-35 select-none">☕</div>
                      )}
                      {!canOrder && (
                        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50 backdrop-blur-[2px]">
                          <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white">Tạm hết</span>
                        </div>
                      )}
                      <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
                        {item.badgeNew && (
                          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                            Mới
                          </span>
                        )}
                        {item.badgeBestSeller && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                            Bán chạy
                          </span>
                        )}
                      </div>
                      {item.drink && canOrder && (
                        <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-orange-700 shadow-sm ring-1 ring-orange-100">
                          Size & topping
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-gray-900">{item.name}</h3>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{item.description}</p>
                      ) : null}
                      <div className="mt-auto flex items-end justify-between gap-2 border-t border-orange-50/80 pt-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Giá</p>
                          <p className="text-base font-bold text-orange-600">
                            <span className="text-xs font-semibold text-orange-500/90">{prefix}</span>
                            {formatPrice(amount)}
                          </p>
                        </div>
                        {item.drink ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            {qDrink > 0 && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold tabular-nums text-orange-700">
                                ×{qDrink}
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={!canOrder}
                              onClick={() => addToCart(item)}
                              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Chọn size & topping"
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                        ) : inCart ? (
                          <div className="flex items-center gap-1 rounded-xl bg-orange-50 p-0.5 ring-1 ring-orange-100">
                            <button
                              type="button"
                              onClick={() => updateQty(inCart.key, -1)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm transition active:scale-95"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-gray-800">{inCart.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(inCart.key, 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm transition active:scale-95"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!canOrder}
                            onClick={() => addToCart(item)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
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
              <div className="rounded-2xl border border-dashed border-orange-200 bg-white/60 py-14 text-center text-gray-400">
                <Coffee className="mx-auto mb-3 h-12 w-12 text-orange-200" />
                <p className="text-sm font-medium text-gray-500">Không có món phù hợp</p>
                <p className="mt-1 text-xs text-gray-400">Thử đổi danh mục hoặc từ khóa tìm kiếm</p>
              </div>
            )}
          </>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Đơn của bạn</h2>
              <p className="mt-0.5 text-xs text-gray-500">Chỉ hiển thị đơn đặt từ điện thoại này</p>
            </div>
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-orange-100 bg-white/80 py-14 text-center text-gray-400 shadow-sm">
                <ClipboardList className="mx-auto mb-3 h-12 w-12 text-orange-200" />
                <p className="text-sm font-medium text-gray-500">Chưa có đơn nào</p>
                <p className="mt-1 text-xs text-gray-400">Đặt món ở tab Thực đơn nhé</p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-orange-100/80 bg-white/95 shadow-md shadow-orange-900/[0.04]"
                >
                  <div className="flex items-center justify-between border-b border-orange-50 bg-orange-50/40 px-4 py-3">
                    <span className="text-sm font-bold text-gray-800">Đơn #{order.id}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <div className="space-y-2 px-4 py-3">
                    {order.orderItems.map((oi, idx) => (
                      <div key={idx} className="flex justify-between gap-3 text-sm">
                        <span className="leading-snug text-gray-700">
                          {oi.menuItemName}
                          {formatOrderItemExtras(oi)} ×{oi.quantity}
                        </span>
                        <span className="shrink-0 font-semibold text-gray-600">{formatPrice(oi.subtotal || 0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-orange-50 bg-stone-50/50 px-4 py-3">
                    <span className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                    <span className="text-base font-bold text-orange-600">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'feedback' && (
          <div className="space-y-4 rounded-2xl border border-orange-100 bg-white/95 p-5 shadow-md shadow-orange-900/[0.04]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Góp ý cho quán</h2>
                <p className="mt-0.5 text-sm text-gray-500">Ý kiến của bạn giúp chúng tôi phục vụ tốt hơn.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <input
                value={feedback.customerName}
                onChange={(e) => setFeedback((prev) => ({ ...prev, customerName: e.target.value }))}
                placeholder="Họ và tên *"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-400/15"
              />
              <input
                value={feedback.customerPhone}
                onChange={(e) => setFeedback((prev) => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="Số điện thoại *"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-400/15"
              />
              <input
                type="email"
                value={feedback.customerEmail}
                onChange={(e) => setFeedback((prev) => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="Email *"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-400/15"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Đánh giá *</label>
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFeedback((prev) => ({ ...prev, rating: s }))}
                    className="rounded-lg p-1.5 transition hover:bg-amber-50"
                    title={`${s} sao`}
                  >
                    <Star
                      className={`h-7 w-7 ${s <= feedback.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-200'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={feedback.content}
              onChange={(e) => setFeedback((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Nội dung góp ý *"
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-400/15"
              rows={4}
            />
            <div className="text-right text-xs text-gray-400">
              {feedback.content.length}/{MAX_FEEDBACK_CONTENT}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Ảnh đính kèm (tuỳ chọn)</label>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50/50 p-4 text-sm text-gray-600 transition hover:bg-orange-50">
                <ImagePlus className="h-4 w-4 text-orange-500" />
                <span>{feedback.images?.length ? `Đã chọn ${feedback.images.length} ảnh` : 'Chọn ảnh (tối đa 5MB/ảnh)'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => setFeedback((prev) => ({ ...prev, images: Array.from(e.target.files || []) }))}
                />
              </label>
              {(feedback.images || []).length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(feedback.images || []).map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      <img src={feedbackPreviewUrls[idx]} alt={file.name} className="h-20 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(idx)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/75"
                        title="Xóa ảnh"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={submitFeedback}
              disabled={submittingFeedback}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submittingFeedback ? 'Đang gửi…' : 'Gửi góp ý'}
            </button>
          </div>
        )}
      </div>

      {/* Giỏ hàng — nút nổi */}
      {cart.length > 0 && !showCart && (
        <button
          type="button"
          onClick={() => setShowCart(true)}
          className="fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-white/30 bg-gradient-to-r from-orange-500 to-amber-500 py-3 pl-5 pr-5 text-white shadow-xl shadow-orange-600/35 transition active:scale-[0.98]"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-orange-600 ring-2 ring-orange-500">
              {cartCount}
            </span>
          </div>
          <span className="font-bold tabular-nums">{formatPrice(vat.grossAmount)}</span>
          <span className="text-orange-100">·</span>
          <span className="text-sm font-semibold text-orange-50">Giỏ hàng</span>
        </button>
      )}

      {/* Sheet giỏ hàng */}
      {showCart && (
        <div className="fixed inset-0 z-[210] flex flex-col">
          <button
            type="button"
            aria-label="Đóng giỏ hàng"
            className="min-h-0 flex-1 bg-stone-900/50 backdrop-blur-[2px]"
            onClick={() => setShowCart(false)}
          />
          <div className="max-h-[85dvh] flex flex-col rounded-t-3xl border-t border-orange-100 bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
            <div className="flex justify-center pt-2">
              <span className="h-1 w-10 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between border-b border-orange-50 px-4 py-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Giỏ hàng</h3>
                <p className="text-xs text-gray-500">{cartCount} món · Bàn {table.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCart(false)}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
              {cart.map((c) => {
                const lineUnit = unitPriceWithDrinkOptions(c.menuItem, c.selectedSizeCode, c.selectedToppingCodes);
                const sizeLabel = c.menuItem.drinkSizes?.find((s) => s.code === c.selectedSizeCode)?.label;
                const extras =
                  c.menuItem.drink && (sizeLabel || (c.selectedToppingCodes?.length ?? 0) > 0)
                    ? formatOrderItemExtras({
                        selectedSizeLabel: sizeLabel,
                        selectedToppings: (c.selectedToppingCodes || [])
                          .map((code: string) => {
                            const t = c.menuItem.drinkToppings?.find((x) => x.code === code);
                            return t ? { label: t.label } : null;
                          })
                          .filter(Boolean) as { label: string }[],
                      })
                    : '';
                return (
                  <div key={c.key} className="flex items-center gap-3 rounded-xl border border-orange-50 bg-orange-50/30 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {c.menuItem.name}
                        {extras ? <span className="block text-xs font-normal text-gray-500">{extras.trim()}</span> : null}
                      </p>
                      <p className="mt-1 text-sm font-bold text-orange-600">{formatPrice(lineUnit)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button type="button" onClick={() => removeFromCart(c.key)} className="text-xs font-semibold text-red-500 hover:underline">
                        Xóa
                      </button>
                      <div className="flex items-center gap-1 rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-orange-100">
                        <button
                          type="button"
                          onClick={() => updateQty(c.key, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 active:scale-95"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums">{c.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(c.key, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú: ít đá, không đường…"
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-400/15"
                  rows={2}
                />
              </div>
            </div>
            <div className="border-t border-orange-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span className="font-medium text-gray-800">{formatPrice(vat.netAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>VAT ({taxPolicy.vatRatePercent}%)</span>
                  <span className="font-medium text-gray-800">{formatPrice(vat.vatAmount)}</span>
                </div>
              </div>
              <div className="mt-3 flex justify-between text-lg font-bold">
                <span className="text-gray-800">Tổng thanh toán</span>
                <span className="text-orange-600">{formatPrice(vat.grossAmount)}</span>
              </div>
              <button
                type="button"
                onClick={placeOrder}
                disabled={submitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition active:scale-[0.99] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Đang gửi…' : 'Gửi đơn cho quán'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
