import { useEffect, useState, useCallback } from 'react';
import { reportService } from '@/services/reportService';
import type { DailySalesReport, BestProduct, Inventory } from '@/types';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, Calendar } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function formatWeeklyDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = DAY_NAMES[d.getDay()];
  return `${day} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'daily' | 'weekly' | 'best' | 'low'>('daily');
  const [hourlyData, setHourlyData] = useState<DailySalesReport[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailySalesReport[]>([]);
  const [bestProducts, setBestProducts] = useState<BestProduct[]>([]);
  const [lowStock, setLowStock] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [weeklyDate, setWeeklyDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadData = useCallback(() => {
    Promise.all([
      reportService.hourlySales(dailyDate).catch(() => ({ data: { data: [] } })),
      reportService.weeklySales(weeklyDate).catch(() => ({ data: { data: [] } })),
      reportService.bestProducts().catch(() => ({ data: { data: [] } })),
      reportService.lowStock().catch(() => ({ data: { data: [] } })),
    ]).then(([h, w, b, l]) => {
      setHourlyData(h.data.data || []);
      setWeeklyData((w.data.data || []).map((d: DailySalesReport) => ({ ...d, label: formatWeeklyDate(d.date) })));
      setBestProducts(b.data.data || []);
      setLowStock(l.data.data || []);
      setLoading(false);
    });
  }, [dailyDate, weeklyDate]);

  useEffect(() => { loadData(); }, [loadData]);



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

      <div className="flex gap-2 bg-[#F5E6D3] rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.key ? 'bg-white shadow' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E4CFB4] p-6">
        {tab === 'daily' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Doanh thu theo giờ</h2>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#A1887F]" />
                <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)}
                  className="px-3 py-1.5 border border-[#DCC2A8] rounded-lg text-sm focus:ring-2 focus:ring-[#F4A825] outline-none" />
              </div>
            </div>
            {hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} label={{ value: 'Giờ', position: 'insideBottomRight', offset: -5 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }}
                    label={{ value: 'Doanh thu (VNĐ)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }}
                    label={{ value: 'Số đơn', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                    labelFormatter={(label) => `Lúc ${label}`}
                    formatter={(v, name) =>
                      name === 'Doanh thu' ? formatCurrency(Number(v)) : `${v} đơn`
                    }
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="totalRevenue" name="Doanh thu"
                    stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorRevenue)" dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                  <Area yAxisId="right" type="monotone" dataKey="totalOrders" name="Số đơn"
                    stroke="#f59e0b" strokeWidth={2} fill="url(#colorOrders)" dot={{ r: 2, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-[#A1887F] text-center py-12">Chưa có dữ liệu</p>}
          </div>
        )}

        {tab === 'weekly' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Doanh thu theo tuần</h2>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#A1887F]" />
                <input type="date" value={weeklyDate} onChange={(e) => setWeeklyDate(e.target.value)}
                  className="px-3 py-1.5 border border-[#DCC2A8] rounded-lg text-sm focus:ring-2 focus:ring-[#F4A825] outline-none" />
              </div>
            </div>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="totalRevenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Doanh thu" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-[#A1887F] text-center py-12">Chưa có dữ liệu</p>}
          </div>
        )}

        {tab === 'best' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Sản phẩm bán chạy nhất</h2>
            {bestProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E4CFB4]">
                      <th className="text-left py-3 px-2 font-medium text-[#6D4C41]">#</th>
                      <th className="text-left py-3 px-2 font-medium text-[#6D4C41]">Sản phẩm</th>
                      <th className="text-left py-3 px-2 font-medium text-[#6D4C41]">Số lượng bán</th>
                      <th className="text-left py-3 px-2 font-medium text-[#6D4C41]">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestProducts.map((p, i) => (
                      <tr key={i} className="border-b border-[#F1E4D6]">
                        <td className="py-3 px-2">{i + 1}</td>
                        <td className="py-3 px-2 font-medium">{p.menuItemName}</td>
                        <td className="py-3 px-2">{p.totalQuantitySold}</td>
                        <td className="py-3 px-2">{formatCurrency(p.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-[#A1887F] text-center py-12">Chưa có dữ liệu</p>}
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
                      <p className="text-sm text-[#6D4C41]">
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


