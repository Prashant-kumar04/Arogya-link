// If VITE_BACKEND_URL is not set (production/hosted), use the current origin
const API_BASE = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "http://localhost:3001";
const FASTAPI_BASE = `${API_BASE}/ai-api`;

export type VitalsPayload = {
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
};

export type PredictionResponse = {
  risk_score: number;
  status: "safe" | "warning" | "critical";
  prediction: number;
  explanation: string;
  timestamp: string;
  vitals?: VitalsPayload;
};

function getAuthToken(): string | null {
  return localStorage.getItem('jwt_token');
}

async function http<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...init?.headers,
  };

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// FastAPI endpoints (ML predictions & vitals)
export async function predictVitals(vitals: VitalsPayload, source: "manual" | "smartwatch" | "demo" = "manual") {
  return http<PredictionResponse>(FASTAPI_BASE, "/predict", {
    method: "POST",
    body: JSON.stringify({ vitals, source }),
  });
}

export async function ingestVitals(vitals: VitalsPayload) {
  return http<PredictionResponse>(FASTAPI_BASE, "/vitals", {
    method: "POST",
    body: JSON.stringify(vitals),
  });
}

export async function fetchRecentVitals(limit = 20) {
  return http<{ items: any[] }>(FASTAPI_BASE, `/vitals/recent?limit=${limit}`);
}

export async function fetchAlerts(limit = 20) {
  return http<{ items: any[] }>(FASTAPI_BASE, `/alerts?limit=${limit}`);
}

export async function simulateEmergency() {
  return http<PredictionResponse>(FASTAPI_BASE, "/simulate/emergency", { method: "POST" });
}

export function openVitalsSocket(onMessage: (data: any) => void) {
  const wsUrl = FASTAPI_BASE.replace(/^http/, "ws") + "/ws/vitals";
  const socket = new WebSocket(wsUrl);
  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      onMessage(parsed);
    } catch (err) {
      console.error("Failed to parse WS message", err);
    }
  };
  return socket;
}

// Express backend endpoints (auth, contacts, notifications, devices)
export async function sendOTP(phone: string) {
  return http<{ success: boolean; message: string }>(API_BASE, "/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOTP(phone: string, otp: string) {
  return http<{ exists: boolean; token?: string; user?: any }>(API_BASE, "/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });
}

export async function registerUser(phone: string, name: string) {
  return http<{ token: string; user: any }>(API_BASE, "/auth/register", {
    method: "POST",
    body: JSON.stringify({ phone, name }),
  });
}

export async function fetchContacts() {
  return http<any[]>(API_BASE, "/contacts", {});
}

export async function addContact(contact_name: string, contact_phone: string) {
  return http<any>(API_BASE, "/contacts/add", {
    method: "POST",
    body: JSON.stringify({ contact_name, contact_phone }),
  });
}

export async function deleteContact(contact_id: string) {
  return http<{ success: boolean }>(API_BASE, `/contacts/${contact_id}`, {
    method: "DELETE",
  });
}

export async function fetchNotifications() {
  return http<{ notifications: any[]; unreadCount: number }>(API_BASE, "/notifications", {});
}

export async function markNotificationsAsRead(notification_ids: string[]) {
  return http<{ success: boolean }>(API_BASE, "/notifications/read", {
    method: "PATCH",
    body: JSON.stringify({ notification_ids }),
  });
}

export async function registerDevice(device_type: string, device_id: string) {
  return http<any>(API_BASE, "/device/register", {
    method: "POST",
    body: JSON.stringify({ device_type, device_id }),
  });
}

export async function fetchDevices() {
  return http<any[]>(API_BASE, "/devices", {});
}

export async function sendEmergencyAlert(
  reason?: string,
  location?: {
    latitude: number;
    longitude: number;
    mapsUrl: string;
  }
) {
  return http<{ success: boolean; sent_to: number }>(API_BASE, "/emergency-alert", {
    method: "POST",
    body: JSON.stringify({
      reason: reason || "Manual emergency alert triggered",
      location: location || null,
    }),
  });
}

