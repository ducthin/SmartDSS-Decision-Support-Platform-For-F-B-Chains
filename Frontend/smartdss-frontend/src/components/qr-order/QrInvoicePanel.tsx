import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Mail, Printer, Store } from 'lucide-react';
import { qrService } from '@/services/qrService';
import type { Order, QrInvoiceDeliveryMethod, QrInvoiceResponse } from '@/types';

interface QrInvoicePanelProps {
  token: string;
  clientSessionId: string;
  orders: Order[];
  customerPhone: string;
  formatPrice: (amount: number) => string;
  onReloadOrders: () => void;
}

const DELIVERY_OPTIONS: Array<{ value: QrInvoiceDeliveryMethod; label: string; description: string; Icon: typeof Mail }> = [
  { value: 'EMAIL', label: 'Gửi qua Gmail', description: 'Ghi nhận email để quầy gửi hóa đơn cho bạn', Icon: Mail },
  { value: 'DIRECT', label: 'Hiển thị / tải PDF', description: 'Tải file PDF để lưu hoặc mở lên in', Icon: Download },
  { value: 'COUNTER', label: 'Lấy tại quầy', description: 'Gửi yêu cầu để nhân viên in/xuất hóa đơn tại quầy', Icon: Store },
];

export default function QrInvoicePanel({
  token,
  clientSessionId,
  orders,
  customerPhone,
  formatPrice,
  onReloadOrders,
}: QrInvoicePanelProps) {
  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === 'COMPLETED').sort((a, b) => b.id - a.id),
    [orders],
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QrInvoiceResponse | null>(null);
  const [form, setForm] = useState({
    orderId: completedOrders[0]?.id ? String(completedOrders[0].id) : '',
    deliveryMethod: 'DIRECT' as QrInvoiceDeliveryMethod,
    taxCode: '',
    companyName: '',
    address: '',
    email: '',
    phone: customerPhone || '',
  });

  const selectedOrder = completedOrders.find((order) => String(order.id) === form.orderId) || null;

  useEffect(() => {
    if (!form.orderId && completedOrders[0]?.id) {
      setForm((prev) => ({ ...prev, orderId: String(completedOrders[0].id) }));
    }
  }, [completedOrders, form.orderId]);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  };

  const invoicePdfBlob = (base64?: string) => {
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'application/pdf' });
  };

  const openInvoicePdf = (base64?: string) => {
    const blob = invoicePdfBlob(base64);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) {
      toast.error('Trình duyệt đang chặn popup, vui lòng cho phép mở tab mới');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const downloadInvoicePdf = (base64?: string, orderId?: number) => {
    const blob = invoicePdfBlob(base64);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoa-don-don-${orderId || 'qr'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (!form.orderId) {
      toast.error('Vui lòng chọn đơn đã hoàn thành');
      return;
    }
    if (!form.taxCode.trim() || !form.companyName.trim() || !form.address.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin xuất hóa đơn');
      return;
    }

    setSubmitting(true);
    try {
      const res = await qrService.requestInvoice(token, {
        orderId: Number(form.orderId),
        clientSessionId,
        deliveryMethod: form.deliveryMethod,
        taxCode: form.taxCode.trim(),
        companyName: form.companyName.trim(),
        address: form.address.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setResult(res.data.data);
      toast.success(res.data.data.message || 'Đã gửi yêu cầu xuất hóa đơn');
    } catch {
      toast.error('Không gửi được yêu cầu xuất hóa đơn');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-(--coffee-dark)">Xuất hóa đơn GTGT</h2>
        <p className="mt-0.5 text-xs text-[rgba(62,42,31,0.62)]">Chỉ áp dụng cho đơn đã hoàn thành trên điện thoại này</p>
      </div>

      <div className="coffee-soft-shadow rounded-2xl border border-[rgba(111,78,55,0.14)] bg-white/95 p-4">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[rgba(62,42,31,0.72)]">Chọn đơn đã thanh toán</label>
            <select
              value={form.orderId}
              onChange={(e) => updateForm('orderId', e.target.value)}
              onFocus={onReloadOrders}
              className="w-full rounded-xl border border-[rgba(111,78,55,0.2)] bg-white px-3 py-2.5 text-sm outline-none focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.18)]"
            >
              <option value="">Chọn đơn...</option>
              {completedOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  Đơn #{order.id} - {formatPrice(order.totalAmount)}
                </option>
              ))}
            </select>
            {completedOrders.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">Chưa có đơn hoàn thành. Nếu vừa thanh toán, hãy mở tab Đơn của tôi để cập nhật.</p>
            )}
          </div>

          {selectedOrder && (
            <div className="rounded-xl border border-[rgba(228,172,92,0.28)] bg-[rgba(228,172,92,0.1)] px-3 py-2 text-sm text-(--coffee-dark)">
              Đơn #{selectedOrder.id} gồm {selectedOrder.orderItems.length} món, tổng {formatPrice(selectedOrder.totalAmount)}.
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {DELIVERY_OPTIONS.map(({ value, label, description, Icon }) => {
              const active = form.deliveryMethod === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateForm('deliveryMethod', value)}
                  className={`coffee-interactive flex items-start gap-3 rounded-xl border px-3 py-3 text-left ${
                    active
                      ? 'border-(--coffee-accent) bg-[rgba(228,172,92,0.16)]'
                      : 'border-[rgba(111,78,55,0.14)] bg-white'
                  }`}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-(--coffee-primary)" />
                  <span>
                    <span className="block text-sm font-semibold text-(--coffee-dark)">{label}</span>
                    <span className="mt-0.5 block text-xs text-[rgba(62,42,31,0.6)]">{description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 text-center text-base font-semibold text-(--coffee-dark)">Thông tin khách mua hàng</div>

          <input value={form.taxCode} onChange={(e) => updateForm('taxCode', e.target.value)} placeholder="Mã số thuế (*)" className="w-full rounded-xl border border-[rgba(111,78,55,0.2)] px-3 py-2.5 text-sm outline-none" />
          <input value={form.companyName} onChange={(e) => updateForm('companyName', e.target.value)} placeholder="Tên công ty (*)" className="w-full rounded-xl border border-[rgba(111,78,55,0.2)] px-3 py-2.5 text-sm outline-none" />
          <input value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Địa chỉ (*)" className="w-full rounded-xl border border-[rgba(111,78,55,0.2)] px-3 py-2.5 text-sm outline-none" />
          <input value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="Gmail/Email nhận hóa đơn (*)" type="email" className="w-full rounded-xl border border-[rgba(111,78,55,0.2)] px-3 py-2.5 text-sm outline-none" />
          <input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="Điện thoại (*)" type="tel" className="w-full rounded-xl border border-[rgba(111,78,55,0.2)] px-3 py-2.5 text-sm outline-none" />

          <button
            type="button"
            onClick={submit}
            disabled={submitting || completedOrders.length === 0}
            className="coffee-interactive w-full rounded-xl bg-[linear-gradient(120deg,var(--coffee-primary),var(--coffee-dark))] py-3 text-sm font-semibold text-(--coffee-secondary) disabled:opacity-55"
          >
            {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}
          </button>
        </div>
      </div>

      {result && (
        <div className="coffee-soft-shadow rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">{result.message}</p>
          <p className="mt-1 text-xs">Mã yêu cầu: #{result.requestId} - Đơn #{result.orderId}</p>
          {result.invoicePdfBase64 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openInvoicePdf(result.invoicePdfBase64)}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
              >
                <Printer className="h-4 w-4" />
                Mở PDF để in
              </button>
              <button
                type="button"
                onClick={() => downloadInvoicePdf(result.invoicePdfBase64, result.orderId)}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
              >
                <Download className="h-4 w-4" />
                Tải PDF
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
