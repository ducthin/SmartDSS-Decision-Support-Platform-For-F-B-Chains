import { Minus, Plus, Send, X } from 'lucide-react';
import { formatOrderItemExtras, unitPriceWithDrinkOptions } from '@/utils/helpers';
import type { QrDiscountPreview } from '@/types';
import type { CartItem } from '@/components/qr-order/types';

interface QrCartSheetProps {
  open: boolean;
  cart: CartItem[];
  cartCount: number;
  tableName: string;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;
  voucherCode: string;
  onVoucherCodeChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  vat: { netAmount: number; vatAmount: number; grossAmount: number };
  discountPreview: QrDiscountPreview | null;
  onClose: () => void;
  onRemoveFromCart: (lineKey: string) => void;
  onUpdateQty: (lineKey: string, delta: number) => void;
  onPlaceOrder: () => void;
  submitting: boolean;
  formatPrice: (amount: number) => string;
}

export default function QrCartSheet({
  open,
  cart,
  cartCount,
  tableName,
  customerPhone,
  onCustomerPhoneChange,
  voucherCode,
  onVoucherCodeChange,
  note,
  onNoteChange,
  vat,
  discountPreview,
  onClose,
  onRemoveFromCart,
  onUpdateQty,
  onPlaceOrder,
  submitting,
  formatPrice,
}: QrCartSheetProps) {
  if (!open) return null;
  const discountAmount = discountPreview?.totalDiscountAmount || 0;
  const calendarDiscountPercent = discountPreview?.calendarDiscountPercent || 0;
  const calendarDiscountAmount = discountPreview?.calendarDiscountAmount || 0;
  const voucherDiscountAmount = discountPreview?.voucherDiscountAmount || 0;
  const finalAmount = discountAmount > 0 ? discountPreview?.finalAmount ?? vat.grossAmount : vat.grossAmount;

  return (
    <div className="fixed inset-0 z-210 flex flex-col">
      <button
        type="button"
        aria-label="Đóng giỏ hàng"
        className="min-h-0 flex-1 bg-[rgba(62,42,31,0.58)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="max-h-[85dvh] flex flex-col rounded-t-[28px] border-t border-[rgba(111,78,55,0.16)] bg-white shadow-[0_-14px_44px_-22px_rgba(62,42,31,0.5)]">
        <div className="flex justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-[rgba(111,78,55,0.2)]" />
        </div>
        <div className="flex items-center justify-between border-b border-[rgba(111,78,55,0.1)] px-4 py-3">
          <div>
            <h3 className="text-lg font-semibold text-(--coffee-dark)">Giỏ hàng</h3>
            <p className="text-xs text-[rgba(62,42,31,0.62)]">{cartCount} món · Bàn {tableName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="coffee-interactive rounded-xl p-2 text-[rgba(62,42,31,0.45)] hover:bg-[rgba(245,230,211,0.55)] hover:text-(--coffee-dark)"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
          {cart.map((c) => {
            const lineUnit = unitPriceWithDrinkOptions(c.menuItem, c.selectedSizeCode, c.selectedToppingCodes);
            const sizeLabel = c.menuItem.drinkSizes?.find((s) => s.code === c.selectedSizeCode)?.label;
            const extras =
              c.menuItem.drink && (sizeLabel || (c.selectedToppingCodes?.length ?? 0) > 0)
                ? formatOrderItemExtras({
                    selectedSizeLabel: sizeLabel,
                    selectedToppings: (c.selectedToppingCodes || [])
                      .map((code: string) => {
                        const t = c.menuItem.drinkToppings?.find((x) => x.code === code);
                        return t ? { label: t.label } : null;
                      })
                      .filter(Boolean) as { label: string }[],
                  })
                : '';

            return (
              <div key={c.key} className="flex items-center gap-3 rounded-xl border border-[rgba(111,78,55,0.14)] bg-[rgba(245,230,211,0.3)] p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-(--coffee-dark)">
                    {c.menuItem.name}
                    {extras ? <span className="block text-xs font-normal text-[rgba(62,42,31,0.58)]">{extras.trim()}</span> : null}
                  </p>
                  <p className="mt-1 text-sm font-bold text-(--coffee-primary)">{formatPrice(lineUnit)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button type="button" onClick={() => onRemoveFromCart(c.key)} className="text-xs font-semibold text-rose-600 hover:underline">
                    Xóa
                  </button>
                  <div className="flex items-center gap-1 rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-[rgba(111,78,55,0.16)]">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(c.key, -1)}
                      className="coffee-interactive flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(245,230,211,0.64)] text-(--coffee-primary)"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-6 text-center text-sm font-bold tabular-nums">{c.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(c.key, 1)}
                      className="coffee-interactive flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--coffee-primary),var(--coffee-dark))] text-(--coffee-secondary)"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div>
            <input
              value={customerPhone}
              onChange={(e) => onCustomerPhoneChange(e.target.value)}
              placeholder="Số điện thoại của bạn"
              inputMode="tel"
              autoComplete="tel"
              className="mb-2 w-full rounded-xl border border-[rgba(111,78,55,0.2)] px-3 py-2.5 text-sm outline-none focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.2)]"
            />
            <input
              value={voucherCode}
              onChange={(e) => onVoucherCodeChange(e.target.value)}
              placeholder="Mã voucher (nếu có)"
              className="mb-2 w-full rounded-xl border border-[rgba(111,78,55,0.2)] px-3 py-2.5 text-sm uppercase outline-none focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.2)]"
            />
            {voucherCode.trim() && discountPreview?.voucherCode && voucherDiscountAmount > 0 && (
              <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <span className="font-semibold">Đã áp dụng voucher {discountPreview.voucherCode}</span>
                <span className="ml-1">- giảm {formatPrice(voucherDiscountAmount)}</span>
              </div>
            )}
            {voucherCode.trim() && discountPreview?.voucherError && (
              <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {discountPreview.voucherError}
              </div>
            )}
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Ghi chú: ít đá, không đường..."
              className="w-full resize-none rounded-xl border border-[rgba(111,78,55,0.2)] px-3 py-2.5 text-sm outline-none focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.2)]"
              rows={2}
            />
          </div>
        </div>

        <div className="border-t border-[rgba(111,78,55,0.1)] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-[rgba(62,42,31,0.72)]">
              <span>Tạm tính (đã bao gồm thuế)</span>
              <span className="font-medium text-(--coffee-dark)">{formatPrice(vat.grossAmount)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                <div className="flex justify-between gap-3">
                  <span>Ưu đãi đang áp dụng</span>
                  <span className="shrink-0 font-bold">-{formatPrice(discountAmount)}</span>
                </div>
                {calendarDiscountPercent > 0 && (
                  <p className="mt-0.5 text-xs text-emerald-700">
                    {discountPreview?.calendarDiscountLabel || 'Sự kiện/ngày lễ'} giảm {calendarDiscountPercent}%: -{formatPrice(calendarDiscountAmount)}
                  </p>
                )}
                {voucherDiscountAmount > 0 && (
                  <p className="mt-0.5 text-xs text-emerald-700">
                    Voucher{discountPreview?.voucherCode ? ` ${discountPreview.voucherCode}` : ''}: -{formatPrice(voucherDiscountAmount)}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-between text-lg font-bold">
            <span className="text-(--coffee-dark)">Tổng thanh toán</span>
            <span className="text-(--coffee-primary)">{formatPrice(finalAmount)}</span>
          </div>
          <button
            type="button"
            onClick={onPlaceOrder}
            disabled={submitting}
            className="coffee-interactive mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(120deg,var(--coffee-primary),var(--coffee-dark))] py-3.5 text-sm font-bold text-(--coffee-secondary) shadow-lg shadow-[rgba(62,42,31,0.26)] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Đang gửi...' : 'Gửi đơn cho quán'}
          </button>
        </div>
      </div>
    </div>
  );
}
