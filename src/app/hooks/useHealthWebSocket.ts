// src/app/hooks/useHealthWebSocket.ts - WebSocket connection for real-time health updates
import { useEffect, useRef, useCallback } from 'react';
import useHealthStore from '../store/useHealthStore';

const FASTAPI_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useHealthWebSocket(userId: string | null | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectCountRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 1000; // 1 second

  const {
    setVitals,
    setRiskScore,
    setConfidence,
    setExplanation,
    setTimeToRisk,
    setAnomalyFlag,
    setSystemState,
    triggerEmergency,
    addNotification,
  } = useHealthStore();

  const connect = useCallback(() => {
    if (!userId) return;

    try {
      const wsUrl = `${FASTAPI_URL.replace(/^http/, 'ws')}/ws/${userId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        reconnectCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        wsRef.current = null;

        // Attempt reconnect with exponential backoff
        if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectCountRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
    }
  }, [userId]);

  const handleWebSocketMessage = useCallback(
    (message: any) => {
      const { type, data } = message;

      switch (type) {
        case 'prediction_update': {
          // Real-time vitals update from ML model
          setVitals({
            heart_rate: data.vitals?.heart_rate,
            spo2: data.vitals?.spo2,
            bp_sys: data.vitals?.bp_sys,
            bp_dia: data.vitals?.bp_dia,
            glucose: data.vitals?.glucose,
            temperature: data.vitals?.temperature,
          });
          setRiskScore(data.risk_score);
          setConfidence(data.confidence);
          setExplanation(data.explanation);
          setTimeToRisk(data.time_to_risk);
          setAnomalyFlag(data.anomaly_flag || false);

          // Determine system state
          if (data.risk_score >= 65) {
            setSystemState('Critical');
          } else if (data.risk_score >= 35) {
            setSystemState('Elevated');
          } else {
            setSystemState('Stable');
          }
          break;
        }

        case 'confirm_check': {
          // ML model detected anomaly and needs user confirmation
          // Frontend should show modal with 10-second countdown
          // (Handled separately in component that shows the modal)
          console.log('📋 Confirmation check needed:', data.reason);
          break;
        }

        case 'alert_triggered': {
          // Alert condition triggered (e.g., high risk)
          console.log('🚨 Alert triggered:', data.message);
          addNotification({
            id: `alert-${Date.now()}`,
            receiver_user_id: userId || '',
            message: data.message,
            type: 'alert',
            is_read: false,
            created_at: new Date().toISOString(),
          });
          break;
        }

        case 'emergency_notification': {
          // Emergency has been triggered - navigate to emergency screen
          triggerEmergency(data.reason);
          console.log('🆘 Emergency triggered:', data.reason);
          break;
        }

        case 'bootstrap': {
          // Initial data on connection
          if (data && data.length > 0) {
            const latest = data[0];
            setVitals({
              heart_rate: latest.vitals?.heart_rate,
              spo2: latest.vitals?.spo2,
              bp_sys: latest.vitals?.systolic,
              bp_dia: latest.vitals?.diastolic,
              glucose: latest.vitals?.glucose,
            });
            setRiskScore(latest.risk_score);
          }
          break;
        }

        default:
          console.log('Unknown WebSocket message type:', type);
      }
    },
    [
      setVitals,
      setRiskScore,
      setConfidence,
      setExplanation,
      setTimeToRisk,
      setAnomalyFlag,
      setSystemState,
      triggerEmergency,
      addNotification,
      userId,
    ]
  );

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Connect on userId change
  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  const isConnected = wsRef.current?.readyState === WebSocket.OPEN;

  return {
    isConnected,
    sendMessage,
    reconnect: connect,
  };
}
