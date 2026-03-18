import { useEffect, useState, useCallback } from 'react';
import { menuService, categoryService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import type { MenuItem, OrderForm, PageResponse, Category } from '@/types';
import { ShoppingCart, Plus, Minus, Trash2, Send, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { StatusBadge } from './DashboardPage';
import type { Order } from '@/types';
import { ORDER_STATUS } from '@/utils/constants';
import { getApiErrorMessage, formatCurrency } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey } from '@/utils/helpers';

const CATEGORY_ICONS: Record<string, string> = {
  'Cà phê': '☕', 'Trà': '🍵', 'Sinh tố': '🥤', 'Nước ép': '🧃', 'Bánh ngọt': '🍰',
};

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export default function OrdersPage() {
  const [tab, setTab] = useState<'pos' | 'list'>('pos');
  const { user } = useAuth();
  const userRole = getRoleKey(user?.roleName);

  const canUsePOS = ['ADMIN', 'MANAGER', 'WAITER'].includes(userRole);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Đơn hàng</h1>
        <div className="flex bg-[#F5E6D3] rounded-lg p-1">
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      menuService.getAllNoPaging(),
      categoryService.getAllNoPaging(),
    ]).then(([menuRes, catRes]) => {
      setMenuItems((menuRes.data.data || []).filter((m: MenuItem) => m.available));
      setCategories(catRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const filteredItems = selectedCat ? menuItems.filter((m) => m.categoryId === selectedCat) : menuItems;

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) return prev.map((c) => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) => prev.map((c) => c.menuItem.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  };

  const removeFromCart = (id: number) => setCart((prev) => prev.filter((c) => c.menuItem.id !== id));

  const total = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);


  const placeOrder = async () => {
    if (cart.length === 0) return toast.error('Giỏ hàng trống');
    setSubmitting(true);
    const orderForm: OrderForm = {
      orderItems: cart.map((c) => ({ menuItemId: c.menuItem.id, quantity: c.quantity })),
    };
    try {
      await orderService.create(orderForm);
      toast.success('Đặt hàng thành công!');
      setCart([]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi đặt hàng'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Menu */}
      <div className="lg:col-span-2 space-y-4">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedCat(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedCat === null ? 'bg-[#F4A825] text-white' : 'bg-[#F5E6D3] hover:bg-[#EEDCC7]'}`}>
            Tất cả
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedCat === cat.id ? 'bg-[#F4A825] text-white' : 'bg-[#F5E6D3] hover:bg-[#EEDCC7]'}`}>
              {CATEGORY_ICONS[cat.name] || '🍽️'} {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <button key={item.id} onClick={() => addToCart(item)}
              className="bg-white rounded-xl border border-[#E4CFB4] p-4 text-left hover:shadow-md hover:border-[#E4CFB4] transition">
              <div className="text-2xl mb-2">{CATEGORY_ICONS[item.categoryName] || '🍽️'}</div>
              <h3 className="font-medium text-sm truncate">{item.name}</h3>
              <p className="text-xs text-[#A1887F] truncate">{item.categoryName}</p>
              <p className="text-[#D48806] font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <p className="col-span-full text-center text-[#A1887F] py-8">Không có món nào</p>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-xl border border-[#E4CFB4] p-4 h-fit sticky top-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={20} className="text-[#D48806]" />
          <h2 className="font-semibold">Giỏ hàng ({cart.length})</h2>
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-[#A1887F] text-center py-8">Chọn món để thêm vào giỏ</p>
        ) : (
          <div className="space-y-3">
            {cart.map((c) => (
              <div key={c.menuItem.id} className="flex items-center gap-2 p-2 bg-[#FDF6EC] rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.menuItem.name}</p>
                  <p className="text-xs text-[#6D4C41]">{formatCurrency(c.menuItem.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(c.menuItem.id, -1)} className="p-1 rounded hover:bg-[#EEDCC7]"><Minus size={14} /></button>
                  <span className="w-8 text-center text-sm font-medium">{c.quantity}</span>
                  <button onClick={() => updateQty(c.menuItem.id, 1)} className="p-1 rounded hover:bg-[#EEDCC7]"><Plus size={14} /></button>
                </div>
                <button onClick={() => removeFromCart(c.menuItem.id)} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-[#E4CFB4] mt-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Tổng cộng</span>
            <span className="text-xl font-bold text-[#D48806]">{formatCurrency(total)}</span>
          </div>
          <button onClick={placeOrder} disabled={cart.length === 0 || submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#F4A825] text-white py-2.5 rounded-lg font-medium hover:bg-[#D48806] disabled:opacity-50 transition">
            <Send size={18} /> {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderListView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<Order> | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const { user } = useAuth();
  const userRole = getRoleKey(user?.roleName);
  const canPrepareOrComplete = ['ADMIN', 'MANAGER', 'BARISTA'].includes(userRole);
  const canCancel = ['ADMIN', 'MANAGER', 'WAITER'].includes(userRole);

  const loadOrders = useCallback(() => {
    orderService.getAll(page, 10, statusFilter || undefined)
      .then((res) => {
        const data = res.data.data;
        setOrders(data.content);
        setPageData(data);
      })
      .catch(() => toast.error('Lỗi tải đơn hàng'))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  const handleSocketUpdate = useCallback((data?: Order) => {
    if (data && data.id) {
      setOrders(prev => {
        const exists = prev.find(o => o.id === data.id);
        if (exists) {
          return prev.map(o => o.id === data.id ? data : o);
        }
        return prev;
      });
    }
    // Also trigger reload to keep pagination and filters fully consistent
    loadOrders();
  }, [loadOrders]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
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



  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Search size={18} className="text-[#A1887F]" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-[#DCC2A8] rounded-lg focus:ring-2 focus:ring-[#F4A825] outline-none text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="PREPARING">Đang pha chế</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-[#E4CFB4] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FDF6EC]">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-[#6D4C41]">#</th>
              <th className="text-left py-3 px-4 font-medium text-[#6D4C41]">Món</th>
              <th className="text-left py-3 px-4 font-medium text-[#6D4C41]">Tổng tiền</th>
              <th className="text-left py-3 px-4 font-medium text-[#6D4C41]">Trạng thái</th>
              <th className="text-left py-3 px-4 font-medium text-[#6D4C41]">Thời gian</th>
              <th className="text-right py-3 px-4 font-medium text-[#6D4C41]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-[#F1E4D6]">
                <td className="py-3 px-4">{order.id}</td>
                <td className="py-3 px-4 text-[#5D4037]">
                  <div>{order.orderItems?.map((i) => `${i.menuItemName} x${i.quantity}`).join(', ')}</div>
                  {order.note && (
                    <div className="text-sm text-orange-600 mt-1 italic">
                      Ghi chú: {order.note}
                    </div>
                  )}
                  <div className="mt-1">
                    {order.tableNumber ? (
                      <div className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF4E3] text-[#D48806] border border-[#E4CFB4]">
                        <span className="font-medium">{order.tableNumber}</span>
                      </div>
                    ) : (
                      <div className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FDF6EC] text-[#5D4037] border border-[#E4CFB4]">
                        <span className="font-medium">POS</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 font-medium">{formatCurrency(order.totalAmount)}</td>
                <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                <td className="py-3 px-4 text-[#6D4C41]">{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                <td className="py-3 px-4 text-right space-x-1">
                  {order.status === ORDER_STATUS.PENDING && (
                    <>
                      {canPrepareOrComplete && (
                        <button onClick={() => updateStatus(order.id, ORDER_STATUS.PREPARING)} className="px-2 py-1 bg-[#FFE7CC] text-[#D48806] rounded text-xs hover:bg-blue-200">Pha chế</button>
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
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[#A1887F]">Chưa có đơn hàng</td></tr>}
          </tbody>
        </table>
        {pageData && (
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}


