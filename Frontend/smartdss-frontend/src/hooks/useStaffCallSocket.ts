import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { StaffCall } from '@/types';

export function useStaffCallSocket(onCall: (data?: StaffCall) => void) {
  const callbackRef = useRef(onCall);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = onCall;
  }, [onCall]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const client = new Client({
      brokerURL: import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws',
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onStompError: (frame) => {
        console.error('STOMP error', frame.headers['message'], frame.body);
      },
      onWebSocketError: (evt) => {
        console.error('WebSocket error', evt);
      },
      onConnect: () => {
        const subscription = client.subscribe('/topic/staff-calls', (message) => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          let callData: StaffCall | undefined;
          try {
            callData = JSON.parse(message.body) as StaffCall;
          } catch {
            callData = undefined;
          }
          const data = callData;
          timeoutRef.current = setTimeout(() => {
            callbackRef.current?.(data);
          }, 300);
        });

        (client as Client & { __staffCallsSub?: { unsubscribe: () => void } }).__staffCallsSub = subscription;
      },
    });

    client.activate();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;

      const sub = (client as Client & { __staffCallsSub?: { unsubscribe: () => void } }).__staffCallsSub;
      sub?.unsubscribe?.();
      client.deactivate();
    };
  }, []);
}

