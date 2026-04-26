import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { QrInvoiceResponse } from '@/types';

export function useInvoiceRequestSocket(onInvoiceRequest: (data?: QrInvoiceResponse) => void) {
  const callbackRef = useRef(onInvoiceRequest);

  useEffect(() => {
    callbackRef.current = onInvoiceRequest;
  }, [onInvoiceRequest]);

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
        const sub = client.subscribe('/topic/invoice-requests', (message) => {
          try {
            callbackRef.current?.(JSON.parse(message.body) as QrInvoiceResponse);
          } catch {
            callbackRef.current?.(undefined);
          }
        });
        (client as Client & { __invoiceRequestSub?: { unsubscribe: () => void } }).__invoiceRequestSub = sub;
      },
    });

    client.activate();

    return () => {
      const sub = (client as Client & { __invoiceRequestSub?: { unsubscribe: () => void } }).__invoiceRequestSub;
      sub?.unsubscribe?.();
      client.deactivate();
    };
  }, []);
}
