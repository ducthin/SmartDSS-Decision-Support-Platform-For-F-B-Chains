import '@/styles/coffee-theme.css';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { menuService, categoryService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import { publicConfigService } from '@/services/publicConfigService';
import { paymentService } from '@/services/paymentService';
import { loyaltyService } from '@/services/loyaltyService';
import { voucherService } from '@/services/voucherService';
import { useDebounce } from '@/hooks/useDebounce';
import type { MenuItem, OrderForm, PageResponse, Category, TaxPolicy, PaymentStatus, LoyaltyAccount, Voucher, QrDiscountPreview } from '@/types';
import { ShoppingCart, Plus, Minus, Trash2, Send, Search, Printer, Download, QrCode, Wallet, CheckCircle2, ReceiptText, Clock3, Banknote, Filter } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { StatusBadge } from './DashboardPage';
import type { Order } from '@/types';
import { ORDER_STATUS } from '@/utils/constants';
import { calculateVatBreakdown, getApiErrorMessage, formatCurrency, drinkCartLineKey, unitPriceWithDrinkOptions, formatOrderItemExtras, formatOrderCreator } from '@/utils/helpers';
import DrinkCustomizeModal from '@/components/DrinkCustomizeModal';
import Pagination from '@/components/ui/Pagination';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey } from '@/utils/helpers';
import Modal from '@/components/ui/Modal';

const CATEGORY_ICONS: Record<string, string> = {
  'Cà phê': '☕', 'Trà': '🍵', 'Sinh tố': '🥤', 'Nước ép': '🧃', 'Bánh ngọt': '🍰',
};

const CUSTOMER_PHONE_REGEX = /^[+0-9][0-9]{8,19}$/;
const ITEM_NOTES_MARKER = '[ITEM_NOTES]';

type OnlineOrderParsedNote = {
  customer?: string;
  deliveryAddress?: string;
  customerNote?: string;
  itemNotesByIndex?: Record<number, string>;
};

function parseOnlineOrderNote(rawNote?: string | null): OnlineOrderParsedNote | null {
  if (!rawNote) return null;
  const note = rawNote.trim();
  if (!note) return null;

  const parts = note
    .split(' | ')
    .map((p) => p.trim())
    .filter(Boolean);

  let customer: string | undefined;
  let deliveryAddress: string | undefined;
  let customerNote: string | undefined;

  for (const part of parts) {
    const cleaned = part.replace(/^\[ONLINE\]\s*/i, '');
    if (cleaned.toLowerCase().startsWith('khách:')) {
      customer = cleaned.split(':')[1]?.trim() || '';
      continue;
    }
    if (cleaned.startsWith('Địa chỉ giao:')) {
      deliveryAddress = cleaned.split('Địa chỉ giao:')[1]?.trim() || '';
      continue;
    }
    if (cleaned.startsWith('Ghi chú:')) {
      customerNote = cleaned.split('Ghi chú:')[1]?.trim() || '';
      continue;
    }
  }

  let parsedItemNotesByIndex: Record<number, string> | undefined;
  if (customerNote) {
    const markerIndex = customerNote.indexOf(ITEM_NOTES_MARKER);
    if (markerIndex >= 0) {
      const before = customerNote.slice(0, markerIndex).trim();
      const after = customerNote.slice(markerIndex + ITEM_NOTES_MARKER.length).trim();
      const map: Record<number, string> = {};
      if (after) {
        const lines = after
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        for (const line of lines) {
          const eqIdx = line.indexOf('=');
          if (eqIdx <= 0) continue;
          const idxStr = line.slice(0, eqIdx).trim();
          const idx = Number.parseInt(idxStr, 10);
          const value = line.slice(eqIdx + 1).trim();
          if (!Number.isNaN(idx) && value) map[idx] = value;
        }
      }
      customerNote = before || undefined;
      if (Object.keys(map).length > 0) parsedItemNotesByIndex = map;
    }
  }

  const hasAny = !!(customer || deliveryAddress || customerNote || parsedItemNotesByIndex);
  return hasAny ? { customer, deliveryAddress, customerNote, itemNotesByIndex: parsedItemNotesByIndex } : null;
}

interface CartItem {
  key: string;
  menuItem: MenuItem;
  quantity: number;
  selectedSizeCode?: string;
  selectedToppingCodes?: string[];
}

interface PosDraftCartLine {
  menuItemId: number;
  quantity: number;
  selectedSizeCode?: string;
  selectedToppingCodes?: string[];
}

interface PosDraftState {
  selectedCat: number | null;
  customerPhone: string;
  voucherCode: string;
  selectedManualVoucherCodes: string[];
  selectedPersonalVoucherCodes: string[];
  cartLines: PosDraftCartLine[];
}

type PosPaymentMethod = 'CASH' | 'QR';
type CurrentPaymentData = {
  orderId: number;
  qrImageUrl: string;
  qrCode?: string;
  checkoutUrl?: string;
  provider?: 'PAYOS' | 'VIETQR';
  transferContent: string;
  amount: number;
  expiresAt: string;
};

export default function OrdersPage() {
  return (
    <div className="coffee-theme min-h-screen text-[var(--coffee-dark)]">
      {/* Ambient decorative blobs */}
      <div className="pointer-events-none fixed -left-32 top-1/4 h-96 w-96 rounded-full bg-[rgba(201,162,122,0.08)] blur-3xl" />
      <div className="pointer-events-none fixed -right-32 top-2/3 h-96 w-96 rounded-full bg-[rgba(107,80,64,0.07)] blur-3xl" />
      <OrdersContent />
    </div>
  );
}

function OrdersContent() {
  const [tab, setTab] = useState<'pos' | 'list'>('pos');
  const { user } = useAuth();
  const userRole = getRoleKey(user?.roleName);

  const canUsePOS = ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole);
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--coffee-text-primary)]">Đơn hàng</h1>
        </div>
        <div className="flex shrink-0 bg-[rgba(107,80,64,0.06)] border border-[rgba(107,80,64,0.22)] rounded-xl p-1 gap-0.5">
          {canUsePOS && (
            <button onClick={() => setTab('pos')} className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === 'pos' ? 'bg-[#6b5040] text-white shadow-sm' : 'text-[rgba(26,14,7,0.55)] hover:text-[#1a0e07] hover:bg-[rgba(107,80,64,0.08)]'}`}>POS</button>
          )}
          <button onClick={() => setTab('list')} className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === 'list' ? 'bg-[#6b5040] text-white shadow-sm' : 'text-[rgba(26,14,7,0.55)] hover:text-[#1a0e07] hover:bg-[rgba(107,80,64,0.08)]'}`}>Danh sách</button>
        </div>
      </div>
      {tab === 'pos' && canUsePOS ? <POSView /> : <OrderListView />}
    </div>
  );
}

const POS_DRAFT_STORAGE_KEY = 'smartdss_pos_draft_v1';

