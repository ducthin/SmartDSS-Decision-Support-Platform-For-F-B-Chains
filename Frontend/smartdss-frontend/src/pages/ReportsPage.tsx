import { useEffect, useState } from 'react';
import { reportService } from '@/services/reportService';
import type { DailySalesReport, BestProduct, Inventory } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';

export default function ReportsPage() {
  const [tab, setTab] = useState<'daily' | 'weekly' | 'best' | 'low'>('daily');
  const [dailyData, setDailyData] = useState<DailySalesReport[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailySalesReport[]>([]);
  const [bestProducts, setBestProducts] = useState<BestProduct[]>([]);
  const [lowStock, setLowStock] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportService.dailySales().catch(() => ({ data: { data: [] } })),
      reportService.weeklySales().catch(() => ({ data: { data: [] } })),
      reportService.bestProducts().catch(() => ({ data: { data: [] } })),
      reportService.lowStock().catch(() => ({ data: { data: [] } })),
    ]).then(([d, w, b, l]) => {
      setDailyData(d.data.data || []);
      setWeeklyData(w.data.data || []);
      setBestProducts(b.data.data || []);
      setLowStock(l.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const formatCurrency = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const tabs = [
    { key: 'daily', label: 'Doanh thu ngày' },
    { key: 'weekly', label: 'Doanh thu tuần' },
    { key: 'best', label: 'Bán chạy nhất' },
    { key: 'low', label: 'Sắp hết hàng' },
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Báo cáo</h1>

      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.key ? 'bg-white shadow' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tab === 'daily' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Doanh thu theo ngày</h2>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Doanh thu" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-12">Chưa có dữ liệu</p>}
          </div>
        )}

        {tab === 'weekly' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Doanh thu theo tuần</h2>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="totalRevenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Doanh thu" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-12">Chưa có dữ liệu</p>}
          </div>
        )}

        {tab === 'best' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Sản phẩm bán chạy nhất</h2>
            {bestProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-medium text-gray-500">#</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Sản phẩm</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Số lượng bán</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestProducts.map((p, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-3 px-2">{i + 1}</td>
                        <td className="py-3 px-2 font-medium">{p.menuItemName}</td>
                        <td className="py-3 px-2">{p.totalQuantitySold}</td>
                        <td className="py-3 px-2">{formatCurrency(p.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-gray-400 text-center py-12">Chưa có dữ liệu</p>}
          </div>
        )}

        {tab === 'low' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Nguyên liệu sắp hết</h2>
            {lowStock.length > 0 ? (
              <div className="space-y-3">
                {lowStock.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle size={20} className="text-red-500 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">{item.ingredientName}</p>
                      <p className="text-sm text-gray-500">
                        Tồn: <span className="text-red-600 font-medium">{item.quantity} {item.unit}</span> / Tối thiểu: {item.minimumStock} {item.unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-green-600 text-center py-12">Tất cả nguyên liệu đều đủ hàng!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
