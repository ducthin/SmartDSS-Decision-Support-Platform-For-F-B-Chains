import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Send, ClipboardList, Coffee, X, Bell, Search } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { qrService } from '@/services/qrService';
import type { MenuItem, Order, DiningTable } from '@/types';
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
  PENDING: 'bg-[#F5E6D3] text-[#6D4C41]',
  PREPARING: 'bg-[#FFE7CC] text-[#D48806]',
  COMPLETED: 'bg-[#E8F1E8] text-[#3D6B3D]',
  CANCELLED: 'bg-[#F6E8E6] text-[#8A4A42]',
};

type Tab = 'menu' | 'orders';

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
  const [search, setSearch] = useState('');
  const [callingStaff, setCallingStaff] = useState(false);

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

  const filteredByCategory = filterCat === 'all' ? menuItems : menuItems.filter(m => m.categoryName === filterCat);
  const filtered = filteredByCategory.filter(item => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQty = (itemId: number, delta: number) => {
    setCart(prev => prev
      .map(c => {
        if (c.menuItem.id !== itemId) return c;
        const newQty = c.quantity + delta;
        return { ...c, quantity: newQty };
      })
      .filter(c => c.quantity > 0));
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(c => c.menuItem.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const activeOrdersCount = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length;

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

  const formatPrice = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)} VND`;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6EC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F4A825]" />
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-[#FDF6EC] flex items-center justify-center p-4">
        <div className="text-center">
          <Coffee className="mx-auto h-16 w-16 text-[#A1887F] mb-4" />
          <h1 className="text-2xl font-bold text-[#2E1F1C] mb-2">Không tìm thấy bàn</h1>
          <p className="text-[#5D4037]">{error || 'Vui lòng quét lại mã QR'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF6EC] via-[#FDF6EC] to-[#F5E6D3] pb-24">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-[#3E2723] text-white px-4 py-4 sticky top-0 z-30 shadow-lg border-b border-[#6D4C41]">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] uppercase tracking-[0.2em] text-[#FFB74D] flex items-center gap-1">
                {/* logo */}
                Coffee Name
              </p>
              <p className="inline-flex items-center mt-1 px-2.5 py-1 rounded-full border-2 border-[#FFB74D] bg-[#6D4C41] text-[#FDF6EC] text-sm font-medium shadow-[0_0_0_2px_rgba(244,168,37,0.2)] whitespace-nowrap">
                Bàn: {table.name}
              </p>
            </div>
            <button
              onClick={callStaff}
              disabled={callingStaff}
              className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition bg-[#F4A825] hover:bg-[#D48806] text-[#2E1F1C] disabled:opacity-60 flex items-center gap-1"
              title="Gọi nhân viên"
            >
              <Bell className="h-4 w-4" />
              {callingStaff ? 'Đang gọi...' : 'Gọi NV'}
            </button>
          </div>

          <div className="bg-[#6D4C41] rounded-2xl p-1.5 flex gap-1">
            <button
              onClick={() => setTab('menu')}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition ${tab === 'menu' ? 'bg-[#FDF6EC] text-[#3E2723] shadow-sm' : 'text-[#F5E6D3] hover:bg-[#A1887F]/30'}`}
            >
              Thực đơn
            </button>
            <button
              onClick={() => {
                setTab('orders');
                loadOrders();
              }}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${tab === 'orders' ? 'bg-[#FDF6EC] text-[#3E2723] shadow-sm' : 'text-[#F5E6D3] hover:bg-[#A1887F]/30'}`}
            >
              Đơn hàng
              {activeOrdersCount > 0 && (
                <span className="bg-[#F4A825] text-[#2E1F1C] text-xs px-2 py-0.5 rounded-full">{activeOrdersCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {tab === 'menu' && (
          <>

            {/* Search */}
            <div className="mb-4 bg-[#F5E6D3] border border-[#E4CFB4] rounded-2xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[#6D4C41]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm món bạn muốn gọi..."
                  className="w-full bg-transparent text-sm text-[#2E1F1C] placeholder:text-[#8B6B62] outline-none"
                />
              </div>
            </div>


            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
              <button onClick={() => setFilterCat('all')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition ${filterCat === 'all' ? 'bg-[#6D4C41] text-[#FDF6EC]' : 'bg-[#FAFAFA] text-[#5D4037] border border-[#DCC2A8] hover:border-[#A1887F]'}`}>
                Tất cả
              </button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition ${filterCat === cat ? 'bg-[#6D4C41] text-[#FDF6EC]' : 'bg-[#FAFAFA] text-[#5D4037] border border-[#DCC2A8] hover:border-[#A1887F]'}`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu items grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(item => {
                const inCart = cart.find(c => c.menuItem.id === item.id);
                return (
                  <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#E9D8C4] hover:shadow-md transition flex sm:block">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-24 h-24 sm:w-full sm:h-36 object-cover shrink-0" />
                    )}
                    {!item.imageUrl && (
                      <div className="w-24 h-24 sm:w-full sm:h-36 bg-gradient-to-br from-[#F5E6D3] to-[#EED8BF] flex items-center justify-center shrink-0">
                        <Coffee className="h-8 w-8 text-[#A1887F]" />
                      </div>
                    )}
                    <div className="p-3 flex-1 min-w-0">
                      <h3 className="font-semibold text-[#2E1F1C] text-base leading-snug line-clamp-2">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-[#5D4037] mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5 sm:mt-2">
                        <span className="text-[#6D4C41] font-bold text-sm">{formatPrice(item.price)}</span>
                        {inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-[#F5E6D3] hover:bg-[#E8D2B8] flex items-center justify-center transition">
                              <Minus className="h-3 w-3 text-[#6D4C41]" />
                            </button>
                            <span className="text-sm font-bold w-6 text-center text-[#2E1F1C]">{inCart.quantity}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-[#F4A825] hover:bg-[#D48806] flex items-center justify-center transition">
                              <Plus className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(item)} className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#F4A825] hover:bg-[#D48806] flex items-center justify-center shadow transition">
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
              <div className="text-center py-12 text-[#A1887F]">
                <Coffee className="mx-auto h-12 w-12 mb-3" />
                <p>Không tìm thấy món phù hợp</p>
              </div>
            )}
          </>
        )}

        {tab === 'orders' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-[#2E1F1C]">Đơn hàng của bạn</h2>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-[#A1887F]">
                <ClipboardList className="mx-auto h-12 w-12 mb-3" />
                <p>Chưa có đơn hàng nào</p>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm p-4 border border-[#E9D8C4]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#5D4037]">Id: {order.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-[#F5E6D3] text-[#5D4037]'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {order.orderItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[#2E1F1C] truncate">{item.menuItemName}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F5E6D3] text-[#6D4C41] border border-[#E4CFB4] whitespace-nowrap">
                            SL {item.quantity}
                          </span>
                        </div>
                        <span className="text-[#5D4037]">{formatPrice(item.subtotal || 0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-between items-center">
                    <span className="text-xs text-[#A1887F]">
                      {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-bold text-[#6D4C41]">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Cart floating button */}
      {cart.length > 0 && !showCart && (
        <button onClick={() => setShowCart(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[360px] sm:w-[220px] h-[62px] bg-[#3E2723] hover:bg-[#2E1F1C] text-white rounded-full shadow-xl flex items-center justify-center gap-3 z-40 transition border border-[#6D4C41]">
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 bg-[#F4A825] text-[#2E1F1C] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-sm">{formatPrice(cartTotal)}</span>
            <span className="text-xs italic text-[#F5E6D3] mt-0.5">Xem giỏ hàng</span>
          </div>
        </button>
      )}

      {/* Cart overlay */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-[#FDF6EC]/88" onClick={() => setShowCart(false)} />
          <div className="relative bg-[#FDF6EC] rounded-t-3xl sm:rounded-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-[#DCC2A8] w-full max-w-2xl mx-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-[#E4CFB4] bg-[#FDF6EC] rounded-t-3xl">
              <div>
                <h3 className="font-bold text-2xl text-[#2E1F1C]">Giỏ hàng</h3>
                <p className="text-xs text-[#6D4C41] mt-0.5">{cartCount} món đã chọn</p>
              </div>
              <button onClick={() => setShowCart(false)} className="h-8 w-8 rounded-full bg-[#F5E6D3] flex items-center justify-center">
                <X className="h-5 w-5 text-[#6D4C41]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {cart.map(c => (
                <div key={c.menuItem.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E4CFB4] bg-white hover:bg-[#FDF8F1] transition">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[#2E1F1C] leading-snug">{c.menuItem.name}</p>
                    <p className="text-[#6D4C41] text-sm font-bold mt-0.5">{formatPrice(c.menuItem.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(c.menuItem.id)} className="text-[#8A4A42] text-xs font-medium">Xóa</button>
                    <button onClick={() => updateQty(c.menuItem.id, -1)} className="w-7 h-7 rounded-full bg-[#F5E6D3] hover:bg-[#E8D2B8] flex items-center justify-center transition">
                      <Minus className="h-3 w-3 text-[#6D4C41]" />
                    </button>
                    <span className="font-bold text-sm w-6 text-center text-[#2E1F1C]">{c.quantity}</span>
                    <button onClick={() => updateQty(c.menuItem.id, 1)} className="w-7 h-7 rounded-full bg-[#F4A825] hover:bg-[#D48806] flex items-center justify-center transition">
                      <Plus className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-1 bg-[#F5E6D3] border border-[#E4CFB4] rounded-xl p-3">
                <label className="text-xs font-semibold text-[#5D4037]">Ghi chú cho đơn hàng</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú (ít đá, nhiều đường...)"
                  className="w-full mt-1.5 border border-[#DCC2A8] rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[#F4A825] focus:outline-none bg-white text-[#2E1F1C]"
                  rows={2}
                />
              </div>
            </div>
            <div className="sticky bottom-0 border-t border-[#E4CFB4] px-4 py-3 space-y-3 bg-[#F5E6D3]">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-[#2E1F1C]">Tổng cộng</span>
                <span className="text-[#6D4C41] text-xl">{formatPrice(cartTotal)}</span>
              </div>
              <button onClick={placeOrder} disabled={submitting}
                className="w-full bg-[#F4A825] hover:bg-[#D48806] disabled:bg-[#EACB84] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
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


