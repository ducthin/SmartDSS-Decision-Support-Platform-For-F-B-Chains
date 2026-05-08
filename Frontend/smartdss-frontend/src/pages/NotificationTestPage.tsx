import '@/styles/coffee-theme.css';
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
    <div className="coffee-theme max-w-3xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(201,162,122,0.3)] bg-[rgba(201,162,122,0.1)] px-3 py-1 text-xs font-medium text-[#7a5c3e]">
          <ShieldCheck size={14} />
          Trang ẩn dành cho ADMIN
        </div>
        <h1 className="mt-3 text-2xl font-bold text-[#1a0e07]">Test gửi thông báo</h1>
        <p className="mt-1 text-sm text-[rgba(26,14,7,0.5)]">
          Dùng để kiểm tra provider trong `.env` như Infobip, eSMS hoặc SpeedSMS. Trang này không nằm trong menu.
        </p>
      </div>

      <div className="rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white p-5 shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)] space-y-4">
        <div>
          <label className="block text-sm font-medium text-[rgba(26,14,7,0.7)] mb-1">Số điện thoại nhận</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxx"
            className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] px-3 py-2 text-sm bg-[rgba(253,247,240,0.6)] text-[#1a0e07] focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.12)] outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[rgba(26,14,7,0.7)] mb-1">Nội dung test</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] px-3 py-2 text-sm bg-[rgba(253,247,240,0.6)] text-[#1a0e07] focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.12)] outline-none transition-all"
          />
          <p className="mt-1 text-xs text-[rgba(26,14,7,0.4)]">
            Nếu provider không hỗ trợ Unicode hoặc chưa duyệt template, hãy dùng nội dung không dấu để test trước.
          </p>
        </div>

        <button
          onClick={sendTest}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6b5040] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <Send size={16} />
          {sending ? 'Đang gửi...' : 'Gửi test'}
        </button>
      </div>

      {result && (
        <div className={`rounded-2xl border p-5 ${result.sent ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50/60'}`}>
          <h2 className={`text-base font-semibold ${result.sent ? 'text-emerald-800' : 'text-red-800'}`}>
            {result.sent ? 'Provider báo gửi thành công' : 'Provider báo chưa gửi được'}
          </h2>
          <div className="mt-3 grid gap-2 text-sm text-[rgba(26,14,7,0.7)]">
            <p><span className="font-medium">Provider:</span> {result.provider}</p>
            <p><span className="font-medium">SĐT:</span> {result.phone}</p>
            <div>
              <p className="font-medium">Phản hồi:</p>
              <pre className="mt-1 overflow-auto rounded-xl bg-white/80 p-3 text-xs text-[#1a0e07] border border-[rgba(107,80,64,0.1)]">
                {result.detail || '(không có nội dung phản hồi)'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
