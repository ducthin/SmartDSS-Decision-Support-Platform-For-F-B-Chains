import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Send, ClipboardList, Coffee, X, Bell, Star, MessageSquareText, ImagePlus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { qrService } from '@/services/qrService';
import type { MenuItem, Order, DiningTable, QrFeedbackForm } from '@/types';
import { useOrderSocket } from '@/hooks/useOrderSocket';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  PREPARING: 'Đang pha chế',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PREPARING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

type Tab = 'menu' | 'orders' | 'feedback';

export default function QrOrderPage() {
  const { token } = useParams<{ token: string }>();
  const [table, setTable] = useState<DiningTable | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('menu');
  const [showCart, setShowCart] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [callingStaff, setCallingStaff] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<QrFeedbackForm>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    rating: 5,
    content: '',
    images: [],
  });

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [tableRes, menuRes] = await Promise.all([
        qrService.getTableInfo(token),
        qrService.getMenu(token),
      ]);
      setTable(tableRes.data.data);
      setMenuItems(menuRes.data.data);
      setError('');
    } catch {
      setError('Mã QR không hợp lệ hoặc bàn không hoạt động');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await qrService.getOrders(token);
      setOrders(res.data.data);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSocketUpdate = useCallback((data?: Order) => {
    if (data && data.id) {
      setOrders(prev => {
        const exists = prev.find(o => o.id === data.id);
        if (exists) {
          return prev.map(o => o.id === data.id ? data : o);
        } else if (table && data.tableNumber === table.name) {
          return [data, ...prev];
        }
        return prev;
      });
    }
    // Still trigger reload to assure sync if something goes wrong
    loadOrders();
  }, [loadOrders, table]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
  }, [tab, loadOrders]);

  useOrderSocket(handleSocketUpdate);

  const categories = [...new Set(menuItems.map(m => m.categoryName))];

  const filtered = filterCat === 'all' ? menuItems : menuItems.filter(m => m.categoryName === filterCat);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQty = (itemId: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.menuItem.id !== itemId) return c;
      const newQty = c.quantity + delta;
      return newQty <= 0 ? c : { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(c => c.menuItem.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const placeOrder = async () => {
    if (!token || cart.length === 0) return;
    setSubmitting(true);
    try {
      await qrService.placeOrder(token, {
        note: note || undefined,
        orderItems: cart.map(c => ({ menuItemId: c.menuItem.id, quantity: c.quantity })),
      });
      toast.success('Đặt hàng thành công! Vui lòng chờ pha chế.');
      setCart([]);
      setNote('');
      setShowCart(false);
      setTab('orders');
      loadOrders();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Coffee className="mx-auto h-16 w-16 text-orange-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-700 mb-2">Không tìm thấy bàn</h1>
          <p className="text-gray-500">{error || 'Vui lòng quét lại mã QR'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">SmartDSS</h1>
            <p className="text-orange-100 text-sm">{table.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={callStaff}
              disabled={callingStaff}
              className="px-3 py-1 rounded-full text-sm font-medium transition bg-white/15 hover:bg-white/20 disabled:opacity-60 flex items-center gap-1"
              title="Gọi nhân viên"
            >
              <Bell className="h-4 w-4" />
              {callingStaff ? 'Đang gọi...' : 'Gọi NV'}
            </button>
            <button onClick={() => setTab('menu')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${tab === 'menu' ? 'bg-white text-orange-600' : 'bg-orange-400/50 text-white'}`}>
              Thực đơn
            </button>
            <button onClick={() => setTab('orders')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${tab === 'orders' ? 'bg-white text-orange-600' : 'bg-orange-400/50 text-white'}`}>
              Đơn hàng
            </button>
            <button onClick={() => setTab('feedback')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${tab === 'feedback' ? 'bg-white text-orange-600' : 'bg-orange-400/50 text-white'}`}>
              Feedback
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {tab === 'menu' && (
          <>
            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
              <button onClick={() => setFilterCat('all')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${filterCat === 'all' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border'}`}>
                Tất cả
              </button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${filterCat === cat ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border'}`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu items grid */}
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(item => {
                const inCart = cart.find(c => c.menuItem.id === item.id);
                return (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-orange-100">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-28 object-cover" />
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-800 text-sm leading-tight">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-orange-600 font-bold text-sm">{formatPrice(item.price)}</span>
                        {inCart ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                              <Minus className="h-3 w-3 text-orange-600" />
                            </button>
                            <span className="text-sm font-bold w-5 text-center">{inCart.quantity}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                              <Plus className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shadow">
                            <Plus className="h-4 w-4 text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Coffee className="mx-auto h-12 w-12 mb-3" />
                <p>Không có món nào</p>
              </div>
            )}
          </>
        )}

        {tab === 'orders' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-700">Đơn hàng của bạn</h2>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ClipboardList className="mx-auto h-12 w-12 mb-3" />
                <p>Chưa có đơn hàng nào</p>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm p-4 border border-orange-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">#{order.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {order.orderItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.menuItemName} x{item.quantity}</span>
                        <span className="text-gray-500">{formatPrice(item.subtotal || 0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-bold text-orange-600">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'feedback' && (
          <div className="bg-white rounded-xl shadow-sm p-4 border border-orange-100 space-y-4">
            <div className="flex items-start gap-2">
              <MessageSquareText className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h2 className="font-bold text-gray-800">Góp ý về quán</h2>
                <p className="text-sm text-gray-500">Thông tin này chỉ Admin và Manager xem được.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <input
                value={feedback.customerName}
                onChange={(e) => setFeedback((prev) => ({ ...prev, customerName: e.target.value }))}
                placeholder="Họ và tên *"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:outline-none"
              />
              <input
                value={feedback.customerPhone}
                onChange={(e) => setFeedback((prev) => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="Số điện thoại *"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:outline-none"
              />
              <input
                type="email"
                value={feedback.customerEmail}
                onChange={(e) => setFeedback((prev) => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="Email *"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Đánh giá *</label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFeedback((prev) => ({ ...prev, rating: s }))}
                    className="p-1"
                    title={`${s} sao`}
                  >
                    <Star
                      className={`h-5 w-5 ${s <= feedback.rating ? 'text-amber-500 fill-amber-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={feedback.content}
              onChange={(e) => setFeedback((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Nội dung feedback *"
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-orange-300 focus:outline-none"
              rows={4}
            />

            <div>
              <label className="text-sm font-medium text-gray-700">Ảnh đính kèm (không bắt buộc)</label>
              <label className="mt-2 border border-dashed border-orange-300 rounded-lg p-3 flex items-center justify-center gap-2 text-sm text-gray-600 cursor-pointer hover:bg-orange-50 transition">
                <ImagePlus className="h-4 w-4 text-orange-500" />
                <span>{feedback.images?.length ? `Đã chọn ${feedback.images.length} ảnh` : 'Chọn ảnh (JPG/PNG/WEBP/GIF, tối đa 5MB/ảnh)'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => setFeedback((prev) => ({ ...prev, images: Array.from(e.target.files || []) }))}
                />
              </label>
            </div>

            <button
              onClick={submitFeedback}
              disabled={submittingFeedback}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Send className="h-4 w-4" />
              {submittingFeedback ? 'Đang gửi feedback...' : 'Gửi feedback'}
            </button>
          </div>
        )}
      </div>

      {/* Cart floating button */}
      {cart.length > 0 && !showCart && (
        <button onClick={() => setShowCart(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 z-40">
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 bg-white text-orange-500 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          </div>
          <span className="font-bold">{formatPrice(cartTotal)}</span>
          <span className="text-orange-200">|</span>
          <span className="text-sm">Xem giỏ hàng</span>
        </button>
      )}

      {/* Cart overlay */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-bold text-lg text-gray-800">Giỏ hàng</h3>
              <button onClick={() => setShowCart(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {cart.map(c => (
                <div key={c.menuItem.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{c.menuItem.name}</p>
                    <p className="text-orange-500 text-sm font-bold">{formatPrice(c.menuItem.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(c.menuItem.id)} className="text-red-400 text-xs">Xóa</button>
                    <button onClick={() => updateQty(c.menuItem.id, -1)} className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                      <Minus className="h-3 w-3 text-orange-600" />
                    </button>
                    <span className="font-bold text-sm w-5 text-center">{c.quantity}</span>
                    <button onClick={() => updateQty(c.menuItem.id, 1)} className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
                      <Plus className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú (ít đá, nhiều đường...)"
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-orange-300 focus:outline-none"
                  rows={2}
                />
              </div>
            </div>
            <div className="border-t px-4 py-3 space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-700">Tổng cộng</span>
                <span className="text-orange-600">{formatPrice(cartTotal)}</span>
              </div>
              <button onClick={placeOrder} disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
                <Send className="h-4 w-4" />
                {submitting ? 'Đang gửi...' : 'Đặt hàng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
