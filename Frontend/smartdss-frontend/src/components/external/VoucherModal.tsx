import { X } from 'lucide-react';
import type { VoucherDiscountType, VoucherForm } from '@/types';

const DISCOUNT_TYPE_LABELS: Record<VoucherDiscountType, string> = {
  PERCENT: 'Phần trăm',
  FIXED: 'Số tiền cố định',
};

interface Props {
  isEditing: boolean;
  form: VoucherForm;
  onChange: (form: VoucherForm) => void;
  onSave: () => void;
  onClose: () => void;
}

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function VoucherModal({ isEditing, form, onChange, onSave, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <h3 className="text-lg font-semibold">{isEditing ? 'Sửa voucher' : 'Thêm voucher'}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X size={20} /></button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mã voucher *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => onChange({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Loại giảm *</label>
              <select
                value={form.discountType}
                onChange={(e) => onChange({ ...form, discountType: e.target.value as VoucherDiscountType })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(DISCOUNT_TYPE_LABELS) as VoucherDiscountType[]).map((key) => (
                  <option key={key} value={key}>{DISCOUNT_TYPE_LABELS[key]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tên voucher *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
            <textarea
              rows={2}
              value={form.description || ''}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Giá trị giảm *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.discountValue}
                onChange={(e) => onChange({ ...form, discountValue: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Đơn tối thiểu</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={form.minOrderAmount ?? ''}
                onChange={(e) => onChange({ ...form, minOrderAmount: toOptionalNumber(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Giảm tối đa</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={form.maxDiscountAmount ?? ''}
                onChange={(e) => onChange({ ...form, maxDiscountAmount: toOptionalNumber(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Giới hạn lượt dùng</label>
              <input
                type="number"
                min={1}
                step={1}
                value={form.usageLimit ?? ''}
                onChange={(e) => onChange({ ...form, usageLimit: toOptionalNumber(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Hiệu lực từ</label>
              <input
                type="datetime-local"
                value={form.validFrom || ''}
                onChange={(e) => onChange({ ...form, validFrom: e.target.value || undefined })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Hiệu lực đến</label>
              <input
                type="datetime-local"
                value={form.validTo || ''}
                onChange={(e) => onChange({ ...form, validTo: e.target.value || undefined })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => onChange({ ...form, active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Đang hoạt động
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 p-5">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Hủy</button>
          <button onClick={onSave} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            {isEditing ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
