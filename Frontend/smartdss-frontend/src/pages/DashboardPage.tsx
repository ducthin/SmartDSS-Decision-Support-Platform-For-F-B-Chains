import { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Package, AlertTriangle, Cloud, Droplets, Wind, Thermometer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey } from '@/utils/helpers';
import { orderService } from '@/services/orderService';
import { reportService } from '@/services/reportService';
import { inventoryService } from '@/services/inventoryService';
import { weatherService } from '@/services/weatherService';
import type { Order, DailySalesReport, Inventory, WeatherData } from '@/types';
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/utils/constants';

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
  const [dailySales, setDailySales] = useState<DailySalesReport[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const promises: Promise<unknown>[] = [
      orderService.getAll(0, 50).catch(() => ({ data: { data: { content: [] } } })),
      weatherService.getToday().catch(() => ({ data: { data: null } })),
    ];
    if (isManagerOrAdmin) {
      promises.push(
        reportService.dailySales().catch(() => ({ data: { data: [] } })),
        inventoryService.getAll(0, 100).catch(() => ({ data: { data: { content: [] } } })),
      );
    }
    Promise.all(promises).then((results) => {
      const ordersRes = results[0] as { data: { data: { content: Order[] } } };
      const weatherRes = results[1] as { data: { data: WeatherData | null } };
      setOrders(ordersRes.data.data.content || []);
      setWeather(weatherRes.data.data);
      if (isManagerOrAdmin) {
        const salesRes = results[2] as { data: { data: DailySalesReport[] } };
        const invRes = results[3] as { data: { data: { content: Inventory[] } } };
        setDailySales(salesRes.data.data || []);
        setInventory(invRes.data.data.content || []);
      }
    }).finally(() => setLoading(false));
  }, [isManagerOrAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

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

      {/* Weather Widget */}
      {weather && (
        <div className="bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Cloud size={20} /> Thời tiết {weather.city}
              </h2>
              <p className="text-3xl font-bold mt-2">{weather.temperature.toFixed(1)}°C</p>
              <p className="text-white/80 capitalize">{weather.description}</p>
            </div>
            <img
              src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
              alt={weather.description}
              className="w-20 h-20"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <Thermometer size={16} />
              <span className="text-sm">Cảm giác: {weather.feelsLike.toFixed(1)}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets size={16} />
              <span className="text-sm">Độ ẩm: {weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind size={16} />
              <span className="text-sm">Gió: {weather.windSpeed} m/s</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud size={16} />
              <span className="text-sm">Mưa: {weather.rainfall} mm</span>
            </div>
          </div>
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
                <th className="text-left py-3 px-2 font-medium text-gray-500">Tổng tiền</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Trạng thái</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="border-b border-gray-100">
                  <td className="py-3 px-2">{order.id}</td>
                  <td className="py-3 px-2">{order.createdByName ?? 'N/A'}</td>
                  <td className="py-3 px-2">{formatCurrency(order.totalAmount)}</td>
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

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
