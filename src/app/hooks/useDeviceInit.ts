// src/app/hooks/useDeviceInit.ts - Initialize device ID on mount
import { useEffect } from 'react';
import useHealthStore from '../store/useHealthStore';

export function useDeviceInit() {
  // ✅ Call hook at top level (not inside useEffect)
  const initializeDeviceId = useHealthStore((state) => state.initializeDeviceId);

  useEffect(() => {
    initializeDeviceId();
  }, [initializeDeviceId]);
}
