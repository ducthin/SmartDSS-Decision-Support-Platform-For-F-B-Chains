import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar, { MobileHeader } from './Sidebar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useStaffCallSocket } from '@/hooks/useStaffCallSocket';
import type { StaffCall } from '@/types';
import { getRoleKey } from '@/utils/helpers';
import { resolveBackendUrl, settingsService } from '@/services/settingsService';

const STAFF_NOTI_PREF_KEY = 'staff_notifications_enabled';

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
  const canReceiveStaffCalls = ['ADMIN', 'MANAGER', 'WAITER', 'BARISTA'].includes(userRole);
  const lastCallIdRef = useRef<number | null>(null);
  const [notiEnabled, setNotiEnabled] = useState(() => localStorage.getItem(STAFF_NOTI_PREF_KEY) === '1');
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

  useStaffCallSocket(handleStaffCall);

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
      </div>
    </div>
  );
}
