import { useEffect, useState, useCallback } from 'react';
import { ShoppingCart, DollarSign, Package, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey, formatCurrency } from '@/utils/helpers';
import { orderService } from '@/services/orderService';
import { reportService } from '@/services/reportService';
import { inventoryService } from '@/services/inventoryService';
import type { Order, DailySalesReport, Inventory } from '@/types';
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/utils/constants';
import { useOrderSocket } from '@/hooks/useOrderSocket';

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E4CFB4] p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#5D4037]">{title}</p>
          <p className="text-2xl font-bold mt-1 text-[#2E1F1C]">{value}</p>
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
  const [dailySales, setDailySales] = useState<DailySalesReport[]>([]);
  const [hourlyData, setHourlyData] = useState<DailySalesReport[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    const promises: Promise<unknown>[] = [
      orderService.getAll(0, 50).catch(() => ({ data: { data: { content: [] } } })),
    ];
    if (isManagerOrAdmin) {
      promises.push(
        reportService.dailySales().catch(() => ({ data: { data: [] } })),
        inventoryService.getAll(0, 100).catch(() => ({ data: { data: { content: [] } } })),
        reportService.hourlySales().catch(() => ({ data: { data: [] } })),
      );
    }
    Promise.all(promises).then((results) => {
      const ordersRes = results[0] as { data: { data: { content: Order[] } } };
      setOrders(ordersRes.data.data.content || []);
      if (isManagerOrAdmin) {
        const salesRes = results[1] as { data: { data: DailySalesReport[] } };
        const invRes = results[2] as { data: { data: { content: Inventory[] } } };
        const hourlyRes = results[3] as { data: { data: DailySalesReport[] } };
        setDailySales(salesRes.data.data || []);
        setInventory(invRes.data.data.content || []);
        setHourlyData(hourlyRes.data.data || []);
      }
    }).finally(() => setLoading(false));
  }, [isManagerOrAdmin]);

  useEffect(() => { loadData(); }, [loadData]);
  useOrderSocket(loadData);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F4A825]" />
      </div>
    );
  }

  const todayOrders = orders.filter((o) => {
    const today = new Date().toISOString().split('T')[0];
    return o.createdAt?.startsWith(today);
  });
  const todayRevenue = dailySales.length > 0 ? dailySales[0].totalRevenue : 0;
  const lowStockCount = inventory.filter((i) => i.quantity <= i.minimumStock).length;
  const pendingOrders = orders.filter((o) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.PREPARING);



  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#2E1F1C]">Dashboard</h1>

      {/* Stats */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isManagerOrAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
        <StatCard title="Đơn hàng hôm nay" value={String(todayOrders.length)} icon={ShoppingCart} color="bg-[#F5E6D3] text-[#6D4C41]" />
        {isManagerOrAdmin && <StatCard title="Doanh thu hôm nay" value={formatCurrency(todayRevenue)} icon={DollarSign} color="bg-[#FFE7CC] text-[#D48806]" />}
        <StatCard title="Đơn đang xử lý" value={String(pendingOrders.length)} icon={Package} color="bg-[#F3E5AB] text-[#8A6A00]" />
        {isManagerOrAdmin && <StatCard title="Nguyên liệu sắp hết" value={String(lowStockCount)} icon={AlertTriangle} color="bg-[#F6E8E6] text-[#8A4A42]" />}
      </div>

      {/* Hourly Revenue Chart */}
      {isManagerOrAdmin && hourlyData.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E4CFB4] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2E1F1C] mb-4">Doanh thu hôm nay theo giờ</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D48806" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#D48806" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEDFCF" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6D4C41' }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#6D4C41' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #DCC2A8', backgroundColor: '#FDF6EC' }}
                labelFormatter={(label) => `Lúc ${label}`}
                formatter={(v) => [formatCurrency(Number(v)), 'Doanh thu']}
              />
              <Area type="monotone" dataKey="totalRevenue" stroke="#D48806" strokeWidth={2} fill="url(#dashGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-[#E4CFB4] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#2E1F1C] mb-4">Đơn hàng gần đây</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E9D8C4]">
                <th className="text-left py-3 px-2 font-medium text-[#6D4C41]">Id</th>
                <th className="text-left py-3 px-2 font-medium text-[#6D4C41]">Thu ngân</th>
                <th className="text-left py-3 px-2 font-medium text-[#6D4C41]">Tổng tiền</th>
                <th className="text-left py-3 px-2 font-medium text-[#6D4C41]">Trạng thái</th>
                <th className="text-left py-3 px-2 font-medium text-[#6D4C41]">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="border-b border-[#F1E4D6]">
                  <td className="py-3 px-2 text-[#2E1F1C]">{order.id}</td>
                  <td className="py-3 px-2 text-[#2E1F1C]">{order.createdByName ?? 'N/A'}</td>
                  <td className="py-3 px-2 text-[#2E1F1C]">{formatCurrency(order.totalAmount)}</td>
                  <td className="py-3 px-2">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-2 text-[#6D4C41]">{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-[#A1887F]">Chưa có đơn hàng</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_STYLES[status] ?? 'bg-[#F5E6D3] text-[#5D4037]'}`}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}


