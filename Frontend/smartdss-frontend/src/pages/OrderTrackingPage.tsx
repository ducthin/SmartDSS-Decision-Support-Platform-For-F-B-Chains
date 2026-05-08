import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import NavbarSection from '@/sections/coffee/NavbarSection';
import FooterSection from '@/sections/coffee/FooterSection';
import { publicOrderTrackingService } from '@/services/publicOrderTrackingService';
import type { OrderTrackingDTO } from '@/types';
import { RefreshCw, Search, PackageSearch, CheckCircle2, Clock, ChefHat, XCircle, CreditCard, Banknote } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import '@/styles/coffee-theme.css';

function formatPrice(price: number): string {
  const safePrice = Number.isFinite(price) ? price : 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(safePrice);
}

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+84')) return `0${cleaned.slice(3)}`;
  if (cleaned.startsWith('84') && cleaned.length > 9) return `0${cleaned.slice(2)}`;
  return cleaned;
}

function formatOrderStatus(status?: string | null): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ReactNode;
  step: number;
} {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'PENDING':
      return {
        label: 'Chờ xác nhận',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-800',
        borderClass: 'border-amber-200',
        icon: <Clock className="h-4 w-4" />,
        step: 1,
      };
    case 'PREPARING':
      return {
        label: 'Đang pha chế',
        bgClass: 'bg-[rgba(107,80,64,0.08)]',
        textClass: 'text-[var(--coffee-dark)]',
        borderClass: 'border-[rgba(107,80,64,0.25)]',
        icon: <ChefHat className="h-4 w-4" />,
        step: 2,
      };
    case 'COMPLETED':
      return {
        label: 'Đã hoàn thành',
        bgClass: 'bg-emerald-50',
        textClass: 'text-emerald-800',
        borderClass: 'border-emerald-200',
        icon: <CheckCircle2 className="h-4 w-4" />,
        step: 3,
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        bgClass: 'bg-rose-50',
        textClass: 'text-rose-700',
        borderClass: 'border-rose-200',
        icon: <XCircle className="h-4 w-4" />,
        step: -1,
      };
    default:
      return {
        label: 'Chưa rõ',
        bgClass: 'bg-gray-50',
        textClass: 'text-gray-600',
        borderClass: 'border-gray-200',
        icon: <Clock className="h-4 w-4" />,
        step: 0,
      };
  }
}

function formatPaymentStatus(status?: string | null): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ReactNode;
} {
  const s = (status || '').toUpperCase();
  if (s === 'PAID')
    return {
      label: 'Đã thanh toán',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-800',
      borderClass: 'border-emerald-200',
      icon: <CreditCard className="h-3.5 w-3.5" />,
    };
  return {
    label: 'Chờ thanh toán',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-600',
    borderClass: 'border-gray-200',
    icon: <Banknote className="h-3.5 w-3.5" />,
  };
}

