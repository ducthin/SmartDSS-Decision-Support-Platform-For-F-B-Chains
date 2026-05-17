import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Gift, MessageCircle, RefreshCw } from 'lucide-react';
import { qrService } from '@/services/qrService';
import type { TelegramLinkStatus } from '@/types';

interface QrTelegramPanelProps {
  customerPhone: string;
}

export default function QrTelegramPanel({ customerPhone }: QrTelegramPanelProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<TelegramLinkStatus | null>(null);

  const checkStatus = async () => {
    const phone = customerPhone.trim();
    if (!phone) {
      setStatus(null);
      return;
    }
    setChecking(true);
    try {
      const res = await qrService.getTelegramLinkStatus(phone);
      setStatus(res.data.data);
    } catch {
      setStatus(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      checkStatus();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [customerPhone]);

  const openTelegram = async () => {
    if (!customerPhone.trim()) {
      toast.error('Vui lòng nhập số điện thoại trước');
      return;
    }
    setLoading(true);
    try {
      const res = await qrService.getTelegramOptInLink(customerPhone.trim());
      const url = res.data.data;
      if (!url) {
        toast.error('Quán chưa cấu hình Telegram bot');
        return;
      }
      window.location.href = url;
      toast.success('Hãy bấm Start trong Telegram để liên kết nhận ưu đãi');
    } catch {
      toast.error('Không tạo được link Telegram');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-(--coffee-dark)">Nhận voucher qua Telegram</h2>
        <p className="mt-0.5 text-xs text-[rgba(62,42,31,0.62)]">
          Liên kết số điện thoại của bạn với bot Telegram để quán gửi voucher và ưu đãi sau này.
        </p>
      </div>

      <div className="coffee-soft-shadow rounded-2xl border border-[rgba(111,78,55,0.14)] bg-white/95 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(228,172,92,0.16)] text-(--coffee-primary)">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-(--coffee-dark)">Số đang liên kết: {customerPhone || 'chưa có'}</p>
            {status?.linked ? (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đã liên kết Telegram
                {status.telegramUsername ? ` @${status.telegramUsername}` : status.telegramFullName ? ` (${status.telegramFullName})` : ''}
              </div>
            ) : (
              <div className="mt-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {checking ? 'Đang kiểm tra liên kết...' : 'Chưa liên kết Telegram'}
              </div>
            )}
            <p className="mt-1 text-sm leading-relaxed text-[rgba(62,42,31,0.68)]">
              Sau khi mở Telegram, bạn chỉ cần bấm <span className="font-semibold">Start</span>. Hệ thống sẽ lưu liên kết này và gửi voucher theo số điện thoại bạn dùng khi đặt món.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            onClick={openTelegram}
            disabled={loading}
            className="coffee-interactive inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4" />
            {status?.linked ? 'Mở Telegram' : loading ? 'Đang tạo link...' : 'Mở Telegram để nhận ưu đãi'}
          </button>
          <button
            type="button"
            onClick={checkStatus}
            disabled={checking}
            className="coffee-interactive inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(111,78,55,0.16)] px-4 py-3 text-sm font-semibold text-(--coffee-dark) disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            Kiểm tra
          </button>
        </div>
      </div>
    </div>
  );
}
