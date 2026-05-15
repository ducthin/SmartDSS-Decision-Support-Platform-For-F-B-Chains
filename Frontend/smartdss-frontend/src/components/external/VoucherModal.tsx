import { X, HelpCircle } from 'lucide-react';
import type { VoucherDiscountType, VoucherForm } from '@/types';

const DISCOUNT_TYPE_LABELS: Record<VoucherDiscountType, string> = {
  PERCENT: 'Phần trăm',
  FIXED: 'Số tiền cố định',
};

const CLS = 'w-full rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm focus:border-[#c9a27a] focus:ring-2 focus:ring-[rgba(201,162,122,0.3)] outline-none transition';

function toOptionalNumber(v: string) {
  if (!v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const LabelWithTooltip = ({ children, tooltip, required }: { children: React.ReactNode; tooltip?: string; required?: boolean }) => (
  <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[rgba(26,14,7,0.6)] relative group w-fit">
    {children} {required && <span className="text-red-500">*</span>}
    {tooltip && (
      <>
        <HelpCircle size={14} className="text-[rgba(26,14,7,0.4)] hover:text-[#c9a27a] cursor-help transition-colors" />
        <div className="absolute bottom-full left-0 mb-2 w-56 scale-0 rounded-lg bg-gray-900 px-3 py-2 text-xs font-normal text-white opacity-0 shadow-lg transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none z-[100] leading-relaxed">
          {tooltip}
          <div className="absolute left-4 top-full border-4 border-transparent border-t-gray-900" />
        </div>
      </>
    )}
  </label>
);

interface Props {
  isEditing: boolean; form: VoucherForm;
  onChange: (f: VoucherForm) => void; onSave: () => void; onClose: () => void;
}

export default function VoucherModal({ isEditing, form, onChange, onSave, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-[0_20px_60px_-10px_rgba(26,14,7,0.2)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[rgba(107,80,64,0.08)] p-5">
          <h3 className="text-lg font-semibold text-[#1a0e07]">{isEditing ? 'Sửa voucher' : 'Thêm voucher'}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[rgba(107,80,64,0.07)] transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <LabelWithTooltip tooltip="Mã viết liền không dấu mà khách hàng sẽ nhập (VD: SALE10K, TET2025)" required>Mã voucher</LabelWithTooltip>
              <input type="text" value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value.toUpperCase() })} className={CLS + ' uppercase'} placeholder="VD: SALE10K" />
            </div>
            <div>
              <LabelWithTooltip tooltip="Chọn giảm theo % đơn hàng hoặc giảm thẳng một số tiền cụ thể" required>Loại giảm</LabelWithTooltip>
              <select value={form.discountType} onChange={(e) => onChange({ ...form, discountType: e.target.value as VoucherDiscountType })} className={CLS}>
                {(Object.keys(DISCOUNT_TYPE_LABELS) as VoucherDiscountType[]).map((k) => <option key={k} value={k}>{DISCOUNT_TYPE_LABELS[k]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <LabelWithTooltip required>Tên voucher</LabelWithTooltip>
            <input type="text" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} className={CLS} placeholder="VD: Giảm 10K cho đơn từ 50K" />
          </div>
          <div>
            <LabelWithTooltip>Mô tả (Không bắt buộc)</LabelWithTooltip>
            <textarea rows={2} value={form.description || ''} onChange={(e) => onChange({ ...form, description: e.target.value })} className={CLS} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <LabelWithTooltip tooltip="Nhập % hoặc số tiền tùy vào Loại giảm. Ví dụ: Nếu chọn Phần trăm thì nhập 10 (nghĩa là giảm 10%)" required>Giá trị giảm</LabelWithTooltip>
              <input type="number" min={0} step={0.01} value={form.discountValue} onChange={(e) => onChange({ ...form, discountValue: e.target.value === '' ? '' : Number(e.target.value) })} className={CLS} />
            </div>
            <div>
              <LabelWithTooltip tooltip="Tổng giá trị đơn hàng tối thiểu (VND) để dùng mã. Để trống nếu áp dụng cho mọi đơn">Đơn tối thiểu</LabelWithTooltip>
              <input type="number" min={0} step={1000} value={form.minOrderAmount ?? ''} onChange={(e) => onChange({ ...form, minOrderAmount: toOptionalNumber(e.target.value) })} className={CLS} placeholder="Bỏ trống nếu không yêu cầu" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <LabelWithTooltip tooltip="Chỉ dùng khi giảm Phần trăm. Số tiền tối đa (VND) mà khách được giảm. Để trống nếu không giới hạn">Giảm tối đa</LabelWithTooltip>
              <input type="number" min={0} step={1000} value={form.maxDiscountAmount ?? ''} onChange={(e) => onChange({ ...form, maxDiscountAmount: toOptionalNumber(e.target.value) })} className={CLS} placeholder="Bỏ trống nếu không giới hạn" />
            </div>
            <div>
              <LabelWithTooltip tooltip="Tổng số lần mã này có thể được sử dụng trước khi hết lượt. Để trống nếu dùng vô hạn">Giới hạn lượt dùng</LabelWithTooltip>
              <input type="number" min={1} step={1} value={form.usageLimit ?? ''} onChange={(e) => onChange({ ...form, usageLimit: toOptionalNumber(e.target.value) })} className={CLS} placeholder="VD: 100 lượt" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <LabelWithTooltip tooltip="Thời gian bắt đầu áp dụng mã">Hiệu lực từ</LabelWithTooltip>
              <input type="datetime-local" value={form.validFrom || ''} onChange={(e) => onChange({ ...form, validFrom: e.target.value || undefined })} className={CLS} />
            </div>
            <div>
              <LabelWithTooltip tooltip="Thời gian mã hết hạn. Tự động từ chối sau thời điểm này">Hiệu lực đến</LabelWithTooltip>
              <input type="datetime-local" value={form.validTo || ''} onChange={(e) => onChange({ ...form, validTo: e.target.value || undefined })} className={CLS} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[rgba(26,14,7,0.7)] mt-2">
            <input type="checkbox" checked={form.active} onChange={(e) => onChange({ ...form, active: e.target.checked })} className="rounded border-[rgba(107,80,64,0.3)] w-4 h-4 text-[#6b5040] focus:ring-[#6b5040]" />
            <span className="font-medium text-[rgba(26,14,7,0.8)]">Đang hoạt động (Cho phép sử dụng)</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-[rgba(107,80,64,0.08)] p-5">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium border border-[rgba(107,80,64,0.2)] text-[rgba(26,14,7,0.7)] hover:bg-[rgba(107,80,64,0.06)] transition-colors">Hủy</button>
          <button onClick={onSave} className="rounded-xl bg-[#6b5040] font-semibold px-5 py-2 text-sm text-white hover:brightness-110 active:scale-95 transition-all shadow-sm">
            {isEditing ? 'Lưu thay đổi' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