/** Mini step-bar for order status */
function OrderProgressBar({ step }: { step: number }) {
  if (step < 0) return null;
  const steps = [
    { label: 'Chờ', icon: '📋' },
    { label: 'Pha chế', icon: '☕' },
    { label: 'Xong', icon: '✅' },
  ];
  return (
    <div className="mt-4 flex items-center gap-0">
      {steps.map((s, idx) => {
        const stepNum = idx + 1;
        const done = step >= stepNum;
        const active = step === stepNum;
        return (
          <div key={idx} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm border-2 transition-all duration-300 ${
                  done
                    ? 'border-[var(--coffee-primary)] bg-[var(--coffee-primary)] text-white'
                    : 'border-[rgba(107,80,64,0.2)] bg-white text-[rgba(107,80,64,0.4)]'
                } ${active ? 'scale-110 shadow-md' : ''}`}
              >
                {s.icon}
              </div>
              <span className={`text-[10px] font-medium ${done ? 'text-[var(--coffee-primary)]' : 'text-[rgba(107,80,64,0.4)]'}`}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 rounded-full transition-all duration-500 ${step > stepNum ? 'bg-[var(--coffee-primary)]' : 'bg-[rgba(107,80,64,0.12)]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderTrackingPage() {
  const [searchParams] = useSearchParams();

  const prefillPhone = searchParams.get('customerPhone') || '';
  const [phoneInput, setPhoneInput] = useState(prefillPhone);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderTrackingDTO[]>([]);
  const [trackingPhone, setTrackingPhone] = useState('');

  const normalizedPhone = useMemo(() => normalizePhone(phoneInput).trim(), [phoneInput]);

  const fetchOrders = async () => {
    const phone = normalizedPhone;
    if (!phone) {
      toast.error('Vui lòng nhập số điện thoại');
      return;
    }

    setLoading(true);
    try {
      const res = await publicOrderTrackingService.trackByCustomerPhone(phone);
      setOrders(res.data.data || []);
      setTrackingPhone(phone);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải trạng thái đơn hàng';
      toast.error(message);
      setOrders([]);
      setTrackingPhone('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!prefillPhone) return;
    fetchOrders().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!trackingPhone) return;

    const client = new Client({
      brokerURL: import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws',
      connectHeaders: {},
      reconnectDelay: 5000,
      onStompError: (frame) => {
        console.error('STOMP error', frame.headers['message'], frame.body);
      },
      onWebSocketError: (evt) => {
        console.error('WebSocket error', evt);
      },
      onConnect: () => {
        client.subscribe('/topic/public-orders', (message) => {
          let payload: Record<string, unknown> | null = null;
          try {
            payload = JSON.parse(message.body);
          } catch {
            return;
          }

          const order = payload;
          if (!order?.customerPhone) return;
          const incomingPhone = normalizePhone(String(order.customerPhone)).trim();
          if (incomingPhone !== trackingPhone) return;

          const incomingOrderId = Number(order.id);
          if (!Number.isFinite(incomingOrderId)) return;

          setOrders((prev) => {
            const exists = prev.some((o) => o.orderId === incomingOrderId);
            if (!exists) {
              return [
                {
                  orderId: incomingOrderId,
                  orderStatus: String(order?.status ?? ''),
                  totalAmount: Number(order?.totalAmount ?? 0),
                  createdAt: String(order?.createdAt ?? ''),
                  paymentStatus: 'PENDING',
                  paymentMethod: 'PENDING',
                },
                ...prev,
              ];
            }
            return prev.map((o) => {
              if (o.orderId !== incomingOrderId) return o;
              return {
                ...o,
                orderStatus: String(order?.status ?? o.orderStatus),
                totalAmount: Number(order?.totalAmount ?? o.totalAmount),
                createdAt: String(order?.createdAt ?? o.createdAt),
              };
            });
          });
        });

        client.subscribe('/topic/public-orders-payment', (message) => {
          let payload: Record<string, unknown> | null = null;
          try {
            payload = JSON.parse(message.body);
          } catch {
            return;
          }

          const payment = payload;
          const incomingOrderId = Number(payment?.orderId);
          if (!Number.isFinite(incomingOrderId)) return;

          setOrders((prev) =>
            prev.map((o) => {
              if (o.orderId !== incomingOrderId) return o;
              return {
                ...o,
                paymentStatus: String(payment?.status ?? o.paymentStatus),
                paymentMethod: String(payment?.paymentMethod ?? o.paymentMethod),
              };
            }),
          );
        });
      },
    });

    client.activate();
    return () => {
      client.deactivate();
    };
  }, [trackingPhone]);

  return (
    <div className="coffee-theme min-h-screen text-[var(--coffee-dark)]">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed -left-32 top-1/4 h-96 w-96 rounded-full bg-[rgba(201,162,122,0.08)] blur-3xl" />
      <div className="pointer-events-none fixed -right-32 top-2/3 h-96 w-96 rounded-full bg-[rgba(107,80,64,0.07)] blur-3xl" />

      <NavbarSection />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">

        {/* Hero heading */}
        <div className="mb-8 text-center animate-fade-in-up">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c9a27a,#6b5040)] text-white shadow-[0_12px_32px_-8px_rgba(107,80,64,0.45)]">
            <PackageSearch className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">Theo dõi đơn hàng</h1>
          <p className="mt-1.5 text-sm text-[rgba(26,14,7,0.55)]">
            Nhập số điện thoại để xem trạng thái đơn online (chuyển khoản hoặc COD).
          </p>
        </div>

        {/* Search card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.12)] bg-white shadow-[0_8px_32px_-8px_rgba(26,14,7,0.10)]">
          <div className="h-1 w-full bg-[linear-gradient(90deg,#c9a27a,#6b5040,#c9a27a)]" />

          <div className="p-5 sm:p-6">
            <label htmlFor="order-phone-input" className="block text-sm font-semibold text-[var(--coffee-dark)] mb-2">
              Số điện thoại
            </label>
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(107,80,64,0.4)]" />
                <input
                  id="order-phone-input"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchOrders().catch(() => {}); }}
                  placeholder="Ví dụ: 0912345678"
                  className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] bg-[#fffdf9] pl-9 pr-4 py-2.5 text-sm outline-none transition focus:border-[var(--coffee-accent)] focus:ring-4 focus:ring-[rgba(201,162,122,0.18)]"
                />
              </div>
              <button
                type="button"
                id="order-search-btn"
                onClick={() => fetchOrders().catch(() => {})}
                disabled={loading}
                className="coffee-interactive inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--coffee-primary),var(--coffee-dark))] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_-4px_rgba(107,80,64,0.45)] disabled:opacity-60 transition hover:brightness-110 active:scale-95"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Xem đơn
              </button>
            </div>

            {orders.length > 0 && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-[rgba(26,14,7,0.45)]">
                  ✦ Tìm thấy <strong>{orders.length}</strong> đơn gần đây cho <strong>{trackingPhone}</strong>
                </span>
                <button
                  type="button"
                  id="order-refresh-btn"
                  onClick={() => fetchOrders().catch(() => {})}
                  disabled={loading}
                  className="coffee-interactive inline-flex items-center gap-1.5 rounded-lg border border-[rgba(107,80,64,0.18)] px-3 py-1.5 text-xs font-semibold text-[var(--coffee-primary)] hover:bg-[rgba(107,80,64,0.05)] disabled:opacity-60 transition"
                >
                  <RefreshCw size={12} />
                  Làm mới
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-[rgba(107,80,64,0.08)] bg-white p-5 animate-pulse">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 rounded bg-[rgba(107,80,64,0.08)]" />
                    <div className="h-3 w-36 rounded bg-[rgba(107,80,64,0.05)]" />
                  </div>
                  <div className="h-5 w-20 rounded bg-[rgba(107,80,64,0.08)]" />
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-7 w-28 rounded-full bg-[rgba(107,80,64,0.06)]" />
                  <div className="h-7 w-28 rounded-full bg-[rgba(107,80,64,0.06)]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state (after search) */}
        {!loading && orders.length === 0 && trackingPhone && (
          <div className="rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(107,80,64,0.06)]">
              <PackageSearch className="h-8 w-8 text-[rgba(107,80,64,0.35)]" />
            </div>
            <p className="font-semibold text-[var(--coffee-dark)]">Không tìm thấy đơn hàng</p>
            <p className="mt-1 text-sm text-[rgba(26,14,7,0.5)]">
              Chưa có đơn nào cho số <strong>{trackingPhone}</strong>.
            </p>
          </div>
        )}

        {/* Initial state (before first search) */}
        {!loading && orders.length === 0 && !trackingPhone && (
          <div className="rounded-2xl border border-dashed border-[rgba(107,80,64,0.18)] bg-white/60 p-10 text-center">
            <span className="text-4xl">☕</span>
            <p className="mt-3 text-sm text-[rgba(26,14,7,0.45)]">
              Nhập số điện thoại và bấm <strong>Xem đơn</strong> để bắt đầu
            </p>
          </div>
        )}

        {/* Order cards */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((o) => {
              const os = formatOrderStatus(o.orderStatus);
              const ps = formatPaymentStatus(o.paymentStatus);
              const isCancelled = o.orderStatus?.toUpperCase() === 'CANCELLED';
              return (
                <div
                  key={o.orderId}
                  className="overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.10)] bg-white shadow-[0_4px_20px_-6px_rgba(26,14,7,0.08)] transition-all hover:shadow-[0_8px_32px_-8px_rgba(26,14,7,0.14)]"
                >
                  {/* Card accent stripe */}
                  <div
                    className="h-1 w-full"
                    style={{
                      background: isCancelled
                        ? 'linear-gradient(90deg,#fca5a5,#f87171)'
                        : o.orderStatus?.toUpperCase() === 'COMPLETED'
                        ? 'linear-gradient(90deg,#6ee7b7,#34d399)'
                        : 'linear-gradient(90deg,#c9a27a,#6b5040,#c9a27a)',
                    }}
                  />

                  <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-[var(--coffee-dark)]">Đơn #{o.orderId}</span>
                          {o.orderStatus?.toUpperCase() === 'COMPLETED' && (
                            <span className="text-emerald-500 text-sm">✓</span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-[rgba(26,14,7,0.45)]">
                          {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold" style={{ color: 'var(--coffee-primary)' }}>
                          {formatPrice(o.totalAmount || 0)}
                        </div>
                        <div className="mt-0.5 text-xs text-[rgba(26,14,7,0.4)]">Tổng tiền</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {!isCancelled && <OrderProgressBar step={os.step} />}

                    {/* Badges */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${os.bgClass} ${os.textClass} ${os.borderClass}`}
                      >
                        {os.icon}
                        {os.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${ps.bgClass} ${ps.textClass} ${ps.borderClass}`}
                      >
                        {ps.icon}
                        {ps.label}
                      </span>
                      {o.paymentMethod && o.paymentMethod !== 'PENDING' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(107,80,64,0.15)] bg-[rgba(107,80,64,0.05)] px-3 py-1 text-xs font-semibold text-[var(--coffee-primary)]">
                          PT: {o.paymentMethod}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-[rgba(26,14,7,0.38)]">
          <span className="h-px w-8 bg-[rgba(107,80,64,0.15)] inline-block" />
          Trạng thái cập nhật tự động — có thể mất vài giây sau khi quán xử lý
          <span className="h-px w-8 bg-[rgba(107,80,64,0.15)] inline-block" />
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
