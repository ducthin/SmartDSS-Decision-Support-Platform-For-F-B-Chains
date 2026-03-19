import { useEffect, useState, useCallback, useRef } from 'react';
import { ShoppingCart, DollarSign, Package, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { calculateVatBreakdown, getRoleKey, formatCurrency } from '@/utils/helpers';
import { orderService } from '@/services/orderService';
import { reportService } from '@/services/reportService';
import { inventoryService } from '@/services/inventoryService';
import { publicConfigService } from '@/services/publicConfigService';
import type { Order, DailySalesReport, Inventory, TaxPolicy } from '@/types';
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/utils/constants';
import { useOrderSocket } from '@/hooks/useOrderSocket';

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = getRoleKey(user?.roleName);
  const isManagerOrAdmin = role === 'ADMIN' || role === 'MANAGER';
  const [orders, setOrders] = useState<Order[]>([]);
  const [hourlyData, setHourlyData] = useState<DailySalesReport[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [taxPolicy, setTaxPolicy] = useState<TaxPolicy>({ vatRatePercent: 8, priceIncludesVat: true });
  const [loading, setLoading] = useState(true);
  const lastReloadRef = useRef(0);

  const loadData = useCallback(() => {
    const promises: Promise<unknown>[] = [
      orderService.getAll(0, 50).catch(() => ({ data: { data: { content: [] } } })),
    ];
    if (isManagerOrAdmin) {
      promises.push(
        inventoryService.getAll(0, 100).catch(() => ({ data: { data: { content: [] } } })),
        reportService.hourlySales().catch(() => ({ data: { data: [] } })),
      );
    }
    Promise.all(promises).then((results) => {
      const ordersRes = results[0] as { data: { data: { content: Order[] } } };
      setOrders(ordersRes.data.data.content || []);
      if (isManagerOrAdmin) {
        const invRes = results[1] as { data: { data: { content: Inventory[] } } };
        const hourlyRes = results[2] as { data: { data: DailySalesReport[] } };
        setInventory(invRes.data.data.content || []);
        setHourlyData(hourlyRes.data.data || []);
      }
    }).finally(() => setLoading(false));
  }, [isManagerOrAdmin]);

  useEffect(() => { loadData(); }, [loadData]);
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
  const handleOrderSocket = useCallback((data?: Order) => {
    if (data?.id) {
      setOrders(prev => {
        const exists = prev.find(o => o.id === data.id);
        if (exists) return prev.map(o => o.id === data.id ? data : o);
        return [data, ...prev.slice(0, 49)];
      });
    }
    const now = Date.now();
    // Dashboard has heavy multi-widget fetch; keep fresh but avoid per-event reload storm.
    if (now - lastReloadRef.current > 10000) {
      lastReloadRef.current = now;
      loadData();
    }
  }, [loadData]);
  useOrderSocket(handleOrderSocket);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const todayOrders = orders.filter((o) => {
    const today = getLocalDateKey(new Date());
    return getLocalDateKey(new Date(o.createdAt)) === today;
  });
  const todayRevenue = hourlyData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
  const lowStockCount = inventory.filter((i) => i.quantity <= i.minimumStock).length;
  const pendingOrders = orders.filter((o) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.PREPARING);



  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isManagerOrAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
        <StatCard title="Đơn hàng hôm nay" value={String(todayOrders.length)} icon={ShoppingCart} color="bg-blue-100 text-blue-600" />
        {isManagerOrAdmin && <StatCard title="Doanh thu hôm nay" value={formatCurrency(todayRevenue)} icon={DollarSign} color="bg-green-100 text-green-600" />}
        <StatCard title="Đơn đang xử lý" value={String(pendingOrders.length)} icon={Package} color="bg-yellow-100 text-yellow-600" />
        {isManagerOrAdmin && <StatCard title="Nguyên liệu sắp hết" value={String(lowStockCount)} icon={AlertTriangle} color="bg-red-100 text-red-600" />}
      </div>

      {/* Hourly Revenue Chart */}
      {isManagerOrAdmin && hourlyData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Doanh thu hôm nay theo giờ</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                labelFormatter={(label) => `Lúc ${label}`}
                formatter={(v) => [formatCurrency(Number(v)), 'Doanh thu']}
              />
              <Area type="monotone" dataKey="totalRevenue" stroke="#3b82f6" strokeWidth={2} fill="url(#dashGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Đơn hàng gần đây</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-500">#</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Thu ngân</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Thanh toán</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Trạng thái</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="border-b border-gray-100">
                  <td className="py-3 px-2">{order.id}</td>
                  <td className="py-3 px-2">{order.createdByName ?? 'N/A'}</td>
                  <td className="py-3 px-2">
                    {(() => {
                      const tax = calculateVatBreakdown(order.totalAmount ?? 0, taxPolicy.vatRatePercent, taxPolicy.priceIncludesVat);
                      if (!isManagerOrAdmin) {
                        return <div className="font-medium">{formatCurrency(tax.grossAmount)}</div>;
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
                  <td className="py-3 px-2">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-2 text-gray-500">{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Chưa có đơn hàng</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
