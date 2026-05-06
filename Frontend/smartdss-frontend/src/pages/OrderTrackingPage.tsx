import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import NavbarSection from '@/sections/coffee/NavbarSection';
import FooterSection from '@/sections/coffee/FooterSection';
import { publicOrderTrackingService } from '@/services/publicOrderTrackingService';
import type { OrderTrackingDTO } from '@/types';
import { RefreshCw } from 'lucide-react';
import { Client } from '@stomp/stompjs';

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

function formatOrderStatus(status?: string | null): { label: string; cls: string } {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'PENDING':
      return { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'PREPARING':
      return { label: 'Đang chuẩn bị', cls: 'bg-sky-50 text-sky-800 border-sky-200' };
    case 'COMPLETED':
      return { label: 'Đã hoàn thành', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'CANCELLED':
      return { label: 'Đã hủy', cls: 'bg-rose-50 text-rose-800 border-rose-200' };
    default:
      return { label: 'Chưa rõ', cls: 'bg-gray-50 text-gray-800 border-gray-200' };
  }
}

function formatPaymentStatus(status?: string | null): { label: string; cls: string } {
  const s = (status || '').toUpperCase();
  if (s === 'PAID') return { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  return { label: 'Chờ thanh toán', cls: 'bg-gray-50 text-gray-800 border-gray-200' };
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
    // Auto-load when navigated with prefilled phone
    if (!prefillPhone) return;
    fetchOrders().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime via websocket (anonymous): subscribe only to public topics.
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
        // Public order status updates (online orders only)
        client.subscribe('/topic/public-orders', (message) => {
          let payload: any = null;
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
                  orderStatus: order.status,
                  totalAmount: order.totalAmount,
                  createdAt: order.createdAt,
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
                orderStatus: order.status,
                totalAmount: order.totalAmount ?? o.totalAmount,
                createdAt: order.createdAt ?? o.createdAt,
              };
            });
          });
        });

        // Public payment updates
        client.subscribe('/topic/public-orders-payment', (message) => {
          let payload: any = null;
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
                paymentStatus: payment?.status,
                paymentMethod: payment?.paymentMethod,
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
    <div className="coffee-theme min-h-screen bg-[#fffdf9] text-[var(--coffee-dark)]">
      <NavbarSection />

      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-[var(--coffee-dark)]">Theo dõi đơn hàng</h1>
          <p className="mt-1 text-sm text-gray-600">
            Nhập số điện thoại để xem trạng thái đơn online (chuyển khoản hoặc COD).
          </p>

          <div className="mt-4 flex gap-2">
            <input
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Số điện thoại (VD: 0xxxxxxxxx)"
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => fetchOrders().catch(() => {})}
              disabled={loading}
              className="rounded-lg bg-[var(--coffee-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Xem đơn
            </button>
          </div>

          {orders.length > 0 ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                Tìm thấy {orders.length} đơn gần đây
              </span>
              <button
                type="button"
                onClick={() => fetchOrders().catch(() => {})}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <RefreshCw size={14} />
                Làm mới
              </button>
            </div>
          ) : null}
        </div>

        {loading && (
          <div className="rounded-2xl border bg-white p-6 text-center text-sm text-gray-600">
            Đang tải trạng thái...
          </div>
        )}

        {!loading && orders.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center text-sm text-gray-500">
            Chưa có đơn nào cho số điện thoại này.
          </div>
        ) : null}

        {!loading && orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((o) => {
              const os = formatOrderStatus(o.orderStatus);
              const ps = formatPaymentStatus(o.paymentStatus);
              return (
                <div key={o.orderId} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold">Đơn #{o.orderId}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[var(--coffee-primary)]">{formatPrice(o.totalAmount || 0)}</div>
                      <div className="mt-1 text-xs text-gray-500">Tổng</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${os.cls}`}>
                      {os.label}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${ps.cls}`}>
                      {ps.label}
                    </span>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                      {o.paymentMethod ? `PT: ${o.paymentMethod}` : 'PT: -'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-6 text-center text-xs text-gray-400">
          Lưu ý: trạng thái có thể cập nhật vài giây sau khi quán xử lý.
        </div>
      </div>

      <FooterSection />
    </div>
  );
}

