import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { Order } from '@/types';

export function useOrderSocket(onOrderUpdate: (data?: Order) => void) {
  const callbackRef = useRef(onOrderUpdate);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = onOrderUpdate;
  }, [onOrderUpdate]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    const client = new Client({
      brokerURL: import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws',
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onStompError: (frame) => {
        console.error('STOMP error', frame.headers['message'], frame.body);
      },
      onWebSocketError: (evt) => {
        console.error('WebSocket error', evt);
      },
      onConnect: () => {
        const subscription = client.subscribe('/topic/orders', (message) => {
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
  }, []);
}
