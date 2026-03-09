import { X } from 'lucide-react';
import type { HolidayCalendarForm, HolidayType } from '@/types';

const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  PUBLIC_HOLIDAY: 'Lễ quốc gia', CULTURAL: 'Văn hóa', RELIGIOUS: 'Tôn giáo',
  SCHOOL: 'Học đường', COMPANY: 'Công ty', OTHER: 'Khác',
};

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
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{isEditing ? 'Sửa ngày lễ' : 'Thêm ngày lễ'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên ngày lễ *</label>
            <input type="text" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày *</label>
              <input type="date" value={form.holidayDate} onChange={(e) => onChange({ ...form, holidayDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại *</label>
              <select value={form.holidayType} onChange={(e) => onChange({ ...form, holidayType: e.target.value as HolidayType })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                {(Object.keys(HOLIDAY_TYPE_LABELS) as HolidayType[]).map((k) => (
                  <option key={k} value={k}>{HOLIDAY_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea rows={3} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.recurring} onChange={(e) => onChange({ ...form, recurring: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Lặp lại hàng năm
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
