import type { Order } from '@/types';

interface QrOrdersPanelProps {
  orders: Order[];
  formatPrice: (amount: number) => string;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
}

export default function QrOrdersPanel({ orders, formatPrice, statusLabels, statusColors }: QrOrdersPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-(--coffee-dark)">Đơn của bạn</h2>
        <p className="mt-0.5 text-xs text-[rgba(62,42,31,0.62)]">Chỉ hiển thị đơn đặt từ điện thoại này</p>
      </div>

      {orders.length === 0 ? (
        <div className="coffee-soft-shadow rounded-xl border border-[rgba(111,78,55,0.14)] bg-white/88 py-14 text-center text-[rgba(62,42,31,0.72)]">
          <p className="text-sm font-medium">Chưa có đơn nào</p>
          <p className="mt-1 text-xs text-[rgba(62,42,31,0.58)]">Đặt món ở tab Thực đơn nhé</p>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="coffee-soft-shadow overflow-hidden rounded-xl border border-[rgba(111,78,55,0.14)] bg-white/95">
            <div className="flex items-center justify-between border-b border-[rgba(111,78,55,0.1)] bg-[rgba(245,230,211,0.5)] px-4 py-3">
              <span className="text-sm font-semibold text-(--coffee-dark)">Đơn #{order.id}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                {statusLabels[order.status] || order.status}
              </span>
            </div>
            <div className="space-y-2 px-4 py-3">
              {order.orderItems.map((oi, idx) => (
                <div key={idx} className="flex justify-between gap-3 text-sm">
                  <span className="leading-snug text-[rgba(62,42,31,0.86)]">
                    {oi.menuItemName}
                    {oi.selectedSizeLabel || oi.selectedToppings?.length ? (
                      <span className="text-[rgba(62,42,31,0.58)]"> ({oi.selectedSizeLabel}{oi.selectedSizeLabel && oi.selectedToppings?.length ? ' · ' : ''}{oi.selectedToppings?.map((t) => t.label).join(', ')})</span>
                    ) : null}{' '}
                    ×{oi.quantity}
                  </span>
                  <span className="shrink-0 font-semibold text-[rgba(62,42,31,0.72)]">{formatPrice(oi.subtotal || 0)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-[rgba(111,78,55,0.1)] bg-[rgba(245,230,211,0.3)] px-4 py-3">
              <span className="text-xs text-[rgba(62,42,31,0.6)]">
                {new Date(order.createdAt).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                })}
              </span>
              <span className="text-base font-bold text-(--coffee-primary)">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
