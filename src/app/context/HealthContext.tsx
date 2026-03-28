import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export interface Vitals {
  age?: number;
  sex?: number;
  cholesterol?: number;
  heart_rate?: number;
  diabetes?: number;
  smoking?: number;
  obesity?: number;
  alcohol_consumption?: number;
  exercise_hours_per_week?: number;
  previous_heart_problems?: number;
  medication_use?: number;
  stress_level?: number;
  sedentary_hours_per_day?: number;
  bmi?: number;
  triglycerides?: number;
  physical_activity_days_per_week?: number;
  sleep_hours_per_day?: number;
  systolic?: number;
  diastolic?: number;
  diet_average?: number;
  diet_healthy?: number;
  diet_unhealthy?: number;
  spo2?: number;
  temperature?: number;
}

export interface HealthData {
  risk_score: number | null;
  status: 'safe' | 'warning' | 'critical' | null;
  explanation: string;
  timestamp: string | null;
  vitals: Vitals;
  chartData: Array<{ time: string; heartRate: number; bp: number }>;
}

interface HealthContextType {
  health: HealthData;
  updateVitals: (vitals: Partial<Vitals>) => void;
  updateRiskScore: (score: number) => void;
  updateStatus: (status: 'safe' | 'warning' | 'critical') => void;
  updateExplanation: (explanation: string) => void;
  addChartPoint: (heartRate: number, bp: number) => void;
  reset: () => void;
}

const defaultHealth: HealthData = {
  risk_score: null,
  status: null,
  explanation: 'No data available. Connect your device or enter data manually.',
  timestamp: null,
  vitals: {},
  chartData: [],
};

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<HealthData>(defaultHealth);

  const updateVitals = useCallback((vitals: Partial<Vitals>) => {
    setHealth((prev) => ({
      ...prev,
      vitals: { ...prev.vitals, ...vitals },
    }));
  }, []);

  const updateRiskScore = useCallback((score: number) => {
    setHealth((prev) => ({
      ...prev,
      risk_score: score,
    }));
  }, []);

  const updateStatus = useCallback((status: 'safe' | 'warning' | 'critical') => {
    setHealth((prev) => ({
      ...prev,
      status,
    }));
  }, []);

  const updateExplanation = useCallback((explanation: string) => {
    setHealth((prev) => ({
      ...prev,
      explanation,
    }));
  }, []);

  const addChartPoint = useCallback((heartRate: number, bp: number) => {
    setHealth((prev) => {
      const newPoint = {
        time: new Date().toLocaleTimeString(),
        heartRate: Math.round(heartRate),
        bp: Math.round(bp),
      };
      const newChartData = [...prev.chartData, newPoint].slice(-30);
      return {
        ...prev,
        chartData: newChartData,
        timestamp: new Date().toISOString(),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setHealth(defaultHealth);
  }, []);

  return (
    <HealthContext.Provider
      value={{
        health,
        updateVitals,
        updateRiskScore,
        updateStatus,
        updateExplanation,
        addChartPoint,
        reset,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within HealthProvider');
  }
  return context;
}
