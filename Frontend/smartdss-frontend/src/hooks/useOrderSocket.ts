import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

export function useOrderSocket(onOrderUpdate: () => void) {
  const callbackRef = useRef(onOrderUpdate);
  callbackRef.current = onOrderUpdate;

  useEffect(() => {
    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/orders', () => {
          callbackRef.current();
        });
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);
}
