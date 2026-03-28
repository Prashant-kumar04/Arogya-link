import { useEffect, useState } from 'react';
import { useWebSocket, WebSocketMessage } from './useWebSocket';
import { useHealth } from '../context/HealthContext';
import { Vitals } from '../context/HealthContext';

interface ConfirmCheckPayload {
  timestamp: string;
  timeout: number; // seconds
}

export function useHealthRealtime(userId?: string) {
  const { updateVitals, updateRiskScore, updateStatus, updateExplanation, addChartPoint } = useHealth();
  const [pendingConfirmCheck, setPendingConfirmCheck] = useState<ConfirmCheckPayload | null>(null);
  const [confirmCheckCountdown, setConfirmCheckCountdown] = useState(0);

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'bootstrap':
        // Bootstrap with recent vitals
        if (Array.isArray(message.data) && message.data.length > 0) {
          const latest = message.data[message.data.length - 1];
          applyPredictionData(latest);
        }
        break;

      case 'prediction':
        // New prediction received
        applyPredictionData(message.data);
        break;

      case 'alert':
        // Alert triggered
        applyPredictionData(message.data);
        // Automatically navigate to emergency screen
        window.dispatchEvent(
          new CustomEvent('health_alert', {
            detail: message.data,
          })
        );
        break;

      case 'confirm_check':
        // Server asking for confirmation
        setPendingConfirmCheck(message.data as ConfirmCheckPayload);
        setConfirmCheckCountdown(message.data.timeout);
        break;

      default:
        console.log('[Realtime] Unknown message type:', message.type);
    }
  };

  const applyPredictionData = (data: any) => {
    // Update vitals if present
    if (data.vitals) {
      updateVitals(data.vitals);
      if (data.vitals.heart_rate && data.vitals.systolic) {
        addChartPoint(data.vitals.heart_rate, data.vitals.systolic);
      }
    }

    // Update risk score
    if (typeof data.risk_score === 'number') {
      updateRiskScore(data.risk_score);
    }

    // Update status
    if (data.status) {
      updateStatus(data.status);
    }

    // Update explanation
    if (data.explanation) {
      updateExplanation(data.explanation);
    }
  };

  const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
  const { isConnected, send } = useWebSocket({
    url: userId ? `${wsBase}/ws/vitals/${userId}` : undefined,
    userId,
    onMessage: handleWebSocketMessage,
  });

  // Countdown for confirm check
  useEffect(() => {
    if (confirmCheckCountdown <= 0) return;

    const timer = setInterval(() => {
      setConfirmCheckCountdown((prev) => {
        if (prev <= 1) {
          // Timeout - trigger alert
          if (pendingConfirmCheck) {
            window.dispatchEvent(
              new CustomEvent('health_alert', {
                detail: { reason: 'User did not respond to health confirmation check' },
              })
            );
          }
          setPendingConfirmCheck(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [confirmCheckCountdown, pendingConfirmCheck]);

  const respondToConfirmCheck = (isOkay: boolean) => {
    send({
      type: 'confirm_response',
      data: {
        is_okay: isOkay,
        timestamp: new Date().toISOString(),
      },
    });
    setPendingConfirmCheck(null);
    setConfirmCheckCountdown(0);
  };

  return {
    isConnected,
    pendingConfirmCheck,
    confirmCheckCountdown,
    respondToConfirmCheck,
    send,
  };
}
