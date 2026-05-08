import { X } from 'lucide-react';
import type { EventForm, EventType, ImpactLevel } from '@/types';

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  FESTIVAL: 'Lễ hội', HOLIDAY: 'Ngày nghỉ', CONCERT: 'Hòa nhạc',
  SPORT: 'Thể thao', PROMOTION: 'Khuyến mãi', CONFERENCE: 'Hội nghị', OTHER: 'Khác',
};
const IMPACT_LABELS: Record<ImpactLevel, string> = {
  LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Rất cao',
};

const INPUT_CLS = 'w-full border border-[rgba(107,80,64,0.15)] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[rgba(201,162,122,0.3)] focus:border-[#c9a27a] outline-none transition';
const LABEL_CLS = 'block text-sm font-medium text-[rgba(26,14,7,0.6)] mb-1';

interface Props {
  isEditing: boolean;
  form: EventForm;
  onChange: (form: EventForm) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function EventModal({ isEditing, form, onChange, onSave, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_-10px_rgba(26,14,7,0.2)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[rgba(107,80,64,0.08)]">
          <h3 className="text-lg font-semibold text-[#1a0e07]">{isEditing ? 'Sửa sự kiện' : 'Thêm sự kiện'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-[rgba(107,80,64,0.07)] rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={LABEL_CLS}>Tên sự kiện *</label>
            <input type="text" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} className={INPUT_CLS} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Loại sự kiện *</label>
              <select value={form.eventType} onChange={(e) => onChange({ ...form, eventType: e.target.value as EventType })} className={INPUT_CLS}>
                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((k) => (
                  <option key={k} value={k}>{EVENT_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Mức tác động</label>
              <select value={form.expectedImpact} onChange={(e) => onChange({ ...form, expectedImpact: e.target.value as ImpactLevel })} className={INPUT_CLS}>
                {(Object.keys(IMPACT_LABELS) as ImpactLevel[]).map((k) => (
                  <option key={k} value={k}>{IMPACT_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Ngày bắt đầu *</label>
              <input type="date" value={form.startDate} onChange={(e) => onChange({ ...form, startDate: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Ngày kết thúc *</label>
              <input type="date" value={form.endDate} onChange={(e) => onChange({ ...form, endDate: e.target.value })} className={INPUT_CLS} />
            </div>
          </div>
          <div>
            <label className={LABEL_CLS}>Địa điểm</label>
            <input type="text" value={form.location} onChange={(e) => onChange({ ...form, location: e.target.value })} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Mô tả</label>
            <textarea rows={3} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Giảm giá theo sự kiện (%)</label>
            <input type="number" min={0} max={100} step={0.1} value={form.discountPercent ?? 0}
              onChange={(e) => onChange({ ...form, discountPercent: Number(e.target.value) || 0 })} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Ghi chú</label>
            <textarea rows={2} value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} className={INPUT_CLS} />
          </div>
          <label className="flex items-center gap-2 text-sm text-[rgba(26,14,7,0.7)]">
            <input type="checkbox" checked={form.active} onChange={(e) => onChange({ ...form, active: e.target.checked })}
              className="rounded border-[rgba(107,80,64,0.3)]" />
            Hoạt động
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
