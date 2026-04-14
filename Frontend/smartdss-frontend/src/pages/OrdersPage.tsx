import { useEffect, useState, useCallback, useRef } from 'react';
import { menuService, categoryService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import { publicConfigService } from '@/services/publicConfigService';
import { paymentService } from '@/services/paymentService';
import type { MenuItem, OrderForm, PageResponse, Category, TaxPolicy, PaymentStatus } from '@/types';
import { ShoppingCart, Plus, Minus, Trash2, Send, Search, Printer, Download, QrCode, Wallet, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { StatusBadge } from './DashboardPage';
import type { Order } from '@/types';
import { ORDER_STATUS } from '@/utils/constants';
import { calculateVatBreakdown, getApiErrorMessage, formatCurrency, drinkCartLineKey, unitPriceWithDrinkOptions, formatOrderItemExtras } from '@/utils/helpers';
import DrinkCustomizeModal from '@/components/DrinkCustomizeModal';
import Pagination from '@/components/ui/Pagination';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey } from '@/utils/helpers';
import Modal from '@/components/ui/Modal';

const CATEGORY_ICONS: Record<string, string> = {
  'Cà phê': '☕', 'Trà': '🍵', 'Sinh tố': '🥤', 'Nước ép': '🧃', 'Bánh ngọt': '🍰',
};

interface CartItem {
  key: string;
  menuItem: MenuItem;
  quantity: number;
  selectedSizeCode?: string;
  selectedToppingCodes?: string[];
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
  const [tab, setTab] = useState<'pos' | 'list'>('pos');
  const { user } = useAuth();
  const userRole = getRoleKey(user?.roleName);

  const canUsePOS = ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold">Đơn hàng</h1>
        </div>
        <div className="flex shrink-0 bg-gray-100 rounded-lg p-1">
          {canUsePOS && (
            <button onClick={() => setTab('pos')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === 'pos' ? 'bg-white shadow' : ''}`}>POS</button>
          )}
          <button onClick={() => setTab('list')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === 'list' ? 'bg-white shadow' : ''}`}>Danh sách</button>
        </div>
      </div>
      {tab === 'pos' && canUsePOS ? <POSView /> : <OrderListView />}
    </div>
  );
}

function POSView() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drinkModalItem, setDrinkModalItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taxPolicy, setTaxPolicy] = useState<TaxPolicy>({ vatRatePercent: 8, priceIncludesVat: true });
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('CASH');
  const [paymentData, setPaymentData] = useState<CurrentPaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const [showCashConfirm, setShowCashConfirm] = useState(false);

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
    const orderForm: OrderForm = {
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

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

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
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedCat === null ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            Tất cả
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedCat === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
              {CATEGORY_ICONS[cat.name] || '🍽️'} {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <button key={item.id} onClick={() => addToCart(item)}
              className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md hover:border-blue-300 transition">
              <div className="text-2xl mb-2">{CATEGORY_ICONS[item.categoryName] || '🍽️'}</div>
              <h3 className="font-medium text-sm truncate">{item.name}</h3>
              <p className="text-xs text-gray-400 truncate">{item.categoryName}</p>
              <p className="text-blue-600 font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <p className="col-span-full text-center text-gray-400 py-8">Không có món nào</p>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit sticky top-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={20} className="text-blue-600" />
          <h2 className="font-semibold">Giỏ hàng ({cart.length})</h2>
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Chọn món để thêm vào giỏ</p>
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
                <div key={c.key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.menuItem.name}
                      {extras && <span className="text-gray-500 font-normal">{extras}</span>}
                    </p>
                    <p className="text-xs text-gray-500">{formatCurrency(lineUnit)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateQty(c.key, -1)} className="p-1 rounded hover:bg-gray-200">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{c.quantity}</span>
                    <button type="button" onClick={() => updateQty(c.key, 1)} className="p-1 rounded hover:bg-gray-200">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button type="button" onClick={() => removeFromCart(c.key)} className="p-1 rounded hover:bg-red-50 text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-gray-200 mt-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Tạm tính</span>
            <span className="text-lg font-semibold text-gray-700">{formatCurrency(vat.netAmount)}</span>
          </div>
          <div className="flex items-center justify-between mb-4 text-sm">
            <span className="text-gray-500">VAT ({taxPolicy.vatRatePercent}%)</span>
            <span className="font-medium text-gray-700">{formatCurrency(vat.vatAmount)}</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Tổng thanh toán</span>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(vat.grossAmount)}</span>
          </div>
          <button onClick={placeOrder} disabled={cart.length === 0 || submitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
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
                <span className="inline-flex items-center gap-1"><Wallet size={16} /> Tiền mặt</span>
              </button>
              <button
                onClick={() => {
                  selectPaymentMethod('QR').catch(() => {
                    // errors are handled in initQrPayment
                  });
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${paymentMethod === 'QR' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                <span className="inline-flex items-center gap-1"><QrCode size={16} /> QR chuyển khoản</span>
              </button>
            </div>

            {paymentMethod === 'QR' && (
              <div className="py-1">
                <div className="mx-auto w-full max-w-[380px]">
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
    </div>
  );
}

function OrderListView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<Order> | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
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
    orderService.getAll(page, 10, statusFilter || undefined)
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
  }, [page, statusFilter]);

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



  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Search size={18} className="text-gray-400" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="PREPARING">Đang pha chế</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Món</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Thanh toán</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Trạng thái</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Thời gian</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-gray-100">
                <td className="py-3 px-4">{order.id}</td>
                <td className="py-3 px-4 text-gray-600">
                  <div>
                    {order.orderItems
                      ?.map((i) => `${i.menuItemName}${formatOrderItemExtras(i)} x${i.quantity}`)
                      .join(', ')}
                  </div>
                  {order.note && (
                    <div className="text-sm text-orange-600 mt-1 italic">
                      Ghi chú: {order.note}
                    </div>
                  )}
                  <div className="mt-1">
                    {order.tableNumber ? (
                      <div className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                        <span className="font-medium">{order.tableNumber}</span>
                      </div>
                    ) : (
                      <div className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
                        <span className="font-medium">POS</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 font-medium">
                  {(() => {
                    const tax = calculateVatBreakdown(order.totalAmount ?? 0, taxPolicy.vatRatePercent, taxPolicy.priceIncludesVat);
                    if (!canSeeTaxBreakdown) {
                      return <div>{formatCurrency(tax.grossAmount)}</div>;
                    }
                    return (
                      <div className="leading-5 text-sm">
                        <div className="text-gray-600">
                          Tạm tính: <span className="font-medium text-gray-800">{formatCurrency(tax.netAmount)}</span>
                        </div>
                        <div className="text-gray-600">
                          Thuế GTGT ({taxPolicy.vatRatePercent}%): <span className="font-medium text-gray-800">{formatCurrency(tax.vatAmount)}</span>
                        </div>
                        <div className="font-semibold text-gray-900">
                          Tổng: {formatCurrency(tax.grossAmount)}
                        </div>
                      </div>
                    );
                  })()}
                </td>
                <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                <td className="py-3 px-4 text-gray-500">{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                <td className="py-3 px-4 text-right space-x-1">
                  {order.status === ORDER_STATUS.PENDING && (
                    <>
                      {canPrepareOrComplete && (
                        <button onClick={() => updateStatus(order.id, ORDER_STATUS.PREPARING)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">Pha chế</button>
                      )}
                      {canCancel && (
                        <button onClick={() => updateStatus(order.id, ORDER_STATUS.CANCELLED)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">Hủy</button>
                      )}
                    </>
                  )}
                  {order.status === ORDER_STATUS.PREPARING && (
                    canPrepareOrComplete ? (
                      <button onClick={() => updateStatus(order.id, ORDER_STATUS.COMPLETED)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">Hoàn thành</button>
                    ) : null
                  )}
                  {order.status === ORDER_STATUS.COMPLETED && (
                    <>
                      {paymentStatusByOrder[order.id]?.status !== 'PAID' ? (
                        <button
                          onClick={() => openPaymentModal(order)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs hover:bg-violet-200"
                        >
                          <QrCode size={12} /> Thanh toán
                        </button>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
                            <CheckCircle2 size={12} /> Đã thanh toán
                          </span>
                          <button
                            onClick={() => openBill(order.id)}
                            disabled={loadingBillId === order.id}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 disabled:opacity-60"
                          >
                            {loadingBillId === order.id ? 'Đang tải...' : 'Xem bill'}
                          </button>
                          <button
                            onClick={() => printBill(order)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            <Printer size={12} /> In bill
                          </button>
                          <button
                            onClick={() => exportBill(order)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200"
                          >
                            <Download size={12} /> Xuất bill
                          </button>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Chưa có đơn hàng</td></tr>}
          </tbody>
        </table>
        {pageData && (
          <div className="px-4 pb-4">
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
                <span className="inline-flex items-center gap-1"><Wallet size={16} /> Tiền mặt</span>
              </button>
              <button
                onClick={() => {
                  selectPaymentMethod('QR').catch(() => {
                    // errors are handled in initQrPayment
                  });
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${paymentMethod === 'QR' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                <span className="inline-flex items-center gap-1"><QrCode size={16} /> QR chuyển khoản</span>
              </button>
            </div>

            {paymentMethod === 'QR' && (
              <div className="py-1">
                <div className="mx-auto w-full max-w-[380px]">
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
              <p>Thu ngân: <span className="font-medium text-gray-800">{billOrder.createdByName || 'N/A'}</span></p>
              <p>Giờ: <span className="font-medium text-gray-800">{new Date(billOrder.createdAt).toLocaleString('vi-VN')}</span></p>
              {paymentStatusByOrder[billOrder.id]?.status === 'PAID' && (
                <>
                  <p>Thanh toán: <span className="font-medium text-gray-800">{paymentStatusByOrder[billOrder.id].paymentMethod === 'QR' ? 'QR chuyển khoản' : 'Tiền mặt'}</span></p>
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
                  {billOrder.orderItems.map((item, idx) => (
                    <tr key={`${item.menuItemId}-${idx}`} className="border-t">
                      <td className="px-3 py-2">
                        {item.menuItemName || `Món #${item.menuItemId}`}
                        {formatOrderItemExtras(item)}
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice ?? 0)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.subtotal ?? (item.unitPrice ?? 0) * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => {
              const tax = calculateVatBreakdown(billOrder.totalAmount ?? 0, taxPolicy.vatRatePercent, taxPolicy.priceIncludesVat);
              return (
                <div className="space-y-1 border-t pt-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span>{formatCurrency(tax.netAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Thuế GTGT ({taxPolicy.vatRatePercent}%)</span>
                    <span>{formatCurrency(tax.vatAmount)}</span>
                  </div>
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
  const rows = order.orderItems.map((item) => {
    const itemName = (item.menuItemName || `Món #${item.menuItemId}`) + formatOrderItemExtras(item);
    const qty = item.quantity ?? 0;
    const unitPrice = item.unitPrice ?? 0;
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
    .total { font-weight: bold; font-size: 15px; }
    @media print { body { width: 80mm; max-width: none; } }
  </style>
</head>
<body>
  <div class="center">
    <h1 style="font-size:18px">SMARTDSS COFFEE</h1>
    <p class="muted">PHIEU THANH TOAN</p>
  </div>
  <div class="meta">
    <div>Ma don: #${order.id}</div>
    <div>Ban: ${escapeHtml(order.tableNumber || 'POS')}</div>
    <div>Thu ngan: ${escapeHtml(order.createdByName || 'N/A')}</div>
    <div>Gio: ${new Date(order.createdAt).toLocaleString('vi-VN')}</div>
    <div>Thanh toan: ${paid.paymentMethod === 'QR' ? 'QR chuyen khoan' : 'Tien mat'}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Mon</th>
        <th style="text-align:right">SL</th>
        <th style="text-align:right">Don gia</th>
        <th style="text-align:right">Thanh tien</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="sum">
    <div><span>Tam tinh</span><span>${formatCurrency(tax.netAmount)}</span></div>
    <div><span>Thue GTGT (${taxPolicy.vatRatePercent}%)</span><span>${formatCurrency(tax.vatAmount)}</span></div>
    <div class="total"><span>Tong thanh toan</span><span>${formatCurrency(tax.grossAmount)}</span></div>
  </div>
  <p class="center muted" style="margin-top:14px">Cam on quy khach!</p>
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
