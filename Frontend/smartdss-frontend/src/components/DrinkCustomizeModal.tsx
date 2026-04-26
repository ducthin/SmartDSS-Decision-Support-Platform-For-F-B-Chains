import { useEffect, useState } from 'react';
import { Coffee } from 'lucide-react';
import type { MenuItem } from '@/types';
import { formatCurrency, unitPriceWithDrinkOptions } from '@/utils/helpers';
import Modal from '@/components/ui/Modal';
import { resolveBackendUrl } from '@/services/settingsService';

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
  const imageSrc = resolveBackendUrl(item.imageUrl) ?? item.imageUrl;

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
    ? 'border-(--coffee-primary) bg-[rgba(245,230,211,0.7)] text-(--coffee-dark) ring-2 ring-[rgba(228,172,92,0.45)]'
    : 'border-blue-600 bg-blue-50 text-blue-800';
  const idleChip = isQr
    ? 'border-[rgba(111,78,55,0.18)] bg-white hover:border-[rgba(111,78,55,0.28)] hover:bg-[rgba(245,230,211,0.4)]'
    : 'border-gray-200 hover:bg-gray-50';
  const priceClass = isQr ? 'text-(--coffee-primary)' : 'text-blue-600';
  const primaryBtn = isQr
    ? 'coffee-interactive bg-[linear-gradient(120deg,var(--coffee-primary),var(--coffee-dark))] text-(--coffee-secondary) shadow-lg shadow-[rgba(62,42,31,0.22)]'
    : 'bg-blue-600 text-white hover:bg-blue-700';

  const cancelBtn = isQr
    ? 'coffee-interactive rounded-xl border border-[rgba(111,78,55,0.2)] px-4 py-2.5 text-sm font-semibold text-(--coffee-dark) hover:bg-[rgba(245,230,211,0.45)]'
    : 'rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || `Chọn size & topping — ${item.name}`}
      maxWidth="max-w-md"
      overlayClassName={isQr ? 'z-[230] bg-[rgba(62,42,31,0.55)] p-3 sm:p-5' : undefined}
      panelClassName={
        isQr
          ? 'coffee-theme my-0 rounded-[22px] border border-[rgba(111,78,55,0.16)] bg-[linear-gradient(180deg,#fffdf9_0%,#fdf6eb_100%)] shadow-[0_26px_55px_-30px_rgba(62,42,31,0.65)]'
          : undefined
      }
      headerClassName={isQr ? 'border-b border-[rgba(111,78,55,0.12)] bg-[rgba(245,230,211,0.5)] px-4 py-3' : undefined}
      titleClassName={isQr ? 'text-(--coffee-dark) text-[17px] font-semibold' : undefined}
      closeButtonClassName={
        isQr ? 'text-[rgba(62,42,31,0.6)] hover:bg-[rgba(245,230,211,0.7)] hover:text-(--coffee-dark)' : undefined
      }
      bodyClassName={isQr ? 'px-4 py-4' : undefined}
    >
      <div className="space-y-5">
        {isQr && (
          <div className="rounded-xl border border-[rgba(111,78,55,0.14)] bg-white/85 p-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-xl bg-[rgba(245,230,211,0.7)]">
                {imageSrc ? (
                  <img src={imageSrc} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-(--coffee-primary)">
                    <Coffee className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-(--coffee-dark)">{item.name}</p>
                <p className="text-xs text-[rgba(62,42,31,0.66)]">Tùy chỉnh size và topping trước khi thêm vào giỏ</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className={`mb-2 text-sm font-semibold ${isQr ? 'text-(--coffee-dark)' : 'text-gray-800'}`}>Kích cỡ *</div>
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
                  <span className={`mt-0.5 block text-xs font-normal ${isQr ? 'text-[rgba(62,42,31,0.58)]' : 'text-gray-500'}`}>
                    +{formatCurrency(s.priceExtra)}
                  </span>
                )}
              </button>
            ))}
          </div>
          {sizes.length === 0 && <p className="text-sm text-amber-600">Món chưa có size — vui lòng cấu hình ở Quản lý menu.</p>}
        </div>

        {toppings.length > 0 && (
          <div>
            <div className={`mb-2 text-sm font-semibold ${isQr ? 'text-(--coffee-dark)' : 'text-gray-800'}`}>Topping thêm (tuỳ chọn)</div>
            <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
              {toppings.map((t) => (
                <label
                  key={t.code}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 transition ${
                    toppingCodes.has(t.code)
                      ? isQr
                        ? 'border-[rgba(111,78,55,0.24)] bg-[rgba(245,230,211,0.52)]'
                        : 'border-blue-200 bg-blue-50/80'
                      : isQr
                        ? 'border-[rgba(111,78,55,0.12)] hover:bg-[rgba(245,230,211,0.32)]'
                        : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={toppingCodes.has(t.code)}
                      onChange={() => toggleTopping(t.code)}
                      className={`h-4 w-4 rounded border-gray-300 ${isQr ? 'text-(--coffee-primary) focus:ring-(--coffee-accent)' : ''}`}
                    />
                    <span className={`text-sm font-medium ${isQr ? 'text-(--coffee-dark)' : 'text-gray-800'}`}>{t.label}</span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold ${isQr ? 'text-[rgba(62,42,31,0.75)]' : 'text-gray-600'}`}>
                    +{formatCurrency(t.price)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div
          className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
            isQr ? 'border border-[rgba(111,78,55,0.14)] bg-[rgba(245,230,211,0.44)]' : 'border border-gray-100 bg-stone-50/80'
          }`}
        >
          <span className={isQr ? 'text-[rgba(62,42,31,0.68)]' : 'text-gray-600'}>Tạm tính</span>
          <span className={`font-bold tabular-nums ${priceClass}`}>{formatCurrency(unit)}</span>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={cancelBtn}>
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
