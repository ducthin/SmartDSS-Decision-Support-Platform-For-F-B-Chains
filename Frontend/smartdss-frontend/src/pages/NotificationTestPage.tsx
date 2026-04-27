import { useState } from 'react';
import toast from 'react-hot-toast';
import { Send, ShieldCheck } from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { getApiErrorMessage } from '@/utils/helpers';
import type { NotificationTestResult } from '@/types';

export default function NotificationTestPage() {
  const [phone, setPhone] = useState('0793637555');
  const [message, setMessage] = useState('SmartDSS Coffee test: he thong gui voucher khuyen mai tu dong da san sang.');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<NotificationTestResult | null>(null);

  const sendTest = async () => {
    const normalizedPhone = phone.trim();
    const text = message.trim();

    if (!normalizedPhone) {
      toast.error('Vui lòng nhập số điện thoại');
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const res = await notificationService.sendTest({
        phone: normalizedPhone,
        message: text || undefined,
      });
      const data = res.data.data;
      setResult(data);
      if (data.sent) {
        toast.success('Đã gửi yêu cầu SMS test');
      } else {
        toast.error('Provider trả về lỗi, xem chi tiết bên dưới');
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Không gửi được SMS test'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <ShieldCheck size={14} />
          Trang ẩn dành cho ADMIN
        </div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Test gửi thông báo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Dùng để kiểm tra provider trong `.env` như Infobip, eSMS hoặc SpeedSMS. Trang này không nằm trong menu.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại nhận</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxx"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung test</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Nếu provider không hỗ trợ Unicode hoặc chưa duyệt template, hãy dùng nội dung không dấu để test trước.
          </p>
        </div>

        <button
          onClick={sendTest}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Send size={16} />
          {sending ? 'Đang gửi...' : 'Gửi test'}
        </button>
      </div>

      {result && (
        <div className={`rounded-xl border p-5 ${result.sent ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <h2 className={`text-base font-semibold ${result.sent ? 'text-green-800' : 'text-red-800'}`}>
            {result.sent ? 'Provider báo gửi thành công' : 'Provider báo chưa gửi được'}
          </h2>
          <div className="mt-3 grid gap-2 text-sm text-gray-700">
            <p><span className="font-medium">Provider:</span> {result.provider}</p>
            <p><span className="font-medium">SĐT:</span> {result.phone}</p>
            <div>
              <p className="font-medium">Phản hồi:</p>
              <pre className="mt-1 overflow-auto rounded-lg bg-white/80 p-3 text-xs text-gray-800 border border-black/5">
                {result.detail || '(không có nội dung phản hồi)'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
