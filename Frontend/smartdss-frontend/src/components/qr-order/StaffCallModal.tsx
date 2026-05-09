import { useState } from 'react';
import { AlertCircle, Bell } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { QrStaffCallForm } from '@/types';

interface StaffCallModalProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (data: QrStaffCallForm) => void;
}

export default function StaffCallModal({ open, loading, onClose, onConfirm }: StaffCallModalProps) {
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [message, setMessage] = useState('');

  const handleConfirm = () => {
    const trimmedMessage = message.trim();
    onConfirm({
      priority,
      message: trimmedMessage ? trimmedMessage : undefined,
    });
    // Reset modal state
    setMessage('');
    setPriority('NORMAL');
  };

  return (
    <Modal open={open} onClose={onClose} title="Gọi nhân viên">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Chọn mức độ ưu tiên và nhập tin nhắn (tùy chọn).</p>

        {/* Priority Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Mức độ ưu tiên</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPriority('NORMAL')}
              className={`flex flex-1 items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all ${
                priority === 'NORMAL'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">Bình thường</span>
            </button>
            <button
              type="button"
              onClick={() => setPriority('URGENT')}
              className={`flex flex-1 items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all ${
                priority === 'URGENT'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Khẩn cấp</span>
            </button>
          </div>
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <label htmlFor="staff-message" className="block text-sm font-medium text-gray-700">
            Tin nhắn (tùy chọn)
          </label>
          <textarea
            id="staff-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            placeholder="Mô tả vấn đề hoặc yêu cầu của bạn..."
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
          />
          <p className="text-xs text-gray-500">{message.length}/500</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : 'Gọi nhân viên'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
