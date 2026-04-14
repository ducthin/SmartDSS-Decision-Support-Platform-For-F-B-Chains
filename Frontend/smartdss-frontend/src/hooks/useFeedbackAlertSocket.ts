import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { FeedbackAlert } from '@/types';

export function useFeedbackAlertSocket(onAlert: (data?: FeedbackAlert) => void) {
  const callbackRef = useRef(onAlert);

  useEffect(() => {
    callbackRef.current = onAlert;
  }, [onAlert]);

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
        const sub = client.subscribe('/topic/feedback-alerts', (message) => {
          try {
            const payload = JSON.parse(message.body) as FeedbackAlert;
            callbackRef.current?.(payload);
          } catch {
            callbackRef.current?.(undefined);
          }
        });
        (client as Client & { __feedbackAlertSub?: { unsubscribe: () => void } }).__feedbackAlertSub = sub;
      },
    });

    client.activate();

    return () => {
      const sub = (client as Client & { __feedbackAlertSub?: { unsubscribe: () => void } }).__feedbackAlertSub;
      sub?.unsubscribe?.();
      client.deactivate();
    };
  }, []);
}
