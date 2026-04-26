import { X } from 'lucide-react';
import type { EventForm, EventType, ImpactLevel } from '@/types';

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  FESTIVAL: 'Lễ hội', HOLIDAY: 'Ngày nghỉ', CONCERT: 'Hòa nhạc',
  SPORT: 'Thể thao', PROMOTION: 'Khuyến mãi', CONFERENCE: 'Hội nghị', OTHER: 'Khác',
};
const IMPACT_LABELS: Record<ImpactLevel, string> = {
  LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Rất cao',
};

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
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{isEditing ? 'Sửa sự kiện' : 'Thêm sự kiện'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên sự kiện *</label>
            <input type="text" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại sự kiện *</label>
              <select value={form.eventType} onChange={(e) => onChange({ ...form, eventType: e.target.value as EventType })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((k) => (
                  <option key={k} value={k}>{EVENT_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mức tác động</label>
              <select value={form.expectedImpact} onChange={(e) => onChange({ ...form, expectedImpact: e.target.value as ImpactLevel })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                {(Object.keys(IMPACT_LABELS) as ImpactLevel[]).map((k) => (
                  <option key={k} value={k}>{IMPACT_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu *</label>
              <input type="date" value={form.startDate} onChange={(e) => onChange({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc *</label>
              <input type="date" value={form.endDate} onChange={(e) => onChange({ ...form, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
            <input type="text" value={form.location} onChange={(e) => onChange({ ...form, location: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea rows={3} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giảm giá theo sự kiện (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.discountPercent ?? 0}
              onChange={(e) => onChange({ ...form, discountPercent: Number(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea rows={2} value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => onChange({ ...form, active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Hoạt động
          </label>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
          <button onClick={onSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {isEditing ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
