import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

export function useOrderSocket(onOrderUpdate: () => void) {
  const callbackRef = useRef(onOrderUpdate);
  callbackRef.current = onOrderUpdate;

  useEffect(() => {
    const token = localStorage.getItem('token');

    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        let timeoutId: ReturnType<typeof setTimeout>;
        client.subscribe('/topic/orders', () => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (callbackRef.current) callbackRef.current();
          }, 500);
        });
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);
}

