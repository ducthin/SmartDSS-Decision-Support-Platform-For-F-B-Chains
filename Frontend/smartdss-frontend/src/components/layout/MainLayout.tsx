import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar, { MobileHeader } from './Sidebar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { useStaffCallSocket } from '@/hooks/useStaffCallSocket';
import { useFeedbackAlertSocket } from '@/hooks/useFeedbackAlertSocket';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import type { FeedbackAlert, Order, StaffCall } from '@/types';
import { getRoleKey } from '@/utils/helpers';
import { resolveBackendUrl, settingsService } from '@/services/settingsService';

const STAFF_NOTI_PREF_KEY = 'staff_notifications_enabled';
const MAX_QR_ORDER_FEED_ITEMS = 5;

type QrOrderFeedItem = {
  id: number;
  tableLabel: string;
  detail: string;
  createdAt: string;
};

function playBeep(durationMs = 220, frequency = 880, volume = 0.08) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, durationMs);
  } catch {
    // ignore
  }
}

function playAlertBeep() {
  // 3 short beeps to reduce missed calls
  playBeep(220, 880, 0.09);
  setTimeout(() => playBeep(220, 880, 0.09), 350);
  setTimeout(() => playBeep(260, 740, 0.09), 700);
}

export default function MainLayout() {
  const { token, loading, user } = useAuth();
  const userRole = getRoleKey(user?.roleName);
  const canReceiveStaffCalls = ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole);
  const canReceiveFeedbackAlerts = ['ADMIN', 'MANAGER'].includes(userRole);
  const canReceiveQrOrderAlerts = ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole);
  const lastCallIdRef = useRef<number | null>(null);
  const lastFeedbackAlertIdRef = useRef<number | null>(null);
  const lastQrOrderIdRef = useRef<number | null>(null);
  const [notiEnabled, setNotiEnabled] = useState(() => localStorage.getItem(STAFF_NOTI_PREF_KEY) === '1');
  const [showQrOrderFeed, setShowQrOrderFeed] = useState(false);
  const [qrOrderFeed, setQrOrderFeed] = useState<QrOrderFeedItem[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const notificationSupported = useMemo(() => typeof window !== 'undefined' && 'Notification' in window, []);
  const permission = useMemo(() => (notificationSupported ? Notification.permission : 'denied') as NotificationPermission, [notificationSupported]);
  const shouldShowEnable = canReceiveStaffCalls && notificationSupported && (!notiEnabled || permission !== 'granted');

  useEffect(() => {
    if (!canReceiveStaffCalls) return;
    // If user previously enabled + browser already granted, keep it enabled.
    if (localStorage.getItem(STAFF_NOTI_PREF_KEY) === '1' && permission === 'granted') {
      setNotiEnabled(true);
    }
  }, [canReceiveStaffCalls, permission]);

  useEffect(() => {
    if (!canReceiveStaffCalls) return;
    settingsService.getStaffCallSound()
      .then(res => {
        const url = resolveBackendUrl(res.data.data.soundUrl);
        audioRef.current = url ? new Audio(url) : null;
      })
      .catch(() => {
        audioRef.current = null;
      });
  }, [canReceiveStaffCalls]);

  const enableNotifications = async () => {
    if (!notificationSupported) {
      toast.error('Thiết bị không hỗ trợ thông báo');
      return;
    }
    try {
      // Must be triggered by user gesture in most browsers.
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        localStorage.setItem(STAFF_NOTI_PREF_KEY, '1');
        setNotiEnabled(true);
        playAlertBeep(); // also "unlock" sound with a gesture
        toast.success('Đã bật thông báo');
      } else {
        toast.error('Bạn đã từ chối quyền thông báo');
      }
    } catch {
      toast.error('Không thể bật thông báo');
    }
  };

  const handleStaffCall = useCallback((data?: StaffCall) => {
    if (!canReceiveStaffCalls) return;
    if (!data?.id) return;
    if (lastCallIdRef.current === data.id) return;
    lastCallIdRef.current = data.id;
    const msg = data.message?.trim();
    toast(msg ? `[${data.tableName}] ${msg}` : `${data.tableName} đang gọi nhân viên`);

    if (notiEnabled && notificationSupported && Notification.permission === 'granted') {
      try {
        new Notification('Gọi nhân viên', {
          body: msg ? `${data.tableName}: ${msg}` : `${data.tableName} đang gọi nhân viên`,
        });
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          void audioRef.current.play().catch(() => playAlertBeep());
        } else {
          playAlertBeep();
        }
      } catch {
        // ignore
      }
    }
  }, [canReceiveStaffCalls, notiEnabled, notificationSupported]);

  const handleFeedbackAlert = useCallback((data?: FeedbackAlert) => {
    if (!canReceiveFeedbackAlerts) return;
    if (!data?.feedbackId) return;
    if (lastFeedbackAlertIdRef.current === data.feedbackId) return;
    lastFeedbackAlertIdRef.current = data.feedbackId;

    const baseMsg = `Feedback ${data.rating}/5 từ ${data.customerName} (${data.tableName})`;
    if (data.level === 'CRITICAL') {
      toast.error(`${baseMsg} - CẢNH BÁO NGHIÊM TRỌNG (${data.lowRatingCountInWindow} phản hồi xấu/${data.windowMinutes}p)`, { duration: 8000 });
      playAlertBeep();
      setTimeout(() => playAlertBeep(), 900);
    } else {
      toast.error(`${baseMsg} - Cảnh báo mức cao`, { duration: 5000 });
      playAlertBeep();
    }
  }, [canReceiveFeedbackAlerts]);

  const handleQrOrderAlert = useCallback((data?: Order) => {
    if (!canReceiveQrOrderAlerts) return;
    if (!data?.id) return;
    if (data.status !== 'PENDING') return;
    // Orders created from customer QR flow have no creator account.
    if (data.createdByName && data.createdByName.trim()) return;
    if (lastQrOrderIdRef.current === data.id) return;
    lastQrOrderIdRef.current = data.id;

    const tableLabel = data.tableNumber?.trim() || 'POS';
    const orderItems = data.orderItems || [];
    const totalQty = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const previewItems = orderItems.slice(0, 2).map((item) => {
      const itemName = item.menuItemName?.trim() || `Món #${item.menuItemId}`;
      return `${itemName} x${item.quantity}`;
    }).join(', ');
    const remainCount = Math.max(0, orderItems.length - 2);
    const noteText = data.note?.trim();

    const headline = `Đơn QR mới • Bàn ${tableLabel} • #${data.id}`;
    const detail = [
      totalQty > 0 ? `${totalQty} món` : null,
      previewItems ? `${previewItems}${remainCount > 0 ? ` +${remainCount} món khác` : ''}` : null,
      noteText ? `Ghi chú: ${noteText}` : null,
    ].filter(Boolean).join(' | ');
    const body = detail ? `${headline}\n${detail}` : headline;

    toast.success(body, { duration: 5500 });
    setQrOrderFeed((prev) => [
      {
        id: data.id,
        tableLabel,
        detail: detail || 'Đơn mới',
        createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.filter((item) => item.id !== data.id),
    ].slice(0, MAX_QR_ORDER_FEED_ITEMS));

    if (notiEnabled && notificationSupported && Notification.permission === 'granted') {
      try {
        new Notification('Đơn mới từ khách QR', { body });
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          void audioRef.current.play().catch(() => playAlertBeep());
        } else {
          playAlertBeep();
        }
      } catch {
        // ignore
      }
    }
  }, [canReceiveQrOrderAlerts, notiEnabled, notificationSupported]);

  useStaffCallSocket(handleStaffCall);
  useFeedbackAlertSocket(handleFeedbackAlert);
  useOrderSocket(handleQrOrderAlert);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-h-screen">
        <MobileHeader />
        {shouldShowEnable && (
          <div className="px-6 pt-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                Bật thông báo để nhận yêu cầu “Gọi nhân viên” (có âm thanh).
              </div>
              <button
                onClick={enableNotifications}
                className="shrink-0 px-3 py-1.5 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition"
              >
                Bật thông báo
              </button>
            </div>
          </div>
        )}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
        {canReceiveQrOrderAlerts && (
          <div className="fixed right-4 bottom-4 z-40">
            {showQrOrderFeed && (
              <div className="mb-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">Đơn QR gần đây</p>
                  <button
                    onClick={() => setQrOrderFeed([])}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Xóa
                  </button>
                </div>
                <div className="max-h-72 overflow-auto">
                  {qrOrderFeed.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-500">Chưa có đơn QR mới.</p>
                  ) : (
                    qrOrderFeed.map((item) => (
                      <div key={item.id} className="px-3 py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.tableLabel} • Đơn #{item.id}</p>
                          <span className="text-xs text-gray-400 shrink-0">{item.createdAt}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{item.detail}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => setShowQrOrderFeed((v) => !v)}
              className="relative inline-flex items-center justify-center w-11 h-11 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition"
              title="Đơn QR mới"
            >
              <Bell size={18} />
              {qrOrderFeed.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[11px] leading-5 text-white font-semibold text-center">
                  {qrOrderFeed.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
