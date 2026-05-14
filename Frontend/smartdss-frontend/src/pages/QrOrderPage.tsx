import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/coffee-theme.css';
import { qrService } from '@/services/qrService';
import { publicConfigService } from '@/services/publicConfigService';
import type { MenuItem, Order, DiningTable, QrDiscountPreview, QrFeedbackForm, TaxPolicy } from '@/types';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { calculateVatBreakdown, drinkCartLineKey, unitPriceWithDrinkOptions } from '@/utils/helpers';
import DrinkCustomizeModal from '@/components/DrinkCustomizeModal';
import { getOrCreateQrClientSessionId } from '@/utils/qrClientSession';
import QrPageHeader from '@/components/qr-order/QrPageHeader';
import QrMenuPanel from '@/components/qr-order/QrMenuPanel';
import QrOrdersPanel from '@/components/qr-order/QrOrdersPanel';
import QrInvoicePanel from '@/components/qr-order/QrInvoicePanel';
import QrTelegramPanel from '@/components/qr-order/QrTelegramPanel';
import QrFeedbackPanel from '@/components/qr-order/QrFeedbackPanel';
import QrFloatingCartButton from '@/components/qr-order/QrFloatingCartButton';
import QrCartSheet from '@/components/qr-order/QrCartSheet';
import type { CartItem, QrTab } from '@/components/qr-order/types';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  PREPARING: 'Đang pha chế',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-[rgba(228,172,92,0.2)] text-(--coffee-primary) ring-1 ring-[rgba(228,172,92,0.55)]',
  PREPARING: 'bg-[rgba(111,78,55,0.14)] text-(--coffee-dark) ring-1 ring-[rgba(111,78,55,0.28)]',
  COMPLETED: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80',
  CANCELLED: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200/80',
};
const MAX_FEEDBACK_CONTENT = 2000;
const QR_CUSTOMER_PHONE_KEY = 'smartdss_qr_customer_phone';
const CUSTOMER_PHONE_REGEX = /^[+0-9][0-9]{8,19}$/;

