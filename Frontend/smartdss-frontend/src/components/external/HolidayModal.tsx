import { X } from 'lucide-react';
import type { HolidayCalendarForm, HolidayType } from '@/types';

const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  PUBLIC_HOLIDAY: 'Lễ quốc gia', CULTURAL: 'Văn hóa', RELIGIOUS: 'Tôn giáo',
  SCHOOL: 'Học đường', COMPANY: 'Công ty', OTHER: 'Khác',
};

const INPUT_CLS = 'w-full border border-[rgba(107,80,64,0.15)] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[rgba(201,162,122,0.3)] focus:border-[#c9a27a] outline-none transition';
const LABEL_CLS = 'block text-sm font-medium text-[rgba(26,14,7,0.6)] mb-1';

interface Props {
  isEditing: boolean;
  form: HolidayCalendarForm;
  onChange: (form: HolidayCalendarForm) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function HolidayModal({ isEditing, form, onChange, onSave, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_-10px_rgba(26,14,7,0.2)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[rgba(107,80,64,0.08)]">
          <h3 className="text-lg font-semibold text-[#1a0e07]">{isEditing ? 'Sửa ngày lễ' : 'Thêm ngày lễ'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-[rgba(107,80,64,0.07)] rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={LABEL_CLS}>Tên ngày lễ *</label>
            <input type="text" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} className={INPUT_CLS} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Ngày *</label>
              <input type="date" value={form.holidayDate} onChange={(e) => onChange({ ...form, holidayDate: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Loại *</label>
              <select value={form.holidayType} onChange={(e) => onChange({ ...form, holidayType: e.target.value as HolidayType })} className={INPUT_CLS}>
                {(Object.keys(HOLIDAY_TYPE_LABELS) as HolidayType[]).map((k) => (
                  <option key={k} value={k}>{HOLIDAY_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL_CLS}>Mô tả</label>
            <textarea rows={3} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Giảm giá theo ngày lễ (%)</label>
            <input type="number" min={0} max={100} step={0.1} value={form.discountPercent}
              onChange={(e) => onChange({ ...form, discountPercent: e.target.value === '' ? '' : Number(e.target.value) })} className={INPUT_CLS} />
          </div>
          <label className="flex items-center gap-2 text-sm text-[rgba(26,14,7,0.7)]">
            <input type="checkbox" checked={form.recurring} onChange={(e) => onChange({ ...form, recurring: e.target.checked })}
              className="rounded border-[rgba(107,80,64,0.3)]" />
            Lặp lại hàng năm
          </label>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-[rgba(107,80,64,0.08)]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[rgba(26,14,7,0.7)] border border-[rgba(107,80,64,0.2)] hover:bg-[rgba(107,80,64,0.06)] rounded-xl transition-colors">Hủy</button>
          <button onClick={onSave} className="px-4 py-2 text-sm bg-[#6b5040] text-white rounded-xl hover:brightness-110 transition-all shadow-sm">
            {isEditing ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
