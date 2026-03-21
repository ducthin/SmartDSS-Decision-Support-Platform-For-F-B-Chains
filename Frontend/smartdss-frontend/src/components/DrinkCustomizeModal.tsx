import { useEffect, useState } from 'react';
import type { MenuItem } from '@/types';
import { formatCurrency, unitPriceWithDrinkOptions } from '@/utils/helpers';
import Modal from '@/components/ui/Modal';

type Props = {
  open: boolean;
  item: MenuItem | null;
  /** Mở modal với size sẵn (vd. sau khi bấm + topping) */
  initialSizeCode?: string | null;
  title?: string;
  onClose: () => void;
  /** Called with chosen size (required) and topping codes */
  onConfirm: (sizeCode: string, toppingCodes: string[]) => void;
  /** `qr` — tông cam giống menu QR; mặc định xanh cho POS */
  variant?: 'default' | 'qr';
};

export default function DrinkCustomizeModal({
  open,
  item,
  initialSizeCode,
  title,
  onClose,
  onConfirm,
  variant = 'default',
}: Props) {
  const [sizeCode, setSizeCode] = useState('');
  const [toppingCodes, setToppingCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!item || !open) return;
    const sizes = item.drinkSizes || [];
    const codes = sizes.map((s) => s.code);
    const pick =
      initialSizeCode && codes.includes(initialSizeCode)
        ? initialSizeCode
        : sizes[0]?.code ?? '';
    setSizeCode(pick);
    setToppingCodes(new Set());
  }, [item, open, initialSizeCode]);

  if (!item) return null;

  const sizes = item.drinkSizes || [];
  const toppings = item.drinkToppings || [];
  const unit = unitPriceWithDrinkOptions(item, sizeCode || undefined, [...toppingCodes]);

  const toggleTopping = (code: string) => {
    setToppingCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!sizeCode) return;
    onConfirm(sizeCode, [...toppingCodes]);
    onClose();
  };

  const isQr = variant === 'qr';
  const activeChip = isQr
    ? 'border-orange-500 bg-orange-50 text-orange-900 ring-2 ring-orange-200'
    : 'border-blue-600 bg-blue-50 text-blue-800';
  const idleChip = isQr ? 'border-orange-100 bg-white hover:border-orange-200 hover:bg-orange-50/50' : 'border-gray-200 hover:bg-gray-50';
  const priceClass = isQr ? 'text-orange-600' : 'text-blue-600';
  const primaryBtn = isQr
    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 hover:opacity-95'
    : 'bg-blue-600 text-white hover:bg-blue-700';

  return (
    <Modal open={open} onClose={onClose} title={title || `Chọn size & topping — ${item.name}`} maxWidth="max-w-md">
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-sm font-semibold text-gray-800">Kích cỡ *</div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => setSizeCode(s.code)}
                className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium transition active:scale-[0.98] ${
                  sizeCode === s.code ? activeChip : idleChip
                }`}
              >
                <span className="block leading-tight">{s.label}</span>
                {s.priceExtra > 0 && (
                  <span className="mt-0.5 block text-xs font-normal text-gray-500">+{formatCurrency(s.priceExtra)}</span>
                )}
              </button>
            ))}
          </div>
          {sizes.length === 0 && <p className="text-sm text-amber-600">Món chưa có size — vui lòng cấu hình ở Quản lý menu.</p>}
        </div>

        {toppings.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-semibold text-gray-800">Topping thêm (tuỳ chọn)</div>
            <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
              {toppings.map((t) => (
                <label
                  key={t.code}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 transition ${
                    toppingCodes.has(t.code)
                      ? isQr
                        ? 'border-orange-200 bg-orange-50/80'
                        : 'border-blue-200 bg-blue-50/80'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={toppingCodes.has(t.code)}
                      onChange={() => toggleTopping(t.code)}
                      className={`h-4 w-4 rounded border-gray-300 ${isQr ? 'text-orange-600 focus:ring-orange-400' : ''}`}
                    />
                    <span className="text-sm font-medium text-gray-800">{t.label}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-gray-600">+{formatCurrency(t.price)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-stone-50/80 px-3 py-2.5 text-sm">
          <span className="text-gray-600">Tạm tính</span>
          <span className={`font-bold tabular-nums ${priceClass}`}>{formatCurrency(unit)}</span>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">
            Hủy
          </button>
          <button
            type="button"
            disabled={!sizeCode}
            onClick={handleConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${primaryBtn}`}
          >
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </Modal>
  );
}