function POSView() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drinkModalItem, setDrinkModalItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [selectedManualVoucherCodes, setSelectedManualVoucherCodes] = useState<string[]>([]);
  const [selectedPersonalVoucherCodes, setSelectedPersonalVoucherCodes] = useState<string[]>([]);
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState('');
  const [taxPolicy, setTaxPolicy] = useState<TaxPolicy>({ vatRatePercent: 8, priceIncludesVat: true });
  const [discountPreview, setDiscountPreview] = useState<QrDiscountPreview | null>(null);
  const [loadingDiscountPreview, setLoadingDiscountPreview] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('CASH');
  const [paymentData, setPaymentData] = useState<CurrentPaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const [showCashConfirm, setShowCashConfirm] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [pendingDraftCartLines, setPendingDraftCartLines] = useState<PosDraftCartLine[] | null>(null);

  useEffect(() => {
    Promise.all([
      menuService.getAllNoPaging(),
      categoryService.getAllNoPaging(),
      publicConfigService.getTaxPolicy().catch(() => ({ data: { data: { vatRatePercent: 8, priceIncludesVat: true } } })),
    ]).then(([menuRes, catRes, taxRes]) => {
      setMenuItems((menuRes.data.data || []).filter((m: MenuItem) => m.available));
      setCategories(catRes.data.data || []);
      if (taxRes?.data?.data) {
        setTaxPolicy(taxRes.data.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_DRAFT_STORAGE_KEY);
      if (!raw) {
        setDraftHydrated(true);
        return;
      }
      const draft = JSON.parse(raw) as PosDraftState;
      setSelectedCat(typeof draft.selectedCat === 'number' ? draft.selectedCat : null);
      setCustomerPhone(draft.customerPhone || '');
      setVoucherCode(draft.voucherCode || '');
      setSelectedManualVoucherCodes(Array.isArray(draft.selectedManualVoucherCodes) ? draft.selectedManualVoucherCodes : []);
      setSelectedPersonalVoucherCodes(Array.isArray(draft.selectedPersonalVoucherCodes) ? draft.selectedPersonalVoucherCodes : []);
      setPendingDraftCartLines(Array.isArray(draft.cartLines) ? draft.cartLines : []);
    } catch {
      localStorage.removeItem(POS_DRAFT_STORAGE_KEY);
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!pendingDraftCartLines || pendingDraftCartLines.length === 0 || menuItems.length === 0) return;
    const restored: CartItem[] = [];
    for (const line of pendingDraftCartLines) {
      const item = menuItems.find((m) => m.id === line.menuItemId);
      if (!item) continue;
      const qty = Number.isFinite(line.quantity) ? Math.max(1, Math.floor(line.quantity)) : 1;
      const selectedSizeCode = line.selectedSizeCode || undefined;
      const selectedToppingCodes = Array.isArray(line.selectedToppingCodes) ? line.selectedToppingCodes : [];
      restored.push({
        key: drinkCartLineKey(item.id, selectedSizeCode, selectedToppingCodes),
        menuItem: item,
        quantity: qty,
        selectedSizeCode,
        selectedToppingCodes,
      });
    }
    if (restored.length > 0) {
      setCart(restored);
    }
    setPendingDraftCartLines(null);
  }, [pendingDraftCartLines, menuItems]);

  useEffect(() => {
    if (!draftHydrated) return;
    const cartLines: PosDraftCartLine[] = cart.map((c) => ({
      menuItemId: c.menuItem.id,
      quantity: c.quantity,
      selectedSizeCode: c.selectedSizeCode,
      selectedToppingCodes: c.selectedToppingCodes || [],
    }));
    const draft: PosDraftState = {
      selectedCat,
      customerPhone,
      voucherCode,
      selectedManualVoucherCodes,
      selectedPersonalVoucherCodes,
      cartLines,
    };
    localStorage.setItem(POS_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draftHydrated, selectedCat, customerPhone, voucherCode, selectedManualVoucherCodes, selectedPersonalVoucherCodes, cart]);

  const filteredItems = selectedCat ? menuItems.filter((m) => m.categoryId === selectedCat) : menuItems;

  const addToCart = (item: MenuItem) => {
    if (item.drink) {
      setDrinkModalItem(item);
      return;
    }
    const key = drinkCartLineKey(item.id, undefined, []);
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) return prev.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { key, menuItem: item, quantity: 1 }];
    });
  };

  const addDrinkLineToCart = (sizeCode: string, toppingCodes: string[]) => {
    if (!drinkModalItem) return;
    const item = drinkModalItem;
    const key = drinkCartLineKey(item.id, sizeCode, toppingCodes);
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) return prev.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { key, menuItem: item, quantity: 1, selectedSizeCode: sizeCode, selectedToppingCodes: toppingCodes }];
    });
    setDrinkModalItem(null);
  };

  const updateQty = (lineKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.key === lineKey ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c))
        .filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (lineKey: string) => setCart((prev) => prev.filter((c) => c.key !== lineKey));

  const subtotal = cart.reduce(
    (s, c) => s + unitPriceWithDrinkOptions(c.menuItem, c.selectedSizeCode, c.selectedToppingCodes) * c.quantity,
    0,
  );
  const vat = calculateVatBreakdown(subtotal, taxPolicy.vatRatePercent, taxPolicy.priceIncludesVat);
  const debouncedPhone = useDebounce(customerPhone.trim(), 450);
  const debouncedVoucherCode = useDebounce(voucherCode.trim().toUpperCase(), 300);
  const debouncedSelectedManualVouchers = useDebounce(selectedManualVoucherCodes.join(','), 250);
  const debouncedSelectedPersonalVouchers = useDebounce(selectedPersonalVoucherCodes.join(','), 250);

  useEffect(() => {
    if (!debouncedPhone) {
      setLoyaltyAccount(null);
      setAvailableVouchers([]);
      setLoyaltyError('');
      return;
    }

    if (!CUSTOMER_PHONE_REGEX.test(debouncedPhone)) {
      setLoyaltyAccount(null);
      setAvailableVouchers([]);
      setLoyaltyError('SĐT chưa đúng định dạng để tra điểm');
      return;
    }

    let cancelled = false;
    setLoadingLoyalty(true);
    setLoyaltyError('');

    Promise.all([
      loyaltyService.getByPhone(debouncedPhone),
      voucherService.getAvailableForPhone(debouncedPhone).catch(() => ({ data: { data: [] as Voucher[] } })),
    ])
      .then(([res, voucherRes]) => {
        if (!cancelled) {
          setLoyaltyAccount(res.data.data);
          setAvailableVouchers(voucherRes.data.data || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoyaltyAccount(null);
          setAvailableVouchers([]);
          setLoyaltyError('Không thể lấy thông tin điểm');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingLoyalty(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedPhone]);

  useEffect(() => {
    const availableCodeSet = new Set((availableVouchers || []).map((v) => v.code.toUpperCase()));
    setSelectedPersonalVoucherCodes((prev) => prev.filter((code) => availableCodeSet.has(code)));
  }, [availableVouchers]);

  const parseVoucherCodes = (value: string): string[] =>
    value
      .split(/[,\s;]+/)
      .map((s) =>
        s
          .trim()
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/Đ/g, 'D'),
      )
      .filter(Boolean);

  const manualVoucherCodes = useMemo(() => parseVoucherCodes(voucherCode), [voucherCode]);

  useEffect(() => {
    setSelectedManualVoucherCodes((prev) => {
      const available = new Set(manualVoucherCodes);
      const kept = prev.filter((code) => available.has(code));
      const next = [...kept];
      manualVoucherCodes.forEach((code: string) => {
        if (!next.includes(code)) next.push(code);
      });
      return next;
    });
  }, [manualVoucherCodes]);

  const buildAppliedVoucherCodes = (): string[] => {
    return [...new Set([...selectedManualVoucherCodes, ...selectedPersonalVoucherCodes])];
  };

  useEffect(() => {
    if (subtotal <= 0) {
      setDiscountPreview(null);
      setLoadingDiscountPreview(false);
      return;
    }

    let cancelled = false;
    const normalizedPhone = debouncedPhone;
    const hasValidPhone = CUSTOMER_PHONE_REGEX.test(normalizedPhone);
    const safePhone = hasValidPhone ? normalizedPhone : undefined;
    const appliedVoucherCodes = [
      ...new Set([
        ...debouncedSelectedManualVouchers.split(',').filter(Boolean),
        ...debouncedSelectedPersonalVouchers.split(',').filter(Boolean),
      ]),
    ];

    setLoadingDiscountPreview(true);
    orderService
      .previewDiscount({
        subtotal,
        voucherCode: appliedVoucherCodes.length > 0 ? appliedVoucherCodes.join(',') : undefined,
        customerPhone: safePhone,
      })
      .then((res) => {
        if (!cancelled) {
          setDiscountPreview(res.data.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDiscountPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDiscountPreview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [subtotal, debouncedVoucherCode, debouncedPhone, debouncedSelectedManualVouchers, debouncedSelectedPersonalVouchers]);

  const totalDiscountAmount = discountPreview?.totalDiscountAmount || 0;
  const calendarDiscountAmount = discountPreview?.calendarDiscountAmount || 0;
  const voucherDiscountAmount = discountPreview?.voucherDiscountAmount || 0;
  const finalAmount = totalDiscountAmount > 0 ? (discountPreview?.finalAmount ?? vat.grossAmount) : vat.grossAmount;

  const openPaymentModal = (order: Order) => {
    setPaymentOrder(order);
    setPaymentMethod('CASH');
    setPaymentData(null);
    setPaymentStatus({ orderId: order.id, status: 'PENDING', paymentMethod: 'PENDING' });
    setShowCashConfirm(false);
  };

  const initQrPayment = async (order: Order) => {
    try {
      setRefreshingPayment(true);
      const res = await paymentService.initQr(order.id);
      const data = res.data.data;
      setPaymentData({
        orderId: data.orderId,
        qrImageUrl: data.qrImageUrl,
        qrCode: data.qrCode,
        checkoutUrl: data.checkoutUrl,
        provider: data.provider,
        transferContent: data.transferContent,
        amount: data.amount,
        expiresAt: data.expiresAt,
      });
      setPaymentStatus(data.paymentStatus);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không khởi tạo được QR thanh toán'));
      setPaymentData(null);
      setPaymentMethod('CASH');
    } finally {
      setRefreshingPayment(false);
    }
  };

  const selectPaymentMethod = async (method: PosPaymentMethod) => {
    if (!paymentOrder) return;
    if (method === 'QR') {
      setShowCashConfirm(false);
      setPaymentMethod('QR');
      if (!paymentData || paymentData.orderId !== paymentOrder.id) {
        await initQrPayment(paymentOrder);
      }
      return;
    }
    setShowCashConfirm(false);
    setPaymentMethod('CASH');
  };

  const refreshPaymentStatus = useCallback(async (orderId: number, silent = false) => {
    setRefreshingPayment(true);
    try {
      const res = await paymentService.getStatus(orderId);
      const status = res.data.data;
      setPaymentStatus(status);
      if (status.status === 'PAID') {
        toast.success(`Đơn #${orderId} đã thanh toán thành công`);
        setPaymentOrder(null);
        setPaymentData(null);
      } else if (!silent) {
        toast('Chưa nhận được thanh toán, vui lòng thử lại sau vài giây', { icon: '⏳' });
      }
      return status;
    } finally {
      setRefreshingPayment(false);
    }
  }, []);

  const confirmCashPayment = async () => {
    if (!paymentOrder) return;
    try {
      setRefreshingPayment(true);
      const res = await paymentService.markCashPaid(paymentOrder.id);
      setPaymentStatus(res.data.data);
      toast.success(`Đã ghi nhận thanh toán tiền mặt cho đơn #${paymentOrder.id}`);
      setShowCashConfirm(false);
      setPaymentOrder(null);
      setPaymentData(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xác nhận tiền mặt'));
    } finally {
      setRefreshingPayment(false);
    }
  };

  useEffect(() => {
    if (!paymentOrder || paymentMethod !== 'QR') return;
    const orderId = paymentOrder.id;
    const timer = window.setInterval(() => {
      refreshPaymentStatus(orderId, true).catch(() => {
        // Ignore polling transient errors.
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paymentOrder, paymentMethod, refreshPaymentStatus]);

  useEffect(() => {
    if (paymentStatus?.status === 'PAID') {
      setShowCashConfirm(false);
      setPaymentOrder(null);
      setPaymentData(null);
    }
  }, [paymentStatus]);

  useEffect(() => {
    if (!paymentOrder) {
      setShowCashConfirm(false);
    }
  }, [paymentOrder]);


  const placeOrder = async () => {
    if (cart.length === 0) return toast.error('Giỏ hàng trống');
    setSubmitting(true);
    const normalizedPhone = customerPhone.trim();
    const normalizedVoucherCode = buildAppliedVoucherCodes().join(',');
    const orderForm: OrderForm = {
      customerPhone: normalizedPhone || undefined,
      voucherCode: normalizedVoucherCode || undefined,
      orderItems: cart.map((c) => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        ...(c.menuItem.drink && c.selectedSizeCode
          ? { selectedSizeCode: c.selectedSizeCode, selectedToppingCodes: c.selectedToppingCodes || [] }
          : {}),
      })),
    };
    let createdOrder: Order | null = null;
    try {
      createdOrder = (await orderService.create(orderForm)).data.data;
      await orderService.updateStatus(createdOrder.id, ORDER_STATUS.PREPARING);
      const completedOrder = (await orderService.updateStatus(createdOrder.id, ORDER_STATUS.COMPLETED)).data.data;

      toast.success('Đặt hàng thành công, mời thanh toán');
      setCart([]);
      setCustomerPhone('');
      setVoucherCode('');
      setSelectedManualVoucherCodes([]);
      setSelectedPersonalVoucherCodes([]);
      localStorage.removeItem(POS_DRAFT_STORAGE_KEY);
      openPaymentModal(completedOrder);
    } catch (error) {
      if (createdOrder) {
        toast.error(getApiErrorMessage(error, `Đã tạo đơn #${createdOrder.id} nhưng chưa thể tự động chuyển hoàn thành, vui lòng kiểm tra tab Danh sách`));
      } else {
        toast.error(getApiErrorMessage(error, 'Lỗi đặt hàng'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9a27a]" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <DrinkCustomizeModal
        open={!!drinkModalItem}
        item={drinkModalItem}
        onClose={() => setDrinkModalItem(null)}
        onConfirm={addDrinkLineToCart}
      />
      {/* Menu */}
      <div className="lg:col-span-2 space-y-4">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedCat(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedCat === null ? 'bg-[#6b5040] text-white' : 'bg-[rgba(107,80,64,0.07)] text-[rgba(26,14,7,0.6)] hover:bg-[rgba(107,80,64,0.12)]'}`}>
            Tất cả
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedCat === cat.id ? 'bg-[#6b5040] text-white' : 'bg-[rgba(107,80,64,0.07)] text-[rgba(26,14,7,0.6)] hover:bg-[rgba(107,80,64,0.12)]'}`}>
              {CATEGORY_ICONS[cat.name] || '🍽️'} {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <button key={item.id} onClick={() => addToCart(item)}
              className="bg-white rounded-xl border border-[rgba(107,80,64,0.1)] p-4 text-left hover:shadow-md hover:border-[#c9a27a] transition group">
              <div className="text-2xl mb-2">{CATEGORY_ICONS[item.categoryName] || '🍽️'}</div>
              <h3 className="font-medium text-sm truncate text-[#1a0e07]">{item.name}</h3>
              <p className="text-xs text-[rgba(26,14,7,0.4)] truncate">{item.categoryName}</p>
              <p className="text-[#6b5040] font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <p className="col-span-full text-center text-[rgba(26,14,7,0.3)] py-8">Không có món nào</p>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-2xl border border-[rgba(107,80,64,0.1)] p-4 h-fit sticky top-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart size={20} className="text-[#6b5040]" />
          <h2 className="font-semibold text-[#1a0e07] flex-1">Giỏ hàng ({cart.length})</h2>
        </div>

        {/* Danh sách món trong giỏ */}
        {cart.length === 0 ? (
          <p className="text-sm text-[rgba(26,14,7,0.3)] text-center py-6">Chọn món để thêm vào giỏ</p>
        ) : (
          <div className="space-y-3">
            {cart.map((c) => {
              const lineUnit = unitPriceWithDrinkOptions(c.menuItem, c.selectedSizeCode, c.selectedToppingCodes);
              const sizeLabel = c.menuItem.drinkSizes?.find((s) => s.code === c.selectedSizeCode)?.label;
              const extras =
                c.menuItem.drink && (sizeLabel || (c.selectedToppingCodes?.length ?? 0) > 0)
                  ? formatOrderItemExtras({
                    selectedSizeLabel: sizeLabel,
                    selectedToppings: (c.selectedToppingCodes || [])
                      .map((code) => {
                        const t = c.menuItem.drinkToppings?.find((x) => x.code === code);
                        return t ? { label: t.label } : null;
                      })
                      .filter(Boolean) as { label: string }[],
                  })
                  : '';
              return (
                <div key={c.key} className="flex items-center gap-2 p-2 bg-[rgba(253,247,240,0.7)] rounded-xl border border-[rgba(107,80,64,0.06)]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[#1a0e07]">
                      {c.menuItem.name}
                      {extras && <span className="text-[rgba(26,14,7,0.45)] font-normal">{extras}</span>}
                    </p>
                    <p className="text-xs text-[rgba(26,14,7,0.45)]">{formatCurrency(lineUnit)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateQty(c.key, -1)} className="p-1 rounded-lg hover:bg-[rgba(107,80,64,0.1)] transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-[#1a0e07]">{c.quantity}</span>
                    <button type="button" onClick={() => updateQty(c.key, 1)} className="p-1 rounded-lg hover:bg-[rgba(107,80,64,0.1)] transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button type="button" onClick={() => removeFromCart(c.key)} className="p-1 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Ưu đãi – SĐT & Voucher */}
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="pos-customer-phone" className="mb-1 block text-xs font-medium text-[rgba(26,14,7,0.6)]">SĐT khách hàng (tùy chọn)</label>
            <input id="pos-customer-phone" type="tel" inputMode="tel" autoComplete="tel"
              value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Ví dụ: 09xxxxxxxx"
              className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] px-3 py-2 text-sm outline-none transition focus:border-[#c9a27a]"
            />
            <p className="mt-1 text-xs text-[rgba(26,14,7,0.5)]">
              {loadingLoyalty ? 'Đang kiểm tra điểm tích lũy...'
                : loyaltyAccount
                  ? `Hạng ${loyaltyAccount.tier === 'VANG' ? 'Vàng' : loyaltyAccount.tier === 'BAC' ? 'Bạc' : 'Đồng'} • ${loyaltyAccount.pointsBalance.toLocaleString('vi-VN')} điểm • ${loyaltyAccount.monthlyOrderCount || 0} đơn/30 ngày`
                  : loyaltyError || 'Nhập SĐT để tra điểm khách hàng'}
            </p>
          </div>
          <div>
            <label htmlFor="pos-voucher-code" className="mb-1 block text-xs font-medium text-[rgba(26,14,7,0.6)]">Mã voucher (có thể nhập nhiều, cách nhau dấu phẩy)</label>
            <input id="pos-voucher-code" type="text" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)}
              placeholder="Ví dụ: KHAITRUONG10"
              className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] px-3 py-2 text-sm uppercase outline-none transition focus:border-[#c9a27a]"
            />
            {(voucherCode.trim() || selectedPersonalVoucherCodes.length > 0) && voucherDiscountAmount > 0 && (
              <p className="mt-1 text-xs text-[#c9a27a]">
                Đã áp dụng: <span className="font-semibold">{(discountPreview?.voucherCodes?.length ? discountPreview.voucherCodes : [discountPreview?.voucherCode, ...buildAppliedVoucherCodes()].filter(Boolean)).join(', ')}</span> · giảm {formatCurrency(voucherDiscountAmount)}
              </p>
            )}
            {(voucherCode.trim() || selectedPersonalVoucherCodes.length > 0) && discountPreview?.voucherError && (
              <p className="mt-1 text-xs text-[#d97706]">{discountPreview.voucherError}</p>
            )}
            {manualVoucherCodes.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs font-medium text-[rgba(26,14,7,0.55)]">Mã đã nhập</p>
                <div className="flex flex-wrap gap-1.5">
                  {manualVoucherCodes.map((code) => (
                    <button key={code} type="button"
                      onClick={() => setSelectedManualVoucherCodes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])}
                      className={`rounded-xl border px-2.5 py-1.5 text-xs transition ${selectedManualVoucherCodes.includes(code)
                          ? 'border-[#c9a27a] bg-[rgba(201,162,122,0.1)] text-[#6b5040]'
                          : 'border-[rgba(107,80,64,0.15)] bg-[rgba(107,80,64,0.04)] text-[rgba(26,14,7,0.6)] hover:bg-[rgba(107,80,64,0.08)]'
                        }`}>
                      <span className="font-semibold">{code}</span>
                      <span className="ml-1">{selectedManualVoucherCodes.includes(code) ? '✓' : '○'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {availableVouchers.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs font-medium text-[#c9a27a]">Voucher riêng cho khách</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableVouchers.map((voucher) => (
                    <button key={voucher.id} type="button"
                      onClick={() => { const code = voucher.code.toUpperCase(); setSelectedPersonalVoucherCodes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]); }}
                      className={`rounded-xl border px-2.5 py-1.5 text-xs transition ${selectedPersonalVoucherCodes.includes(voucher.code.toUpperCase())
                          ? 'border-[#c9a27a] bg-[rgba(201,162,122,0.1)] text-[#6b5040]'
                          : 'border-[rgba(107,80,64,0.15)] bg-[rgba(107,80,64,0.04)] text-[rgba(26,14,7,0.6)] hover:bg-[rgba(107,80,64,0.08)]'
                        }`}>
                      <span className="font-semibold">{voucher.code}</span>
                      <span className="ml-1">{voucher.discountType === 'PERCENT' ? `-${voucher.discountValue}%` : `-${formatCurrency(voucher.discountValue)}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {totalDiscountAmount > 0 && (
            <div className="rounded-xl border border-[#c9a27a] bg-[rgba(201,162,122,0.1)] px-3 py-2.5 text-sm text-[#6b5040]">
              <div className="flex justify-between font-semibold"><span>Tổng ưu đãi</span><span>-{formatCurrency(totalDiscountAmount)}</span></div>
              {calendarDiscountAmount > 0 && <p className="mt-1 text-xs text-[#c9a27a]">{discountPreview?.calendarDiscountLabel || 'Sự kiện'}: -{formatCurrency(calendarDiscountAmount)}</p>}
            </div>
          )}
        </div>

        {/* Tổng tiền & Đặt hàng */}
        <div className="border-t border-[rgba(107,80,64,0.08)] mt-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[rgba(26,14,7,0.5)]">Tạm tính</span>
            <span className="font-medium text-[rgba(26,14,7,0.7)]">{formatCurrency(vat.netAmount)}</span>
          </div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-[rgba(26,14,7,0.4)]">VAT ({taxPolicy.vatRatePercent}%)</span>
            <span className="text-[rgba(26,14,7,0.5)]">{formatCurrency(vat.vatAmount)}</span>
          </div>
          {totalDiscountAmount > 0 && (
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-[#c9a27a] text-xs">🎁 Ưu đãi đã áp</span>
              <span className="font-semibold text-[#6b5040]">-{formatCurrency(totalDiscountAmount)}</span>
            </div>
          )}
          {loadingDiscountPreview && (
            <div className="mb-2 rounded-xl bg-[rgba(107,80,64,0.05)] px-3 py-1.5 text-xs text-[rgba(26,14,7,0.4)]">Đang tính ưu đãi...</div>
          )}
          <div className="flex items-center justify-between mb-4 mt-2">
            <span className="font-semibold text-[#1a0e07]">Tổng thanh toán</span>
            <span className="text-xl font-bold text-[#6b5040]">{formatCurrency(finalAmount)}</span>
          </div>
          <button onClick={placeOrder} disabled={cart.length === 0 || submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#6b5040] text-white py-2.5 rounded-xl font-medium hover:brightness-110 disabled:opacity-50 transition">
            <Send size={18} /> {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
          </button>
        </div>
      </div>

      <Modal
        open={!!paymentOrder}
        onClose={() => {
          setPaymentOrder(null);
          setPaymentData(null);
        }}
        title={paymentOrder ? `Thanh toán đơn #${paymentOrder.id}` : 'Thanh toán'}
        maxWidth="max-w-lg"
      >
        {paymentOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm text-[rgba(26,14,7,0.7)]">
              <p>Bàn: <span className="font-medium">{paymentOrder.tableNumber || 'POS'}</span></p>
              <p>Giờ tạo: <span className="font-medium">{new Date(paymentOrder.createdAt).toLocaleString('vi-VN')}</span></p>
              <p className="col-span-2 font-semibold text-[#1a0e07]">Tổng thanh toán: {formatCurrency(paymentOrder.totalAmount)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { selectPaymentMethod('CASH').catch(() => { }); }}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${paymentMethod === 'CASH' ? 'bg-[#6b5040] text-white border-[#6b5040]' : 'bg-white text-[rgba(26,14,7,0.7)] border-[rgba(107,80,64,0.18)] hover:bg-[rgba(107,80,64,0.06)]'}`}
              >
                <span className="inline-flex items-center gap-1"><Wallet size={16} /> COD (tiền mặt)</span>
              </button>
              <button
                onClick={() => { selectPaymentMethod('QR').catch(() => { }); }}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${paymentMethod === 'QR' ? 'bg-[#6b5040] text-white border-[#6b5040]' : 'bg-white text-[rgba(26,14,7,0.7)] border-[rgba(107,80,64,0.18)] hover:bg-[rgba(107,80,64,0.06)]'}`}
              >
                <span className="inline-flex items-center gap-1"><QrCode size={16} /> Chuyển khoản (QR)</span>
              </button>
            </div>

            {paymentMethod === 'QR' && (
              <div className="py-1">
                <div className="mx-auto w-full max-w-95">
                  {paymentData?.qrCode ? (
                    <div className="flex justify-center">
                      <QRCodeSVG
                        value={paymentData.qrCode}
                        size={340}
                        level="M"
                        includeMargin
                        className="h-auto max-w-full"
                      />
                    </div>
                  ) : paymentData?.qrImageUrl ? (
                    <img src={paymentData.qrImageUrl} alt={`QR thanh toán đơn ${paymentOrder.id}`} className="w-full h-auto object-contain" />
                  ) : (
                    <div className="h-56 rounded-xl bg-[rgba(253,247,240,0.6)] border border-[rgba(107,80,64,0.1)] flex items-center justify-center text-sm text-[rgba(26,14,7,0.4)]">
                      Đang tải mã QR...
                    </div>
                  )}
                </div>
                {paymentData?.checkoutUrl && (
                  <div className="text-center mt-3">
                    <a
                      href={paymentData.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-medium"
                    >
                      Mở trang thanh toán PayOS
                    </a>
                  </div>
                )}
                <p className="text-xs text-[rgba(26,14,7,0.45)] text-center mt-2">
                  Khách quét QR để chuyển khoản đúng số tiền của đơn.
                </p>
                <p className="text-xs text-[rgba(26,14,7,0.45)] text-center mt-1">
                  Nội dung CK: <span className="font-medium text-[#6b5040]">{paymentData?.transferContent || `BILL-${paymentOrder.id}`}</span>
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowCashConfirm(false); setPaymentOrder(null); setPaymentData(null); }}
                className="px-3 py-2 rounded-xl bg-[rgba(107,80,64,0.07)] text-[rgba(26,14,7,0.7)] hover:bg-[rgba(107,80,64,0.12)] transition-colors"
              >
                Đóng
              </button>
              {paymentMethod === 'CASH' ? (
                <button
                  onClick={() => setShowCashConfirm(true)}
                  disabled={refreshingPayment}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:brightness-110 disabled:opacity-60 transition-all"
                >
                  <CheckCircle2 size={16} /> {refreshingPayment ? 'Đang xử lý...' : 'Xác nhận đã thu tiền mặt'}
                </button>
              ) : (
                <button
                  onClick={() => refreshPaymentStatus(paymentOrder.id).catch(() => toast.error('Không thể kiểm tra trạng thái'))}
                  disabled={refreshingPayment}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#6b5040] text-white hover:brightness-110 disabled:opacity-60 transition-all"
                >
                  <CheckCircle2 size={16} /> {refreshingPayment ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showCashConfirm && !!paymentOrder}
        onClose={() => setShowCashConfirm(false)}
        title="Xác nhận thanh toán tiền mặt"
        maxWidth="max-w-md"
      >
        {paymentOrder && (
          <div className="space-y-4">
            <p className="text-sm text-[rgba(26,14,7,0.7)]">
              Xác nhận đã thu tiền mặt cho đơn <span className="font-semibold">#{paymentOrder.id}</span>?
            </p>
            <div className="rounded-xl border border-[rgba(201,162,122,0.3)] bg-[rgba(201,162,122,0.08)] px-3 py-2 text-sm text-[#7a5c3e]">
              <p>Bàn: <span className="font-semibold">{paymentOrder.tableNumber || 'POS'}</span></p>
              <p>Số tiền: <span className="font-semibold">{formatCurrency(paymentOrder.totalAmount)}</span></p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCashConfirm(false)}
                className="px-3 py-2 rounded-xl bg-[rgba(107,80,64,0.07)] text-[rgba(26,14,7,0.7)] hover:bg-[rgba(107,80,64,0.12)] transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => { confirmCashPayment().catch(() => { }); }}
                disabled={refreshingPayment}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:brightness-110 disabled:opacity-60 transition-all"
              >
                <Wallet size={16} /> {refreshingPayment ? 'Đang xử lý...' : 'Xác nhận thu tiền'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function OrderListView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<Order> | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'ONLINE' | 'INSTORE'>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [taxPolicy, setTaxPolicy] = useState<TaxPolicy>({ vatRatePercent: 8, priceIncludesVat: true });
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const [loadingBillId, setLoadingBillId] = useState<number | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('CASH');
  const [paymentData, setPaymentData] = useState<CurrentPaymentData | null>(null);
  const [paymentStatusByOrder, setPaymentStatusByOrder] = useState<Record<number, PaymentStatus>>({});
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const [showCashConfirm, setShowCashConfirm] = useState(false);
  const lastReloadRef = useRef(0);
  const { user } = useAuth();
  const userRole = getRoleKey(user?.roleName);
  const canPrepareOrComplete = ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole);
  const canCancel = ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole);
  const canSeeTaxBreakdown = ['ADMIN', 'MANAGER'].includes(userRole);

  const loadOrders = useCallback(() => {
    const keyword = orderSearch.trim() || undefined;
    orderService.getAll(page, 10, statusFilter || undefined, keyword, sourceFilter)
      .then((res) => {
        const data = res.data.data;
        setOrders(data.content);
        setPageData(data);
        const orderIds = (data.content || []).map((o) => o.id);
        if (orderIds.length > 0) {
          paymentService.getStatuses(orderIds)
            .then((payRes) => {
              const next: Record<number, PaymentStatus> = {};
              for (const item of payRes.data.data || []) {
                next[item.orderId] = item;
              }
              setPaymentStatusByOrder(next);
            })
            .catch(() => {
              // Keep existing status on transient errors.
            });
        } else {
          setPaymentStatusByOrder({});
        }
      })
      .catch(() => toast.error('Lỗi tải đơn hàng'))
      .finally(() => setLoading(false));
  }, [page, statusFilter, orderSearch, sourceFilter]);

  const handleSocketUpdate = useCallback((data?: Order) => {
    if (data && data.id) {
      const matchesFilter = !statusFilter || data.status === statusFilter;
      setOrders(prev => {
        const exists = prev.find(o => o.id === data.id);
        if (exists) {
          if (!matchesFilter) return prev.filter(o => o.id !== data.id);
          return prev.map(o => o.id === data.id ? data : o);
        }
        if (matchesFilter && page === 0) {
          return [data, ...prev.slice(0, 9)];
        }
        return prev;
      });
      const now = Date.now();
      // Keep pagination counters accurate, but avoid refetch storm.
      if (now - lastReloadRef.current > 5000) {
        lastReloadRef.current = now;
        loadOrders();
      }
      return;
    }

    // Missing payload fallback.
    const now = Date.now();
    if (now - lastReloadRef.current > 3000) {
      lastReloadRef.current = now;
      loadOrders();
    }
  }, [loadOrders, page, statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => {
    publicConfigService.getTaxPolicy()
      .then((res) => {
        if (res.data?.data) {
          setTaxPolicy(res.data.data);
        }
      })
      .catch(() => {
        // Keep fallback default tax policy.
      });
  }, []);
  useOrderSocket(handleSocketUpdate);

  const updateStatus = async (id: number, status: string) => {
    try {
      await orderService.updateStatus(id, status);
      toast.success('Cập nhật thành công');
      loadOrders();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi cập nhật'));
    }
  };

  const openBill = async (orderId: number) => {
    try {
      setLoadingBillId(orderId);
      const res = await orderService.getById(orderId);
      setBillOrder(res.data.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không tải được bill'));
    } finally {
      setLoadingBillId(null);
    }
  };

  const openPaymentModal = async (order: Order) => {
    setPaymentOrder(order);
    setPaymentMethod('CASH');
    setPaymentData(null);
    setShowCashConfirm(false);
  };

  const initQrPayment = async (order: Order) => {
    try {
      setRefreshingPayment(true);
      const res = await paymentService.initQr(order.id);
      const data = res.data.data;
      setPaymentData({
        orderId: data.orderId,
        qrImageUrl: data.qrImageUrl,
        qrCode: data.qrCode,
        checkoutUrl: data.checkoutUrl,
        provider: data.provider,
        transferContent: data.transferContent,
        amount: data.amount,
        expiresAt: data.expiresAt,
      });
      setPaymentStatusByOrder((prev) => ({
        ...prev,
        [data.orderId]: data.paymentStatus,
      }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không khởi tạo được QR thanh toán'));
      setPaymentData(null);
      setPaymentMethod('CASH');
    } finally {
      setRefreshingPayment(false);
    }
  };

  const selectPaymentMethod = async (method: PosPaymentMethod) => {
    if (!paymentOrder) return;
    if (method === 'QR') {
      setShowCashConfirm(false);
      setPaymentMethod('QR');
      if (!paymentData || paymentData.orderId !== paymentOrder.id) {
        await initQrPayment(paymentOrder);
      }
      return;
    }
    setShowCashConfirm(false);
    setPaymentMethod('CASH');
  };

  const refreshPaymentStatus = useCallback(async (orderId: number, silent = false) => {
    setRefreshingPayment(true);
    try {
      const res = await paymentService.getStatus(orderId);
      const status = res.data.data;
      setPaymentStatusByOrder((prev) => ({ ...prev, [orderId]: status }));
      if (status.status === 'PAID') {
        toast.success(`Đơn #${orderId} đã thanh toán thành công`);
        setPaymentOrder(null);
        setPaymentData(null);
        loadOrders();
      } else if (!silent) {
        toast('Chưa nhận được thanh toán, vui lòng thử lại sau vài giây', { icon: '⏳' });
      }
      return status;
    } finally {
      setRefreshingPayment(false);
    }
  }, [loadOrders]);

  const confirmCashPayment = async () => {
    if (!paymentOrder) return;
    try {
      setRefreshingPayment(true);
      const res = await paymentService.markCashPaid(paymentOrder.id);
      setPaymentStatusByOrder((prev) => ({ ...prev, [paymentOrder.id]: res.data.data }));
      toast.success(`Đã ghi nhận thanh toán tiền mặt cho đơn #${paymentOrder.id}`);
      setShowCashConfirm(false);
      setPaymentOrder(null);
      setPaymentData(null);
      loadOrders();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xác nhận tiền mặt'));
    } finally {
      setRefreshingPayment(false);
    }
  };

  useEffect(() => {
    if (!paymentOrder || paymentMethod !== 'QR') return;
    const orderId = paymentOrder.id;
    const timer = window.setInterval(() => {
      refreshPaymentStatus(orderId, true).catch(() => {
        // Ignore polling transient errors.
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paymentOrder, paymentMethod, refreshPaymentStatus]);

  useEffect(() => {
    if (!paymentOrder) return;
    const current = paymentStatusByOrder[paymentOrder.id];
    if (current?.status === 'PAID') {
      setShowCashConfirm(false);
      setPaymentOrder(null);
      setPaymentData(null);
    }
  }, [paymentOrder, paymentStatusByOrder]);

  useEffect(() => {
    if (!paymentOrder) {
      setShowCashConfirm(false);
    }
  }, [paymentOrder]);

  const printBill = (order: Order) => {
    const payment = paymentStatusByOrder[order.id];
    if (!payment || payment.status !== 'PAID') {
      toast.error('Vui lòng thanh toán trước khi in bill');
      return;
    }
    const html = buildBillHtml(order, taxPolicy, payment);
    const printWindow = window.open('', '_blank', 'width=420,height=760');
    if (!printWindow) {
      toast.error('Trình duyệt đang chặn cửa sổ in bill');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const exportBill = (order: Order) => {
    const payment = paymentStatusByOrder[order.id];
    if (!payment || payment.status !== 'PAID') {
      toast.error('Vui lòng thanh toán trước khi xuất bill');
      return;
    }
    const html = buildBillHtml(order, taxPolicy, payment);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-${order.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const visibleOrders = orders;
  const paidOrderCountFiltered = visibleOrders.filter((order) => paymentStatusByOrder[order.id]?.status === 'PAID').length;
  const completedOrderCountFiltered = visibleOrders.filter((order) => order.status === ORDER_STATUS.COMPLETED).length;
  const pendingOrderCountFiltered = visibleOrders.filter((order) => order.status === ORDER_STATUS.PENDING || order.status === ORDER_STATUS.PREPARING).length;

  useEffect(() => {
    setPage(0);
  }, [orderSearch, statusFilter, sourceFilter]);

  const renderOrderActions = (order: Order) => (
    <div className="flex flex-wrap gap-2">
      {order.status === ORDER_STATUS.PENDING && (
        <>
          {canPrepareOrComplete && (
            <button onClick={() => updateStatus(order.id, ORDER_STATUS.PREPARING)} className="rounded-xl bg-[rgba(201,162,122,0.12)] px-3 py-2 text-xs font-semibold text-[#6b5040] transition hover:bg-[rgba(201,162,122,0.2)]">Pha chế</button>
          )}
          {canCancel && (
            <button onClick={() => updateStatus(order.id, ORDER_STATUS.CANCELLED)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100">Hủy</button>
          )}
        </>
      )}
      {order.status === ORDER_STATUS.PREPARING && (
        canPrepareOrComplete ? (
          <button onClick={() => updateStatus(order.id, ORDER_STATUS.COMPLETED)} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">Hoàn thành</button>
        ) : null
      )}
      {order.status === ORDER_STATUS.COMPLETED && (
        <>
          {paymentStatusByOrder[order.id]?.status !== 'PAID' ? (
            <button
              onClick={() => openPaymentModal(order)}
              className="inline-flex items-center gap-1 rounded-xl bg-[rgba(201,162,122,0.12)] px-3 py-2 text-xs font-semibold text-[#6b5040] transition hover:bg-[rgba(201,162,122,0.2)]"
            >
              <QrCode size={13} /> Thanh toán
            </button>
          ) : (
            <>
              <button
                onClick={() => openBill(order.id)}
                disabled={loadingBillId === order.id}
                className="rounded-xl bg-[rgba(107,80,64,0.07)] px-3 py-2 text-xs font-semibold text-[rgba(26,14,7,0.6)] transition hover:bg-[rgba(107,80,64,0.12)] disabled:opacity-60"
              >
                {loadingBillId === order.id ? 'Đang tải...' : 'Xem bill'}
              </button>
              <button
                onClick={() => printBill(order)}
                className="inline-flex items-center gap-1 rounded-xl bg-[rgba(201,162,122,0.12)] px-3 py-2 text-xs font-semibold text-[#6b5040] transition hover:bg-[rgba(201,162,122,0.2)]"
              >
                <Printer size={13} /> In bill
              </button>
              <button
                onClick={() => exportBill(order)}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Download size={13} /> Xuất bill
              </button>
            </>
          )}
        </>
      )}
    </div>
  );



  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9a27a]" /></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white p-4 shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(201,162,122,0.12)] px-3 py-1 text-xs font-semibold text-[#6b5040]">
              <ReceiptText size={14} /> Danh sách đơn
            </div>
            <p className="mt-2 text-sm text-[rgba(26,14,7,0.45)]">
              Theo dõi trạng thái món, thanh toán và thao tác bill trong cùng một thẻ.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-105">
            <div className="rounded-xl border border-[rgba(107,80,64,0.1)] bg-[rgba(253,247,240,0.5)] px-3 py-2">
              <p className="text-xs text-[rgba(26,14,7,0.45)]">Đang xử lý</p>
              <p className="text-lg font-bold text-[#1a0e07]">{pendingOrderCountFiltered}</p>
            </div>
            <div className="rounded-xl border border-[rgba(107,80,64,0.1)] bg-[rgba(253,247,240,0.5)] px-3 py-2">
              <p className="text-xs text-[rgba(26,14,7,0.45)]">Hoàn thành</p>
              <p className="text-lg font-bold text-[#1a0e07]">{completedOrderCountFiltered}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-700">Đã thu tiền</p>
              <p className="text-lg font-bold text-emerald-700">{paidOrderCountFiltered}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 text-sm text-[rgba(26,14,7,0.45)]">
            <Filter size={16} />
            <span>{pageData ? `${pageData.totalElements} đơn hàng` : `${orders.length} đơn hàng`}</span>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:flex-1 xl:justify-end">
            <label className="relative w-full sm:w-80 xl:w-96">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.35)]" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Tìm theo ID hóa đơn"
                className="w-full rounded-xl border border-[rgba(107,80,64,0.15)] bg-white py-2 pl-9 pr-9 text-sm outline-none transition placeholder:text-[rgba(26,14,7,0.3)] focus:border-[#c9a27a] focus:ring-2 focus:ring-[rgba(201,162,122,0.12)]"
              />
              {orderSearch && (
                <button
                  type="button"
                  onClick={() => setOrderSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[rgba(26,14,7,0.35)] hover:bg-[rgba(107,80,64,0.08)] hover:text-[rgba(26,14,7,0.7)]"
                  aria-label="Xóa tìm kiếm đơn hàng"
                >
                  ×
                </button>
              )}
            </label>

            <label className="relative w-full sm:w-64">
              <span className="sr-only">Lọc theo trạng thái</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 hidden text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="w-full appearance-none rounded-xl border border-[rgba(107,80,64,0.15)] bg-white py-2 pl-3 pr-3 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-2 focus:ring-[rgba(201,162,122,0.12)]"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="PREPARING">Đang pha chế</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </label>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSourceFilter('ALL')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${sourceFilter === 'ALL' ? 'bg-[#6b5040] text-white' : 'bg-[rgba(107,80,64,0.07)] text-[rgba(26,14,7,0.6)] hover:bg-[rgba(107,80,64,0.12)]'}`}
          >
            Tất cả nguồn
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('ONLINE')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${sourceFilter === 'ONLINE' ? 'bg-[#6b5040] text-white' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'}`}
          >
            ONLINE
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('INSTORE')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${sourceFilter === 'INSTORE' ? 'bg-[#6b5040] text-white' : 'bg-[rgba(107,80,64,0.07)] text-[rgba(26,14,7,0.6)] hover:bg-[rgba(107,80,64,0.12)]'}`}
          >
            Tại quầy/Bàn
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {visibleOrders.map((order) => {
          const tax = calculateVatBreakdown(order.totalAmount ?? 0, taxPolicy.vatRatePercent, taxPolicy.priceIncludesVat);
          const originalAmount = order.subtotalAmount ?? ((order.totalAmount ?? 0) + (order.discountAmount ?? 0));
          const originalTax = calculateVatBreakdown(originalAmount, taxPolicy.vatRatePercent, taxPolicy.priceIncludesVat);
          const discountAmount = order.discountAmount ?? 0;
          const payment = paymentStatusByOrder[order.id];
          const isOnlineOrder = (order.tableNumber || '').toUpperCase() === 'ONLINE';
          const parsedOnlineNote = isOnlineOrder ? parseOnlineOrderNote(order.note) : null;
          return (
            <article
              key={order.id}
              className={`overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-md ${isOnlineOrder
                ? 'border-sky-200 bg-sky-50'
                : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
            >
              <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-gray-900 shadow-sm">#{order.id}</span>
                  {(() => {
                    const isOnline = (order.tableNumber || '').toUpperCase() === 'ONLINE';
                    if (isOnline) return null;
                    if (order.tableNumber) {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {order.tableNumber}
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                        POS
                      </span>
                    );
                  })()}
                  {(order.tableNumber || '').toUpperCase() === 'ONLINE' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                      ONLINE
                    </span>
                  )}
                  <StatusBadge status={order.status} />
                  {order.status === ORDER_STATUS.COMPLETED && payment?.status === 'PAID' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={12} /> Đã thanh toán
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock3 size={14} />
                  <span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Món đã gọi</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {order.orderItems?.map((item, idx) => {
                      const quantity = item.quantity ?? 0;
                      const unitPrice = item.unitPrice ?? (quantity > 0 ? (item.subtotal ?? 0) / quantity : 0);
                      const lineSubtotal = item.subtotal ?? unitPrice * quantity;
                      return (
                        <div
                          key={`${order.id}-${item.menuItemId}-${idx}-${formatOrderItemExtras(item)}`}
                          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium leading-5 text-gray-900 wrap-break-word">
                                {item.menuItemName}{formatOrderItemExtras(item)}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {formatCurrency(unitPrice)} × {quantity}
                              </p>
                              {isOnlineOrder && parsedOnlineNote?.itemNotesByIndex?.[idx] ? (
                                <p className="mt-1 text-xs text-sky-800 wrap-break-word">
                                  Ghi chú món: {parsedOnlineNote.itemNotesByIndex[idx]}
                                </p>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="inline-flex rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-bold text-gray-700">
                                x{quantity}
                              </span>
                              <p className="mt-1 text-sm font-bold text-gray-900">{formatCurrency(lineSubtotal)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {order.note && (
                    (order.tableNumber || '').toUpperCase() === 'ONLINE' ? (
                      (() => {
                        const parsed = parsedOnlineNote;
                        const deliveryAddress = parsed?.deliveryAddress?.trim();
                        const customerNote = parsed?.customerNote?.trim();

                        const showAddressOrNote = !!deliveryAddress || !!customerNote;
                        if (!showAddressOrNote || !parsed) {
                          return (
                            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-5 wrap-break-word text-sky-900">
                              {order.note}
                            </div>
                          );
                        }

                        return (
                          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-5 wrap-break-word text-sky-900 space-y-1.5">
                            {(parsed?.customer || order.customerPhone) && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                {parsed?.customer && (
                                  <span>
                                    <span className="font-semibold">Khách:</span>{' '}
                                    {parsed.customer}
                                  </span>
                                )}
                                {order.customerPhone && (
                                  <span>
                                    <span className="font-semibold">SĐT:</span>{' '}
                                    <a
                                      href={`tel:${order.customerPhone}`}
                                      className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
                                    >
                                      {order.customerPhone}
                                    </a>
                                  </span>
                                )}
                              </div>
                            )}
                            {deliveryAddress && (
                              <div>
                                <span className="font-semibold">Địa chỉ giao:</span> {deliveryAddress}
                              </div>
                            )}
                            {customerNote && (
                              <div>
                                <span className="font-semibold">Ghi chú:</span> {customerNote}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm italic leading-5 text-orange-700 wrap-break-word">
                        Ghi chú: {order.note}
                      </div>
                    )
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <Banknote size={14} /> Thanh toán
                  </div>
                  {canSeeTaxBreakdown ? (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between gap-3 text-gray-600">
                        <span>Tạm tính</span>
                        <span className="font-medium text-gray-800">{formatCurrency(originalTax.netAmount)}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-gray-600">
                        <span>Thuế GTGT ({taxPolicy.vatRatePercent}%)</span>
                        <span className="font-medium text-gray-800">{formatCurrency(originalTax.vatAmount)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-700">
                          <div className="flex justify-between gap-3">
                            <span>{order.voucherCode ? `Voucher ${order.voucherCode}` : 'Khuyến mãi'}</span>
                            <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                          </div>
                          {order.promotionNote && (
                            <p className="mt-0.5 text-xs text-emerald-600">{order.promotionNote}</p>
                          )}
                        </div>
                      )}
                      <div className="flex justify-between gap-3 border-t border-gray-100 pt-2 font-bold text-gray-900">
                        <span>Tổng</span>
                        <span>{formatCurrency(tax.grossAmount)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {discountAmount > 0 && (
                        <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-sm text-emerald-700">
                          <div className="flex justify-between gap-3">
                            <span>{order.voucherCode ? `Voucher ${order.voucherCode}` : 'Khuyến mãi'}</span>
                            <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                          </div>
                          {order.promotionNote && (
                            <p className="mt-0.5 text-xs text-emerald-600">{order.promotionNote}</p>
                          )}
                        </div>
                      )}
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(tax.grossAmount)}</p>
                    </div>
                  )}
                </div>

              </div>
              <div className="flex flex-col gap-2 border-t border-gray-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Thao tác</p>
                {renderOrderActions(order)}
              </div>
            </article>
          );
        })}

        {visibleOrders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center">
            <ReceiptText className="mx-auto mb-3 text-gray-300" size={34} />
            <p className="font-medium text-gray-700">
              {orderSearch.trim() ? 'Không tìm thấy đơn hàng khớp với từ khóa' : 'Chưa có đơn hàng'}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {orderSearch.trim() ? 'Hãy thử tìm theo mã, bàn, SĐT hoặc tên món.' : 'Các đơn mới sẽ hiển thị tại đây.'}
            </p>
          </div>
        )}

        {pageData && (
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <Pagination page={page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal
        open={!!paymentOrder}
        onClose={() => {
          setPaymentOrder(null);
          setPaymentData(null);
        }}
        title={paymentOrder ? `Thanh toán đơn #${paymentOrder.id}` : 'Thanh toán'}
        maxWidth="max-w-lg"
      >
        {paymentOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <p>Bàn: <span className="font-medium">{paymentOrder.tableNumber || 'POS'}</span></p>
              <p>Giờ tạo: <span className="font-medium">{new Date(paymentOrder.createdAt).toLocaleString('vi-VN')}</span></p>
              <p className="col-span-2 font-semibold">Tổng thanh toán: {formatCurrency(paymentOrder.totalAmount)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  selectPaymentMethod('CASH').catch(() => {
                    // no-op
                  });
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${paymentMethod === 'CASH' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                <span className="inline-flex items-center gap-1"><Wallet size={16} /> COD (tiền mặt)</span>
              </button>
              <button
                onClick={() => {
                  selectPaymentMethod('QR').catch(() => {
                    // errors are handled in initQrPayment
                  });
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${paymentMethod === 'QR' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                <span className="inline-flex items-center gap-1"><QrCode size={16} /> Chuyển khoản (QR)</span>
              </button>
            </div>

            {paymentMethod === 'QR' && (
              <div className="py-1">
                <div className="mx-auto w-full max-w-95">
                  {paymentData?.qrCode ? (
                    <div className="flex justify-center">
                      <QRCodeSVG
                        value={paymentData.qrCode}
                        size={340}
                        level="M"
                        includeMargin
                        className="h-auto max-w-full"
                      />
                    </div>
                  ) : paymentData?.qrImageUrl ? (
                    <img src={paymentData.qrImageUrl} alt={`QR thanh toán đơn ${paymentOrder.id}`} className="w-full h-auto object-contain" />
                  ) : (
                    <div className="h-56 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                      Đang tải mã QR...
                    </div>
                  )}
                </div>
                {paymentData?.checkoutUrl && (
                  <div className="text-center mt-3">
                    <a
                      href={paymentData.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-medium"
                    >
                      Mở trang thanh toán PayOS
                    </a>
                  </div>
                )}
                <p className="text-xs text-gray-500 text-center mt-2">
                  Khách quét QR để chuyển khoản đúng số tiền của đơn.
                </p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Nội dung CK: <span className="font-medium">{paymentData?.transferContent || `BILL-${paymentOrder.id}`}</span>
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCashConfirm(false);
                  setPaymentOrder(null);
                  setPaymentData(null);
                }}
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Đóng
              </button>
              {paymentMethod === 'CASH' ? (
                <button
                  onClick={() => setShowCashConfirm(true)}
                  disabled={refreshingPayment}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} /> {refreshingPayment ? 'Đang xử lý...' : 'Xác nhận đã thu tiền mặt'}
                </button>
              ) : (
                <button
                  onClick={() => refreshPaymentStatus(paymentOrder.id).catch(() => toast.error('Không thể kiểm tra trạng thái'))}
                  disabled={refreshingPayment}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} /> {refreshingPayment ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showCashConfirm && !!paymentOrder}
        onClose={() => setShowCashConfirm(false)}
        title="Xác nhận thanh toán tiền mặt"
        maxWidth="max-w-md"
      >
        {paymentOrder && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Xác nhận đã thu tiền mặt cho đơn <span className="font-semibold">#{paymentOrder.id}</span>?
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p>Bàn: <span className="font-semibold">{paymentOrder.tableNumber || 'POS'}</span></p>
              <p>Số tiền: <span className="font-semibold">{formatCurrency(paymentOrder.totalAmount)}</span></p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCashConfirm(false)}
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmCashPayment().catch(() => {
                    // no-op
                  });
                }}
                disabled={refreshingPayment}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Wallet size={16} /> {refreshingPayment ? 'Đang xử lý...' : 'Xác nhận thu tiền'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!billOrder}
        onClose={() => setBillOrder(null)}
        title={billOrder ? `Bill #${billOrder.id}` : 'Bill'}
        maxWidth="max-w-xl"
      >
        {billOrder && (
          <div className="space-y-4 text-sm">
            <div className="text-center border-b pb-3">
              <p className="font-semibold text-base">SMARTDSS COFFEE</p>
              <p className="text-gray-500">Phiếu thanh toán</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              <p>Mã đơn: <span className="font-medium text-gray-800">#{billOrder.id}</span></p>
              <p>Bàn: <span className="font-medium text-gray-800">{billOrder.tableNumber || 'POS'}</span></p>
              <p>Thu ngân: <span className="font-medium text-gray-800">{formatOrderCreator(billOrder)}</span></p>
              <p>Giờ: <span className="font-medium text-gray-800">{new Date(billOrder.createdAt).toLocaleString('vi-VN')}</span></p>
              {paymentStatusByOrder[billOrder.id]?.status === 'PAID' && (
                <>
                  <p>Thanh toán: <span className="font-medium text-gray-800">{paymentStatusByOrder[billOrder.id].paymentMethod === 'QR' ? 'Chuyển khoản (QR)' : 'COD (tiền mặt)'}</span></p>
                </>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Món</th>
                    <th className="text-right px-3 py-2">SL</th>
                    <th className="text-right px-3 py-2">Đơn giá</th>
                    <th className="text-right px-3 py-2">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {billOrder.orderItems.map((item, idx) => {
                    const quantity = item.quantity ?? 0;
                    const unitPrice = item.unitPrice ?? (quantity > 0 ? (item.subtotal ?? 0) / quantity : 0);
                    const lineSubtotal = item.subtotal ?? unitPrice * quantity;
                    return (
                      <tr key={`${item.menuItemId}-${idx}`} className="border-t">
                        <td className="px-3 py-2">
                          {item.menuItemName || `Món #${item.menuItemId}`}
                          {formatOrderItemExtras(item)}
                        </td>
                        <td className="px-3 py-2 text-right">{quantity}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(unitPrice)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(lineSubtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(() => {
              const tax = calculateVatBreakdown(billOrder.totalAmount ?? 0, taxPolicy.vatRatePercent, taxPolicy.priceIncludesVat);
              const originalAmount = billOrder.subtotalAmount ?? ((billOrder.totalAmount ?? 0) + (billOrder.discountAmount ?? 0));
              const discountAmount = billOrder.discountAmount ?? 0;
              return (
                <div className="space-y-1 border-t pt-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính (đã bao gồm thuế)</span>
                    <span>{formatCurrency(originalAmount)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                      <div className="flex justify-between">
                        <span>{billOrder.voucherCode ? `Voucher ${billOrder.voucherCode}` : 'Khuyến mãi'}</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                      {billOrder.promotionNote && (
                        <p className="mt-1 text-xs">{billOrder.promotionNote}</p>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-base">
                    <span>Tổng thanh toán</span>
                    <span>{formatCurrency(tax.grossAmount)}</span>
                  </div>
                </div>
              );
            })()}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => exportBill(billOrder)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              >
                <Download size={14} /> Xuất bill
              </button>
              <button
                onClick={() => printBill(billOrder)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <Printer size={14} /> In bill
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function buildBillHtml(order: Order, taxPolicy: TaxPolicy, paid: PaymentStatus): string {
  const tax = calculateVatBreakdown(order.totalAmount ?? 0, taxPolicy.vatRatePercent, taxPolicy.priceIncludesVat);
  const originalAmount = order.subtotalAmount ?? ((order.totalAmount ?? 0) + (order.discountAmount ?? 0));
  const discountAmount = order.discountAmount ?? 0;
  const discountRow = discountAmount > 0
    ? `<div class="discount"><div><span>${escapeHtml(order.voucherCode ? `Voucher ${order.voucherCode}` : 'Khuyến mãi')}</span><span>-${formatCurrency(discountAmount)}</span></div>${order.promotionNote ? `<p>${escapeHtml(order.promotionNote)}</p>` : ''}</div>`
    : '';
  const rows = order.orderItems.map((item) => {
    const itemName = (item.menuItemName || `Món #${item.menuItemId}`) + formatOrderItemExtras(item);
    const qty = item.quantity ?? 0;
    const unitPrice = item.unitPrice ?? (qty > 0 ? (item.subtotal ?? 0) / qty : 0);
    const subtotal = item.subtotal ?? unitPrice * qty;
    return `
      <tr>
        <td>${escapeHtml(itemName)}</td>
        <td style="text-align:right">${qty}</td>
        <td style="text-align:right">${formatCurrency(unitPrice)}</td>
        <td style="text-align:right">${formatCurrency(subtotal)}</td>
      </tr>
    `;
  }).join('');

  return `
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Bill #${order.id}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; max-width: 360px; margin: 0 auto; padding: 12px; }
    h1, p { margin: 0; }
    .center { text-align: center; }
    .muted { color: #666; font-size: 12px; }
    .meta { margin-top: 10px; font-size: 13px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th, td { border-top: 1px solid #ddd; padding: 6px 2px; }
    tfoot td { font-weight: bold; }
    .sum { margin-top: 10px; font-size: 13px; }
    .sum div { display: flex; justify-content: space-between; margin: 4px 0; }
    .sum .discount { display: block; background: #ecfdf5; color: #047857; border-radius: 8px; padding: 6px 8px; }
    .discount div { display: flex; justify-content: space-between; margin: 0; }
    .discount p { margin: 3px 0 0; font-size: 11px; color: #047857; }
    .total { font-weight: bold; font-size: 15px; }
    @media print { body { width: 80mm; max-width: none; } }
  </style>
</head>
<body>
  <div class="center">
    <h1 style="font-size:18px">SMARTDSS COFFEE</h1>
    <p class="muted">PHIẾU THANH TOÁN</p>
  </div>
  <div class="meta">
    <div>Mã đơn: #${order.id}</div>
    <div>Bàn: ${escapeHtml(order.tableNumber || 'POS')}</div>
    <div>Thu ngân: ${escapeHtml(formatOrderCreator(order))}</div>
    <div>Giờ: ${new Date(order.createdAt).toLocaleString('vi-VN')}</div>
    <div>Thanh toán: ${paid.paymentMethod === 'QR' ? 'Chuyển khoản (QR)' : 'COD (tiền mặt)'}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Món</th>
        <th style="text-align:right">SL</th>
        <th style="text-align:right">Đơn giá</th>
        <th style="text-align:right">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="sum">
    <div><span>Tạm tính (đã bao gồm thuế)</span><span>${formatCurrency(originalAmount)}</span></div>
    ${discountRow}
    <div class="total"><span>Tổng thanh toán</span><span>${formatCurrency(tax.grossAmount)}</span></div>
  </div>
  <p class="center muted" style="margin-top:14px">Cảm ơn quý khách!</p>
</body>
</html>
  `.trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
