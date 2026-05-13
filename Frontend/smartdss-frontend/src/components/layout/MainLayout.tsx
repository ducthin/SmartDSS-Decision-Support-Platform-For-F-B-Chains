import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar, { MobileHeader } from './Sidebar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { useStaffCallSocket } from '@/hooks/useStaffCallSocket';
import { useFeedbackAlertSocket } from '@/hooks/useFeedbackAlertSocket';
import { useInvoiceRequestSocket } from '@/hooks/useInvoiceRequestSocket';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import type { FeedbackAlert, Order, QrInvoiceResponse, StaffCall } from '@/types';
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

let alertAudioContext: AudioContext | null = null;
let alertSoundBuffer: AudioBuffer | null = null;
let alertSoundUrl: string | null = null;

function getAlertAudioContext() {
  if (alertAudioContext) return alertAudioContext;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  alertAudioContext = new AudioCtx();
  return alertAudioContext;
}

async function unlockAlertAudio() {
  const ctx = getAlertAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.03);
  return ctx.state === 'running';
}

async function loadAlertSound(url: string | null) {
  if (!url) {
    alertSoundUrl = null;
    alertSoundBuffer = null;
    return;
  }
  if (alertSoundUrl === url && alertSoundBuffer) return;

  const ctx = getAlertAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  const res = await fetch(cacheBustedUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Cannot load alert sound: ${res.status}`);
  const data = await res.arrayBuffer();
  alertSoundBuffer = await ctx.decodeAudioData(data.slice(0));
  alertSoundUrl = url;
}

function playBeep(durationMs = 220, frequency = 880, volume = 0.08) {
  try {
    const ctx = alertAudioContext;
    if (!ctx || ctx.state !== 'running') return;
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
  const canReceiveInvoiceRequests = ['ADMIN', 'MANAGER'].includes(userRole);
  const canReceiveQrOrderAlerts = ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole);
  const lastCallIdRef = useRef<number | null>(null);
  const lastFeedbackAlertIdRef = useRef<number | null>(null);
  const lastQrOrderIdRef = useRef<number | null>(null);
  const [notiEnabled, setNotiEnabled] = useState(() => localStorage.getItem(STAFF_NOTI_PREF_KEY) === '1');
  const [audioReady, setAudioReady] = useState(false);
  const [showQrOrderFeed, setShowQrOrderFeed] = useState(false);
  const [qrOrderFeed, setQrOrderFeed] = useState<QrOrderFeedItem[]>([]);
  const notificationSupported = useMemo(() => typeof window !== 'undefined' && 'Notification' in window, []);
  const permission = useMemo(() => (notificationSupported ? Notification.permission : 'denied') as NotificationPermission, [notificationSupported]);
  const shouldShowEnable = (canReceiveStaffCalls || canReceiveQrOrderAlerts)
    && (!audioReady || (notificationSupported && (!notiEnabled || permission !== 'granted')));

  useEffect(() => {
    if (!canReceiveStaffCalls) return;
    // If user previously enabled + browser already granted, keep it enabled.
    if (localStorage.getItem(STAFF_NOTI_PREF_KEY) === '1' && permission === 'granted') {
      setNotiEnabled(true);
    }
  }, [canReceiveStaffCalls, permission]);

  const enableNotifications = async () => {
    if (!notificationSupported) {
      toast.error('Thiết bị không hỗ trợ thông báo');
      return;
    }
    try {
      const audioUnlocked = await unlockAlertAudio();
      setAudioReady(audioUnlocked);
      // Must be triggered by user gesture in most browsers.
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        localStorage.setItem(STAFF_NOTI_PREF_KEY, '1');
        setNotiEnabled(true);
        if (audioUnlocked) {
          const soundRes = await settingsService.getStaffCallSound();
          await loadAlertSound(resolveBackendUrl(soundRes.data.data.soundUrl));
          playConfiguredAlertSound();
        }
        toast.success('Đã bật thông báo');
      } else if (audioUnlocked) {
        toast.success('Đã bật âm thanh, nhưng trình duyệt chưa cho phép thông báo nổi');
      } else {
        toast.error('Bạn đã từ chối quyền thông báo');
      }
    } catch {
      toast.error('Không thể bật thông báo');
    }
  };

  const playConfiguredAlertSound = useCallback(() => {
    settingsService.getStaffCallSound()
      .then(async (res) => {
        const url = resolveBackendUrl(res.data.data.soundUrl);
        await loadAlertSound(url);
        if (!url) {
          playAlertBeep();
          return;
        }
        const ctx = alertAudioContext;
        if (!ctx || ctx.state !== 'running' || !alertSoundBuffer) {
          playAlertBeep();
          return;
        }
        const source = ctx.createBufferSource();
        source.buffer = alertSoundBuffer;
        source.connect(ctx.destination);
        source.start();
      })
      .catch(() => playAlertBeep());
  }, []);

  const handleStaffCall = useCallback((data?: StaffCall) => {
    if (!canReceiveStaffCalls) return;
    if (!data?.id) return;
    if (lastCallIdRef.current === data.id) return;
    lastCallIdRef.current = data.id;
    const msg = data.message?.trim();
    toast(msg ? `[${data.tableName}] ${msg}` : `${data.tableName} đang gọi nhân viên`);
    playConfiguredAlertSound();

    if (notiEnabled && notificationSupported && Notification.permission === 'granted') {
      try {
        new Notification('Gọi nhân viên', {
          body: msg ? `${data.tableName}: ${msg}` : `${data.tableName} đang gọi nhân viên`,
        });
      } catch {
        // ignore
      }
    }
  }, [canReceiveStaffCalls, notiEnabled, notificationSupported, playConfiguredAlertSound]);

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
    playConfiguredAlertSound();
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
      } catch {
        // ignore
      }
    }
  }, [canReceiveQrOrderAlerts, notiEnabled, notificationSupported, playConfiguredAlertSound]);

  const handleInvoiceRequest = useCallback((data?: QrInvoiceResponse) => {
    if (!canReceiveInvoiceRequests || !data?.requestId) return;
    const methodLabel = data.deliveryMethod === 'EMAIL'
      ? 'gửi Gmail'
      : data.deliveryMethod === 'DIRECT'
        ? 'tải trực tiếp'
        : 'lấy tại quầy';
    toast.success(
      `Yêu cầu xuất hóa đơn #${data.requestId} cho đơn #${data.orderId} (${methodLabel})`,
      { duration: 7000 },
    );
    playAlertBeep();
  }, [canReceiveInvoiceRequests]);

  useStaffCallSocket(handleStaffCall);
  useFeedbackAlertSocket(handleFeedbackAlert);
  useInvoiceRequestSocket(handleInvoiceRequest);
  useOrderSocket(handleQrOrderAlert);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf7f0]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(107,80,64,0.15)] border-t-[#c9a27a]" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex bg-[#fdf7f0]">
      <div className="hidden lg:block relative z-30">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <MobileHeader />
        {shouldShowEnable && (
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(201,162,122,0.35)] bg-[rgba(201,162,122,0.08)] px-4 py-3">
              <div className="text-sm text-[#6b5040]">
                Bật thông báo / âm thanh để nhận yêu cầu "Gọi nhân viên" và đơn QR mới.
              </div>
              <button
                onClick={enableNotifications}
                className="shrink-0 rounded-lg bg-[#6b5040] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#1a0e07]"
              >
                Bật thông báo / âm thanh
              </button>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-auto p-5 sm:p-6">
          <Outlet />
        </main>
        {canReceiveQrOrderAlerts && (
          <div className="fixed right-4 bottom-4 z-40">
            {showQrOrderFeed && (
              <div className="mb-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.14)] bg-white shadow-[0_16px_48px_-12px_rgba(26,14,7,0.22)]">
                {/* Panel header */}

                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(107,80,64,0.08)]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">☕</span>
                    <p className="text-sm font-semibold text-[#1a0e07]">Đơn QR gần đây</p>
                  </div>
                  <button
                    onClick={() => setQrOrderFeed([])}
                    className="text-xs text-[rgba(107,80,64,0.5)] hover:text-[#6b5040] transition-colors"
                  >
                    Xóa tất cả
                  </button>
                </div>
                <div className="max-h-72 overflow-auto">
                  {qrOrderFeed.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-[rgba(26,14,7,0.45)] text-center">Chưa có đơn QR mới.</p>
                  ) : (
                    qrOrderFeed.map((item) => (
                      <div key={item.id} className="px-4 py-2.5 border-b border-[rgba(107,80,64,0.06)] last:border-b-0 hover:bg-[rgba(107,80,64,0.03)] transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#1a0e07] truncate">Bàn {item.tableLabel} · Đơn #{item.id}</p>
                          <span className="text-[11px] text-[rgba(107,80,64,0.5)] shrink-0">{item.createdAt}</span>
                        </div>
                        <p className="text-xs text-[rgba(26,14,7,0.55)] mt-0.5 leading-relaxed">{item.detail}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => setShowQrOrderFeed((v) => !v)}
              className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#6b5040] text-white shadow-[0_8px_24px_-6px_rgba(107,80,64,0.6)] hover:brightness-110 transition"
              title="Đơn QR mới"
            >
              <Bell size={18} />
              {qrOrderFeed.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[11px] leading-5 text-white font-bold text-center">
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
