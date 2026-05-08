import '@/styles/coffee-theme.css';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, TrendingUp, Package, AlertTriangle, Clock, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
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

/* ─── Stat card ──────────────────────────────────────────────────────────────── */

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: string;
}

function StatCard({ title, value, icon: Icon, iconBg, iconColor, trend }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[var(--coffee-radius-md)] border border-[rgba(var(--coffee-primary),0.10)] bg-white p-5 shadow-[var(--coffee-shadow-1)] transition-all hover:shadow-[0_8px_28px_-8px_rgba(26,14,7,0.14)] hover:-translate-y-0.5">
      {/* Subtle gradient shimmer */}
      <div className="pointer-events-none absolute inset-0 rounded-[var(--coffee-radius-md)] bg-[linear-gradient(135deg,rgba(201,162,122,0.04),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(26,14,7,0.45)]">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-[var(--coffee-text-primary)] leading-none">{value}</p>
          {trend && (
            <p className="mt-1.5 text-xs text-[var(--coffee-text-inverse)]">{trend}</p>
          )}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

/* ─── Status badge (exported for reuse) ─────────────────────────────────────── */

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <div className="coffee-theme min-h-screen text-[var(--coffee-dark)]">
      {/* Ambient decorative blobs */}
      <div className="pointer-events-none fixed -left-32 top-1/4 h-96 w-96 rounded-full bg-[rgba(201,162,122,0.08)] blur-3xl" />
      <div className="pointer-events-none fixed -right-32 top-2/3 h-96 w-96 rounded-full bg-[rgba(107,80,64,0.07)] blur-3xl" />
      <DashboardContent />
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = getRoleKey(user?.roleName);
  const isManagerOrAdmin = role === 'ADMIN' || role === 'MANAGER';
  const [orders, setOrders] = useState<Order[]>([]);
  const [hourlyData, setHourlyData] = useState<DailySalesReport[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [taxPolicy, setTaxPolicy] = useState<TaxPolicy>({ vatRatePercent: 8, priceIncludesVat: true });
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(0);
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
        if (res.data?.data) setTaxPolicy(res.data.data);
      })
      .catch(() => { });
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
    if (now - lastReloadRef.current > 10000) {
      lastReloadRef.current = now;
      loadData();
    }
  }, [loadData]);
  useOrderSocket(handleOrderSocket);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(var(--coffee-primary),0.15)] border-t-[var(--coffee-accent)]" />
      </div>
    );
  }

  const todayOrders = orders.filter((o) => getLocalDateKey(new Date(o.createdAt)) === getLocalDateKey(new Date()));
  const todayRevenue = hourlyData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
  const lowStockCount = inventory.filter((i) => i.quantity <= i.minimumStock).length;
  const pendingOrders = orders.filter((o) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.PREPARING);
  const completedToday = todayOrders.filter((o) => o.status === ORDER_STATUS.COMPLETED || (o.status as string) === 'COMPLETED');

  return (
    <div className="space-y-6 p-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--coffee-text-primary)]">Dashboard</h1>
          <p className="mt-0.5 text-sm text-[var(--coffee-text-inverse)]">
            Chào mừng trở lại, <span className="font-medium text-[var(--coffee-primary)]">{user?.fullName}</span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[rgba(var(--coffee-primary),0.12)] bg-white px-3 py-2 text-xs text-[var(--coffee-text-inverse)] shadow-sm">
          <Clock size={13} className="text-[var(--coffee-accent)]" />
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isManagerOrAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
        <StatCard
          title="Đơn hàng hôm nay"
          value={String(todayOrders.length)}
          icon={ShoppingCart}
          iconBg="bg-[rgba(var(--coffee-accent),0.15)]"
          iconColor="text-[var(--coffee-accent)]"
          trend={completedToday.length > 0 ? `${completedToday.length} đã hoàn thành` : undefined}
        />
        {isManagerOrAdmin && (
          <StatCard
            title="Doanh thu hôm nay"
            value={formatCurrency(todayRevenue)}
            icon={TrendingUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            trend="Từ dữ liệu theo giờ"
          />
        )}
        <StatCard
          title="Đơn đang xử lý"
          value={String(pendingOrders.length)}
          icon={Package}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          trend={pendingOrders.length > 0 ? 'Cần xử lý ngay' : 'Không có đơn chờ'}
        />
        {isManagerOrAdmin && (
          <StatCard
            title="Nguyên liệu sắp hết"
            value={String(lowStockCount)}
            icon={AlertTriangle}
            iconBg={lowStockCount > 0 ? 'bg-rose-50' : 'bg-[rgba(var(--coffee-primary),0.06)]'}
            iconColor={lowStockCount > 0 ? 'text-rose-500' : 'text-[rgba(var(--coffee-primary),0.5)]'}
            trend={lowStockCount > 0 ? 'Cần nhập thêm' : 'Kho ổn định'}
          />
        )}
      </div>

      {/* Hourly Revenue Chart */}
      {isManagerOrAdmin && hourlyData.length > 0 && (
        <div className="overflow-hidden rounded-[var(--coffee-radius-md)] border border-[rgba(var(--coffee-primary),0.10)] bg-white shadow-[var(--coffee-shadow-1)]">
          {/* Card top accent */}

          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--coffee-accent)]" />
              <h2 className="text-base font-semibold text-[var(--coffee-text-primary)]">Doanh thu hôm nay theo giờ</h2>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="coffeeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--coffee-accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--coffee-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,80,64,0.07)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(26,14,7,0.45)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: 'rgba(26,14,7,0.45)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid rgba(107,80,64,0.12)', background: '#fffdf9', boxShadow: '0 8px 24px -6px rgba(26,14,7,0.12)' }}
                  labelStyle={{ color: 'var(--coffee-text-primary)', fontWeight: 600 }}
                  labelFormatter={(label) => `Lúc ${label}`}
                  formatter={(v) => [formatCurrency(Number(v)), 'Doanh thu']}
                />
                <Area type="monotone" dataKey="totalRevenue" stroke="var(--coffee-accent)" strokeWidth={2.5} fill="url(#coffeeGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Orders table */}
      <div className="overflow-hidden rounded-[var(--coffee-radius-md)] border border-[rgba(var(--coffee-primary),0.10)] bg-white shadow-[var(--coffee-shadow-1)]">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 border-b border-[rgba(var(--coffee-primary),0.07)]">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-[var(--coffee-accent)]" />
            <h2 className="text-base font-semibold text-[var(--coffee-text-primary)]">Đơn hàng gần đây</h2>
          </div>
          {orders.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--coffee-text-inverse)]">
                Trang {currentPage + 1} / {Math.max(1, Math.ceil(orders.length / PAGE_SIZE))}
              </span>
              <button
                onClick={() => navigate('/orders')}
                className="inline-flex items-center gap-1 rounded-lg border border-[rgba(107,80,64,0.2)] px-3 py-1.5 text-xs font-semibold text-[#6b5040] hover:bg-[rgba(107,80,64,0.06)] transition-colors"
              >
                Xem tất cả <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(var(--coffee-primary),0.07)] bg-[rgba(253,247,240,0.6)]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--coffee-text-inverse)]">#</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--coffee-text-inverse)]">Thu ngân</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--coffee-text-inverse)]">Thanh toán</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--coffee-text-inverse)]">Trạng thái</th>
                <th className="text-left px-3 py-3 pr-5 text-xs font-semibold uppercase tracking-wide text-[var(--coffee-text-inverse)]">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(var(--coffee-primary),0.05)]">
              {orders.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((order) => (
                <tr key={order.id} className="hover:bg-[rgba(253,247,240,0.5)] transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-semibold text-[var(--coffee-primary)]">#{order.id}</span>
                  </td>
                  <td className="px-3 py-3.5 text-[rgba(26,14,7,0.75)]">{order.createdByName ?? 'N/A'}</td>
                  <td className="px-3 py-3.5">
                    {(() => {
                      const tax = calculateVatBreakdown(order.totalAmount ?? 0, taxPolicy.vatRatePercent, taxPolicy.priceIncludesVat);
                      if (!isManagerOrAdmin) {
                        return <div className="font-semibold text-[var(--coffee-primary)]">{formatCurrency(tax.grossAmount)}</div>;
                      }
                      return (
                        <div className="leading-5 text-xs">
                          <div className="text-[rgba(26,14,7,0.55)]">Tạm tính: <span className="font-medium text-[rgba(26,14,7,0.75)]">{formatCurrency(tax.netAmount)}</span></div>
                          <div className="text-[rgba(26,14,7,0.55)]">VAT ({taxPolicy.vatRatePercent}%): <span className="font-medium text-[rgba(26,14,7,0.75)]">{formatCurrency(tax.vatAmount)}</span></div>
                          <div className="font-bold text-[var(--coffee-primary)]">Tổng: {formatCurrency(tax.grossAmount)}</div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-3 py-3.5 pr-5 text-xs text-[var(--coffee-text-inverse)]">
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-[rgba(26,14,7,0.35)]">
                      <CheckCircle2 size={32} className="text-[rgba(107,80,64,0.2)]" />
                      <span className="text-sm">Chưa có đơn hàng</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Page-number pagination */}
        {orders.length > PAGE_SIZE && (() => {
          const totalPages = Math.ceil(orders.length / PAGE_SIZE);
          const pages = Array.from({ length: totalPages }, (_, i) => i);
          return (
            <div className="flex items-center justify-between border-t border-[rgba(107,80,64,0.07)] px-5 py-3">
              <span className="text-xs text-[rgba(26,14,7,0.4)]">
                Hiển thị {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, orders.length)} trong {orders.length} đơn
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[rgba(107,80,64,0.18)] text-[rgba(26,14,7,0.5)] hover:bg-[rgba(107,80,64,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {pages.map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                      p === currentPage
                        ? 'bg-[#6b5040] text-white shadow-sm'
                        : 'border border-[rgba(107,80,64,0.18)] text-[rgba(26,14,7,0.6)] hover:bg-[rgba(107,80,64,0.06)]'
                    }`}
                  >
                    {p + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[rgba(107,80,64,0.18)] text-[rgba(26,14,7,0.5)] hover:bg-[rgba(107,80,64,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
