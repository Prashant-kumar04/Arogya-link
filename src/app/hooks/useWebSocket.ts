import { useEffect, useRef, useCallback, useState } from 'react';

export interface WebSocketMessage {
  type: 'bootstrap' | 'prediction' | 'alert' | 'confirm_check';
  data: any;
}

interface WebSocketHookConfig {
  url?: string;
  userId?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket(config: WebSocketHookConfig) {
  const {
    url = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/vitals`,
    userId,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
  } = config;

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // ✅ FIXED: Use ref for isConnecting guard to avoid re-creating connect on every state change (infinite loop)
  const isConnectingRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(() => {
    // Only connect if userId is provided
    if (!userId) {
      console.log('[WS] Skipping connection: no userId provided');
      return;
    }

    // ✅ Guard via ref (stable) not state (stale closure problem)
    if (socketRef.current || isConnectingRef.current) return;

    isConnectingRef.current = true;
    setIsConnecting(true);

    try {
      const fullUrl = url.replace('{user_id}', userId);
      const socket = new WebSocket(fullUrl);

      socket.onopen = () => {
        console.log('[WS] Connected');
        isConnectingRef.current = false;
        setIsConnected(true);
        setIsConnecting(false);
        reconnectCountRef.current = 0;
        onConnect?.();
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[WS] Message:', message.type);
          onMessage?.(message);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      socket.onerror = (error) => {
        console.error('[WS] Error:', error);
        onError?.(error);
      };

      socket.onclose = () => {
        console.log('[WS] Disconnected');
        isConnectingRef.current = false;
        setIsConnected(false);
        setIsConnecting(false);
        socketRef.current = null;
        onDisconnect?.();

        // Attempt reconnection
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current += 1;
          const delay = reconnectDelay * reconnectCountRef.current;
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.log('[WS] Max reconnection attempts reached');
        }
      };

      socketRef.current = socket;
    } catch (err) {
      console.error('[WS] Connection failed:', err);
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
    // ✅ FIXED: removed isConnecting from deps — it was causing re-creation of connect on every state flip
  }, [url, userId, reconnectAttempts, reconnectDelay, onMessage, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    isConnectingRef.current = false;
    setIsConnected(false);
  }, []);

  const send = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      console.warn('[WS] Socket not ready');
    }
  }, []);

  useEffect(() => {
    if (autoConnect && userId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, userId, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    send,
    connect,
    disconnect,
  };
}
