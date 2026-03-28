// src/app/store/useHealthStore.ts - Zustand global state store
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  phone: string;
  name: string | null;
}

export interface Vitals {
  heart_rate?: number;
  spo2?: number;
  bp_sys?: number;
  bp_dia?: number;
  glucose?: number;
  temperature?: number;
}

export interface TrustedContact {
  id: string;
  contact_name: string;
  contact_phone: string;
  is_app_user: boolean;
}

export interface Notification {
  id: string;
  sender_user_id?: string;
  receiver_user_id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface HealthStore {
  // Auth
  user: User | null;
  token: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;

  // Health
  vitals: Vitals | null;
  riskScore: number | null;
  confidence: number | null;
  explanation: string | null;
  timeToRisk: string | null;
  anomalyFlag: boolean;
  lastUpdated: string | null;
  systemState: 'Stable' | 'Elevated' | 'Critical' | null;

  // BMI
  bmi: number | null;
  bmiClassification: string | null;

  // Emergency
  emergencyReason: string | null;
  isEmergencyActive: boolean;

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Contacts
  trustedContacts: TrustedContact[];

  locationStatus: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
  lastLocation: { latitude: number; longitude: number; mapsUrl: string } | null;
  location: { lat: number; lng: number } | null;
  locationGranted: boolean;
  contactsGranted: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLocationStatus: (status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable') => void;
  setLastLocation: (loc: { latitude: number; longitude: number; mapsUrl: string } | null) => void;
  setVitals: (vitals: Vitals | null) => void;
  setRiskScore: (score: number | null) => void;
  setConfidence: (confidence: number | null) => void;
  setExplanation: (explanation: string | null) => void;
  setTimeToRisk: (time: string | null) => void;
  setAnomalyFlag: (flag: boolean) => void;
  setSystemState: (state: 'Stable' | 'Elevated' | 'Critical' | null) => void;
  setBMI: (bmi: number | null, classification: string | null) => void;
  setEmergencyReason: (reason: string | null) => void;
  triggerEmergency: (reason: string) => void;
  clearEmergency: () => void;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationsAsRead: (ids: string[]) => void;
  setTrustedContacts: (contacts: TrustedContact[]) => void;
  addTrustedContact: (contact: TrustedContact) => void;
  removeTrustedContact: (id: string) => void;
  setLocation: (lat: number, lng: number) => void;
  setLocationGranted: (granted: boolean) => void;
  setContactsGranted: (granted: boolean) => void;
  logout: () => void;
  restoreSession: (user: User, token: string) => void;
  initializeDeviceId: () => void;
}

const getOrCreateDeviceId = (): string => {
  try {
    const stored = localStorage.getItem('device_id');
    if (stored) return stored;
    const newId = uuidv4();
    localStorage.setItem('device_id', newId);
    return newId;
  } catch (err) {
    console.error('Failed to initialize device ID:', err);
    return uuidv4();
  }
};

const useHealthStore = create<HealthStore>((set) => ({
  // Initial state
  user: null,
  token: null,
  deviceId: null, // Will be initialized via initializeDeviceId action
  isAuthenticated: false,

  vitals: null,
  riskScore: null,
  confidence: null,
  explanation: null,
  timeToRisk: null,
  anomalyFlag: false,
  lastUpdated: null,
  systemState: null,

  bmi: null,
  bmiClassification: null,

  emergencyReason: null,
  isEmergencyActive: false,

  notifications: [],
  unreadCount: 0,

  trustedContacts: [],

  locationStatus: 'idle',
  lastLocation: null,

  // Location & permissions
  location: null,
  locationGranted: (() => { try { return localStorage.getItem('location_granted') === 'true'; } catch { return false; } })(),
  contactsGranted: (() => { try { return localStorage.getItem('contacts_granted') === 'true'; } catch { return false; } })(),

  // Actions
  setLocation: (lat, lng) => {
    try { localStorage.setItem('device_location', JSON.stringify({ lat, lng })); } catch { }
    set({ location: { lat, lng } });
  },
  setLocationGranted: (granted) => {
    try { localStorage.setItem('location_granted', String(granted)); } catch { }
    set({ locationGranted: granted });
  },
  setContactsGranted: (granted) => {
    try { localStorage.setItem('contacts_granted', String(granted)); } catch { }
    set({ contactsGranted: granted });
  },
  initializeDeviceId: () => {
    const deviceId = getOrCreateDeviceId();
    set({ deviceId });
  },
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),
  setLocationStatus: (locationStatus) => set({ locationStatus }),
  setLastLocation: (lastLocation) => set({ lastLocation }),
  setVitals: (vitals) =>
    set({
      vitals,
      lastUpdated: vitals ? new Date().toISOString() : null,
    }),
  setRiskScore: (riskScore) => set({ riskScore }),
  setConfidence: (confidence) => set({ confidence }),
  setExplanation: (explanation) => set({ explanation }),
  setTimeToRisk: (timeToRisk) => set({ timeToRisk }),
  setAnomalyFlag: (anomalyFlag) => set({ anomalyFlag }),
  setSystemState: (systemState) => set({ systemState }),
  setBMI: (bmi, bmiClassification) => set({ bmi, bmiClassification }),
  setEmergencyReason: (emergencyReason) => set({ emergencyReason }),
  triggerEmergency: (reason) =>
    set({ isEmergencyActive: true, emergencyReason: reason }),
  clearEmergency: () =>
    set({ isEmergencyActive: false, emergencyReason: null }),
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.is_read ? state.unreadCount : state.unreadCount + 1,
    })),
  markNotificationsAsRead: (ids) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        ids.includes(n.id) ? { ...n, is_read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.is_read).length,
      };
    }),
  setTrustedContacts: (trustedContacts) => set({ trustedContacts }),
  addTrustedContact: (contact) =>
    set((state) => ({
      trustedContacts: [...state.trustedContacts, contact],
    })),
  removeTrustedContact: (id) =>
    set((state) => ({
      trustedContacts: state.trustedContacts.filter((c) => c.id !== id),
    })),
  logout: () => {
    try {
      localStorage.removeItem('jwt_token');
    } catch (err) {
      console.error('Failed to clear JWT from localStorage:', err);
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      vitals: null,
      riskScore: null,
      confidence: null,
      explanation: null,
      timeToRisk: null,
      anomalyFlag: false,
      systemState: null,
      bmi: null,
      bmiClassification: null,
      emergencyReason: null,
      isEmergencyActive: false,
      notifications: [],
      unreadCount: 0,
      trustedContacts: [],
      locationStatus: 'idle',
      lastLocation: null,
    });
  },
  restoreSession: (user, token) => {
    set({
      user,
      token,
      isAuthenticated: true,
    });
  },
}));

export default useHealthStore;
