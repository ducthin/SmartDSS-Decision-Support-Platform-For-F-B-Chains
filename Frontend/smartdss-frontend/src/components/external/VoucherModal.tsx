import { X } from 'lucide-react';
import type { VoucherDiscountType, VoucherForm } from '@/types';

const DISCOUNT_TYPE_LABELS: Record<VoucherDiscountType, string> = {
  PERCENT: 'Phần trăm',
  FIXED: 'Số tiền cố định',
};

const CLS = 'w-full rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm focus:border-[#c9a27a] focus:ring-2 focus:ring-[rgba(201,162,122,0.3)] outline-none transition';
const LBL = 'mb-1 block text-sm font-medium text-[rgba(26,14,7,0.6)]';

function toOptionalNumber(v: string) {
  if (!v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

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
            <div><label className={LBL}>Mã voucher *</label>
              <input type="text" value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value.toUpperCase() })} className={CLS + ' uppercase'} /></div>
            <div><label className={LBL}>Loại giảm *</label>
              <select value={form.discountType} onChange={(e) => onChange({ ...form, discountType: e.target.value as VoucherDiscountType })} className={CLS}>
                {(Object.keys(DISCOUNT_TYPE_LABELS) as VoucherDiscountType[]).map((k) => <option key={k} value={k}>{DISCOUNT_TYPE_LABELS[k]}</option>)}
              </select></div>
          </div>
          <div><label className={LBL}>Tên voucher *</label>
            <input type="text" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} className={CLS} /></div>
          <div><label className={LBL}>Mô tả</label>
            <textarea rows={2} value={form.description || ''} onChange={(e) => onChange({ ...form, description: e.target.value })} className={CLS} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={LBL}>Giá trị giảm *</label>
              <input type="number" min={0} step={0.01} value={form.discountValue} onChange={(e) => onChange({ ...form, discountValue: Number(e.target.value) || 0 })} className={CLS} /></div>
            <div><label className={LBL}>Đơn tối thiểu</label>
              <input type="number" min={0} step={1000} value={form.minOrderAmount ?? ''} onChange={(e) => onChange({ ...form, minOrderAmount: toOptionalNumber(e.target.value) })} className={CLS} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={LBL}>Giảm tối đa</label>
              <input type="number" min={0} step={1000} value={form.maxDiscountAmount ?? ''} onChange={(e) => onChange({ ...form, maxDiscountAmount: toOptionalNumber(e.target.value) })} className={CLS} /></div>
            <div><label className={LBL}>Giới hạn lượt dùng</label>
              <input type="number" min={1} step={1} value={form.usageLimit ?? ''} onChange={(e) => onChange({ ...form, usageLimit: toOptionalNumber(e.target.value) })} className={CLS} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={LBL}>Hiệu lực từ</label>
              <input type="datetime-local" value={form.validFrom || ''} onChange={(e) => onChange({ ...form, validFrom: e.target.value || undefined })} className={CLS} /></div>
            <div><label className={LBL}>Hiệu lực đến</label>
              <input type="datetime-local" value={form.validTo || ''} onChange={(e) => onChange({ ...form, validTo: e.target.value || undefined })} className={CLS} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[rgba(26,14,7,0.7)]">
            <input type="checkbox" checked={form.active} onChange={(e) => onChange({ ...form, active: e.target.checked })} className="rounded border-[rgba(107,80,64,0.3)]" />
            Đang hoạt động
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-[rgba(107,80,64,0.08)] p-5">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm border border-[rgba(107,80,64,0.2)] text-[rgba(26,14,7,0.7)] hover:bg-[rgba(107,80,64,0.06)] transition-colors">Hủy</button>
          <button onClick={onSave} className="rounded-xl bg-[#6b5040] px-4 py-2 text-sm text-white hover:brightness-110 transition-all shadow-sm">
            {isEditing ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
