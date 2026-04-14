import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { Order } from '@/types';

type UseOrderSocketOptions = {
  /** QR/public pages should not send JWT on WS CONNECT */
  publicMode?: boolean;
  /** Custom STOMP topic; default for staff dashboards is /topic/orders */
  topicDestination?: string;
};

function isLikelyJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadBase64)) as { exp?: number };
    if (!payload.exp) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    // 5s buffer
    return payload.exp <= nowSec + 5;
  } catch {
    return false;
  }
}

export function useOrderSocket(onOrderUpdate: (data?: Order) => void, options?: UseOrderSocketOptions) {
  const callbackRef = useRef(onOrderUpdate);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = onOrderUpdate;
  }, [onOrderUpdate]);

  useEffect(() => {
    const publicMode = options?.publicMode === true;
    const token = publicMode ? null : localStorage.getItem('token');
    const canUseBearer = !!token && !isLikelyJwtExpired(token);
    const destination = options?.topicDestination || '/topic/orders';

    const client = new Client({
      brokerURL: import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws',
      connectHeaders: canUseBearer ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onStompError: (frame) => {
        console.error('STOMP error', frame.headers['message'], frame.body);
      },
      onWebSocketError: (evt) => {
        console.error('WebSocket error', evt);
      },
      onConnect: () => {
        const subscription = client.subscribe(destination, (message) => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          let orderData: Order | undefined;
          try {
            orderData = JSON.parse(message.body) as Order;
          } catch {
            orderData = undefined;
          }
          const data = orderData;
          timeoutRef.current = setTimeout(() => {
            callbackRef.current?.(data);
          }, 500);
        });

        // Ensure we unsubscribe before disconnecting
        (client as Client & { __ordersSub?: { unsubscribe: () => void } }).__ordersSub = subscription;
      },
    });

    client.activate();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;

      const sub = (client as Client & { __ordersSub?: { unsubscribe: () => void } }).__ordersSub;
      sub?.unsubscribe?.();
      client.deactivate();
    };
  }, [options?.publicMode, options?.topicDestination]);
}