function normalizeCustomerPhone(value: string): string {
  return value.replace(/\s+/g, '').trim();
}

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
  const [customerPhone, setCustomerPhone] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [showPhonePrompt, setShowPhonePrompt] = useState(true);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<QrTab>('menu');
  const [showCart, setShowCart] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [callingStaff, setCallingStaff] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackPreviewUrls, setFeedbackPreviewUrls] = useState<string[]>([]);
  const [taxPolicy, setTaxPolicy] = useState<TaxPolicy>({ vatRatePercent: 8, priceIncludesVat: true });
  const [discountPreview, setDiscountPreview] = useState<QrDiscountPreview | null>(null);
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
  /** Lưu trạng thái đơn hàng trước đó để phát hiện thay đổi trạng thái */
  const prevOrderStatusRef = useRef<Record<number, string>>({});
  /** Thông báo nổi bật khi món hoàn thành */
  const [orderReadyNotif, setOrderReadyNotif] = useState<{ orderId: number; itemNames: string[] } | null>(null);
  /** Thông báo khi bắt đầu pha chế */
  const [preparingNotif, setPreparingNotif] = useState<{ orderId: number } | null>(null);
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
    const normalizedPhone = normalizeCustomerPhone(customerPhone);
    const hasValidPhone = CUSTOMER_PHONE_REGEX.test(normalizedPhone);
    if (!token || (!hasValidPhone && !clientSessionId)) {
      setOrders([]);
      return;
    }
    try {
      const res = await qrService.getOrders(token, {
        customerPhone: hasValidPhone ? normalizedPhone : undefined,
        sessionId: clientSessionId || undefined,
      });
      const raw = res.data.data ?? [];
      setOrders(raw);
    } catch {
      /* ignore */
    }
  }, [token, customerPhone, clientSessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const map: Record<number, string> = {};
    orders.forEach((order) => {
      map[order.id] = order.status;
    });
    prevOrderStatusRef.current = map;
  }, [orders]);

  useEffect(() => {
    const savedPhone = localStorage.getItem(QR_CUSTOMER_PHONE_KEY);
    if (savedPhone) {
      setCustomerPhone(savedPhone);
      if (CUSTOMER_PHONE_REGEX.test(normalizeCustomerPhone(savedPhone))) {
        setShowPhonePrompt(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!showPhonePrompt) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [showPhonePrompt]);

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
        const normalizedPhone = normalizeCustomerPhone(customerPhone);
        const matchesPhone = CUSTOMER_PHONE_REGEX.test(normalizedPhone) && data.customerPhone === normalizedPhone;
        const matchesSession = !!clientSessionId && data.qrClientSessionId === clientSessionId;
        if (!matchesPhone && !matchesSession) {
          return;
        }
        setOrders((prev) => {
          const exists = prev.find((o) => o.id === data.id);
          const prevStatus = prevOrderStatusRef.current[data.id] || exists?.status;

          if (prevStatus !== data.status) {
            if (data.status === 'COMPLETED') {
              const itemNames = (data.orderItems || []).map((oi) => oi.menuItemName).filter((n): n is string => !!n);
              setOrderReadyNotif({ orderId: data.id, itemNames });
            } else if (data.status === 'PREPARING') {
              setPreparingNotif({ orderId: data.id });
            } else if (data.status === 'CANCELLED') {
              toast.error(`Đơn #${data.id} đã được hủy`, { duration: 6000 });
            }
          }

          // Cập nhật map trạng thái
          prevOrderStatusRef.current = { ...prevOrderStatusRef.current, [data.id]: data.status };

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
    [loadOrders, table, tab, customerPhone, clientSessionId],
  );

  useEffect(() => {
    if (tab === 'orders' || tab === 'invoice') loadOrders();
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

  useEffect(() => {
    if (!token || cartTotal <= 0) {
      setDiscountPreview(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const trimmedVoucherCode = voucherCode.trim();
      const trimmedCustomerPhone = customerPhone.trim();
      try {
        const res = await qrService.previewDiscount(token, {
          subtotal: cartTotal,
          voucherCode: trimmedVoucherCode || undefined,
          customerPhone: trimmedCustomerPhone || undefined,
        });
        if (!controller.signal.aborted) {
          setDiscountPreview(res.data.data);
        }
      } catch {
        if (!controller.signal.aborted) {
          if (!trimmedVoucherCode) {
            setDiscountPreview(null);
            return;
          }

          try {
            const calendarRes = await qrService.previewDiscount(token, {
              subtotal: cartTotal,
              customerPhone: trimmedCustomerPhone || undefined,
            });
            if (!controller.signal.aborted) {
              setDiscountPreview({
                ...calendarRes.data.data,
                voucherCode: undefined,
                voucherDiscountAmount: 0,
                voucherError: 'Mã voucher không hợp lệ hoặc không thể áp dụng',
              });
            }
          } catch {
            if (!controller.signal.aborted) {
              setDiscountPreview(null);
            }
          }
        }
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [token, cartTotal, voucherCode, customerPhone]);

  const confirmCustomerPhone = () => {
    const normalizedPhone = normalizeCustomerPhone(customerPhone);
    if (!CUSTOMER_PHONE_REGEX.test(normalizedPhone)) {
      toast.error('Số điện thoại không hợp lệ');
      return;
    }
    setCustomerPhone(normalizedPhone);
    localStorage.setItem(QR_CUSTOMER_PHONE_KEY, normalizedPhone);
    setShowPhonePrompt(false);
  };

  const placeOrder = async () => {
    if (!token || cart.length === 0) return;
    const normalizedPhone = normalizeCustomerPhone(customerPhone);
    const normalizedVoucherCode = voucherCode.trim().toUpperCase();
    if (!CUSTOMER_PHONE_REGEX.test(normalizedPhone)) {
      toast.error('Vui lòng nhập số điện thoại hợp lệ trước khi đặt món');
      setShowPhonePrompt(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await qrService.placeOrder(token, {
        clientSessionId,
        customerPhone: normalizedPhone,
        voucherCode: normalizedVoucherCode || undefined,
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
      localStorage.setItem(QR_CUSTOMER_PHONE_KEY, normalizedPhone);
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
      <div className="coffee-theme min-h-screen flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_20%_20%,rgba(228,172,92,0.2),transparent_38%),linear-gradient(180deg,#fffaf4_0%,#f5e6d3_55%,#fff8f1_100%)] px-4 text-center">
        <div className="coffee-soft-shadow flex h-12 w-12 items-center justify-center rounded-xl bg-white text-(--coffee-primary)">
          <Coffee className="h-6 w-6 animate-pulse" />
        </div>
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[rgba(111,78,55,0.22)] border-t-(--coffee-primary)" />
        <p className="text-sm text-[rgba(62,42,31,0.72)]">Đang chuẩn bị thực đơn cho bạn...</p>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="coffee-theme min-h-screen bg-[linear-gradient(180deg,#fffaf4_0%,#f5e6d3_60%,#fff8f1_100%)] p-6 text-(--coffee-dark)">
        <div className="mx-auto flex min-h-full max-w-sm items-center justify-center">
          <div className="coffee-soft-shadow w-full rounded-xl border border-[rgba(111,78,55,0.14)] bg-white/95 p-8 text-center backdrop-blur">
            <Coffee className="mx-auto mb-4 h-14 w-14 text-[rgba(111,78,55,0.45)]" />
            <h1 className="text-2xl font-semibold text-(--coffee-dark)">Không tìm thấy bàn</h1>
            <p className="mt-2 text-sm leading-relaxed text-[rgba(62,42,31,0.68)]">{error || 'Vui lòng quét lại mã QR để tiếp tục đặt món.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="coffee-theme min-h-screen bg-[linear-gradient(180deg,#fffaf4_0%,#f5e6d3_55%,#fff6ee_100%)] pb-28 text-(--coffee-dark)">
      <div className="pointer-events-none fixed -left-20 top-24 h-64 w-64 rounded-full bg-[rgba(228,172,92,0.16)] blur-3xl" />
      <div className="pointer-events-none fixed -right-20 top-104 h-72 w-72 rounded-full bg-[rgba(111,78,55,0.14)] blur-3xl" />

      {/* === THÔNG BÁO: MÓN ĐÃ HOÀN THÀNH === */}
      {orderReadyNotif && (
        <OrderReadyBanner
          orderId={orderReadyNotif.orderId}
          itemNames={orderReadyNotif.itemNames}
          onClose={() => setOrderReadyNotif(null)}
          onViewOrder={() => { setOrderReadyNotif(null); setTab('orders'); }}
        />
      )}

      {/* === THÔNG BÁO: ĐANG PHA CHẾ === */}
      {preparingNotif && (
        <PreparingBanner
          orderId={preparingNotif.orderId}
          onClose={() => setPreparingNotif(null)}
        />
      )}

      <DrinkCustomizeModal
        open={!!drinkModal}
        item={drinkModal?.item ?? null}
        initialSizeCode={drinkModal?.initialSizeCode}
        onClose={() => setDrinkModal(null)}
        onConfirm={addDrinkLineToCart}
        variant="qr"
      />

      <QrPageHeader
        tableName={table.name}
        tab={tab}
        onTabChange={setTab}
        onCallStaff={callStaff}
        callingStaff={callingStaff}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-5 sm:px-6">
        {tab === 'menu' && (
          <QrMenuPanel
            menuSearch={menuSearch}
            onMenuSearchChange={setMenuSearch}
            filterCat={filterCat}
            categories={categories}
            catDropdownOpen={catDropdownOpen}
            catDropdownRef={catDropdownRef}
            onToggleCategoryDropdown={() => setCatDropdownOpen((v) => !v)}
            onSelectCategory={(cat) => {
              setFilterCat(cat);
              setCatDropdownOpen(false);
            }}
            visibleMenu={visibleMenu}
            cart={cart}
            qtyForMenuItem={qtyForMenuItem}
            onAddToCart={addToCart}
            onUpdateQty={updateQty}
            formatPrice={formatPrice}
            getMenuPrice={displayMenuPrice}
          />
        )}

        {tab === 'orders' && (
          <QrOrdersPanel orders={orders} formatPrice={formatPrice} statusLabels={STATUS_LABELS} statusColors={STATUS_COLORS} />
        )}

        {tab === 'invoice' && token && (
          <QrInvoicePanel
            token={token}
            clientSessionId={clientSessionId}
            orders={orders}
            customerPhone={customerPhone}
            formatPrice={formatPrice}
            onReloadOrders={loadOrders}
          />
        )}

        {tab === 'telegram' && (
          <QrTelegramPanel customerPhone={customerPhone} />
        )}

        {tab === 'feedback' && (
          <QrFeedbackPanel
            feedback={feedback}
            setFeedback={setFeedback}
            feedbackPreviewUrls={feedbackPreviewUrls}
            maxFeedbackContent={MAX_FEEDBACK_CONTENT}
            submittingFeedback={submittingFeedback}
            onSubmitFeedback={submitFeedback}
            onRemoveSelectedImage={removeSelectedImage}
          />
        )}
      </div>

      {cart.length > 0 && !showCart && (
        <QrFloatingCartButton
          cartCount={cartCount}
          grossAmount={vat.grossAmount}
          formatPrice={formatPrice}
          onOpenCart={() => setShowCart(true)}
        />
      )}

      <QrCartSheet
        open={showCart}
        cart={cart}
        cartCount={cartCount}
        tableName={table.name}
        customerPhone={customerPhone}
        onCustomerPhoneChange={setCustomerPhone}
        voucherCode={voucherCode}
        onVoucherCodeChange={setVoucherCode}
        note={note}
        onNoteChange={setNote}
        vat={vat}
        discountPreview={discountPreview}
        onClose={() => setShowCart(false)}
        onRemoveFromCart={removeFromCart}
        onUpdateQty={updateQty}
        onPlaceOrder={placeOrder}
        submitting={submitting}
        formatPrice={formatPrice}
      />

      {!loading && !!table && showPhonePrompt && (
        <div className="fixed inset-0 z-220 flex items-center justify-center bg-[rgba(37,22,16,0.55)] px-4 backdrop-blur-[2px]">
          <div className="coffee-soft-shadow w-full max-w-sm rounded-2xl border border-[rgba(111,78,55,0.16)] bg-[linear-gradient(180deg,#fffdf9_0%,#fff6ee_100%)] p-5">
            <h2 className="text-lg font-semibold text-(--coffee-dark)">Nhập số điện thoại để đặt món</h2>
            <p className="mt-1 text-sm text-[rgba(62,42,31,0.7)]">Quán sẽ dùng số này để lưu thông tin đơn của bạn.</p>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmCustomerPhone();
                }
              }}
              placeholder="Ví dụ: 09xxxxxxxx"
              className="mt-4 w-full rounded-xl border border-[rgba(111,78,55,0.2)] bg-white px-3 py-2.5 text-sm outline-none focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.2)]"
            />
            <button
              type="button"
              onClick={confirmCustomerPhone}
              className="coffee-interactive mt-4 w-full rounded-xl bg-[linear-gradient(120deg,var(--coffee-primary),var(--coffee-dark))] py-2.5 text-sm font-semibold text-(--coffee-secondary)"
            >
              Tiếp tục
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENT: Thông báo món đã hoàn thành (COMPLETED)
// ============================================================
interface OrderReadyBannerProps {
  orderId: number;
  itemNames: string[];
  onClose: () => void;
  onViewOrder: () => void;
}

function OrderReadyBanner({ orderId, itemNames, onClose, onViewOrder }: OrderReadyBannerProps) {
  // Tự đóng sau 12 giây
  useEffect(() => {
    const t = setTimeout(onClose, 12000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
      {/* Overlay mờ */}
      <div
        className="absolute inset-0 bg-[rgba(37,22,16,0.52)] backdrop-blur-[3px]"
        onClick={onClose}
      />
      {/* Banner nội dung */}
      <div className="animate-slide-in-up relative w-full max-w-sm overflow-hidden rounded-3xl border border-[rgba(228,172,92,0.45)] bg-[linear-gradient(160deg,#fffdf9_0%,#fff6e8_60%,#fdefd4_100%)] shadow-[0_32px_80px_-20px_rgba(62,42,31,0.55)]">
        {/* Sóng trang trí trên cùng */}
        <div className="h-1.5 w-full bg-[linear-gradient(90deg,#e4ac5c,#6f4e37,#e4ac5c)]" />

        <div className="px-6 pb-6 pt-5">
          {/* Icon cốc cà phê với animation */}
          <div className="relative mb-4 flex justify-center">
            {/* Ripple hiệu ứng */}
            <span className="animate-ripple absolute inset-0 m-auto h-14 w-14 rounded-full bg-[rgba(228,172,92,0.3)]" />
            <span className="animate-ripple absolute inset-0 m-auto h-14 w-14 rounded-full bg-[rgba(228,172,92,0.2)]" style={{ animationDelay: '0.5s' }} />
            <div className="animate-pulse-glow relative flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#e4ac5c,#c47d2a)] text-white shadow-lg">
              <span className="animate-bounce-steam text-3xl">☕</span>
            </div>
          </div>

          {/* Tiêu đề */}
          <h2 className="text-center font-[Playfair_Display,serif] text-xl font-bold text-(--coffee-dark)">
            Món của bạn đã sẵn sàng! 🎉
          </h2>
          <p className="mt-1 text-center text-sm text-[rgba(62,42,31,0.68)]">
            Đơn <span className="font-semibold text-(--coffee-primary)">#{orderId}</span> — Vui lòng lấy món tại quầy
          </p>

          {/* Danh sách món */}
          {itemNames.length > 0 && (
            <div className="mt-3 rounded-xl border border-[rgba(228,172,92,0.3)] bg-[rgba(228,172,92,0.12)] px-4 py-2.5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[rgba(111,78,55,0.72)]">Các món đã làm xong</p>
              <ul className="space-y-0.5">
                {itemNames.slice(0, 5).map((name, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-(--coffee-dark)">
                    <span className="text-[rgba(228,172,92,0.9)]">✦</span> {name}
                  </li>
                ))}
                {itemNames.length > 5 && (
                  <li className="text-xs text-[rgba(62,42,31,0.55)]">...và {itemNames.length - 5} món khác</li>
                )}
              </ul>
            </div>
          )}

          {/* Nút hành động */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[rgba(111,78,55,0.22)] bg-white py-2.5 text-sm font-medium text-(--coffee-primary) transition hover:bg-[rgba(228,172,92,0.08)]"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={onViewOrder}
              className="coffee-interactive flex-1 rounded-xl bg-[linear-gradient(120deg,var(--coffee-accent),#c47d2a)] py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105 active:scale-95"
            >
              Xem đơn hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT: Thông báo đơn đang được pha chế (PREPARING)
// ============================================================
interface PreparingBannerProps {
  orderId: number;
  onClose: () => void;
}

function PreparingBanner({ orderId, onClose }: PreparingBannerProps) {
  // Tự đóng sau 6 giây
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-28 left-0 right-0 z-[250] flex justify-center px-4">
      <div className="animate-slide-in-up flex w-full max-w-sm items-center gap-3 rounded-2xl border border-[rgba(111,78,55,0.18)] bg-[linear-gradient(135deg,#fffdf9,#fff6e8)] px-4 py-3 shadow-[0_16px_48px_-16px_rgba(62,42,31,0.45)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(228,172,92,0.2)] text-xl">
          <span className="animate-spin" style={{ animationDuration: '2s', display: 'inline-block' }}>⚙️</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-(--coffee-dark)">Đang pha chế đơn #{orderId}</p>
          <p className="text-xs text-[rgba(62,42,31,0.62)]">Quán đang chuẩn bị món cho bạn, vui lòng chờ nhé!</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1 text-[rgba(62,42,31,0.45)] hover:bg-[rgba(111,78,55,0.1)] hover:text-(--coffee-dark) transition"
          aria-label="Đóng thông báo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
