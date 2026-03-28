// src/app/hooks/usePermissions.ts
// Manages device contacts + geolocation permissions without any external API
import { useEffect, useCallback } from 'react';
import useHealthStore from '../store/useHealthStore';

export interface DeviceContact {
    name: string;
    phone: string;
}

// ─── Location helpers (pure coordinate logic, no API) ────────────────────────

export function getStoredLocation(): { lat: number; lng: number } | null {
    try {
        const raw = localStorage.getItem('device_location');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function storeLocation(lat: number, lng: number) {
    try {
        localStorage.setItem('device_location', JSON.stringify({ lat, lng }));
        localStorage.setItem('device_location_ts', new Date().toISOString());
    } catch {
        // ignore
    }
}

export async function refreshLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                storeLocation(coords.lat, coords.lng);
                resolve(coords);
            },
            () => resolve(null),
            { timeout: 8000, maximumAge: 0 }
        );
    });
}

// ─── Contacts helpers (Web Contacts API) ─────────────────────────────────────

export function isContactsAPISupported(): boolean {
    return 'contacts' in navigator && typeof (navigator as any).contacts?.select === 'function';
}

export async function pickContactsFromDevice(): Promise<DeviceContact[]> {
    if (!isContactsAPISupported()) return [];
    try {
        const props = ['name', 'tel'];
        const opts = { multiple: true };
        const results = await (navigator as any).contacts.select(props, opts);
        return results.flatMap((c: any) => {
            const name = c.name?.[0] || 'Unknown';
            return (c.tel || []).map((phone: string) => ({ name, phone }));
        });
    } catch {
        return [];
    }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePermissions() {
    const { setLocation, locationGranted, contactsGranted, setLocationGranted, setContactsGranted } =
        useHealthStore();

    // On every mount, refresh location silently if already granted
    useEffect(() => {
        if (locationGranted) {
            refreshLocation().then((coords) => {
                if (coords) setLocation(coords.lat, coords.lng);
            });
        }
    }, [locationGranted, setLocation]);

    const requestLocation = useCallback(async (): Promise<boolean> => {
        const coords = await refreshLocation();
        if (coords) {
            setLocation(coords.lat, coords.lng);
            setLocationGranted(true);
            return true;
        }
        setLocationGranted(false);
        return false;
    }, [setLocation, setLocationGranted]);

    const requestContacts = useCallback(async (): Promise<DeviceContact[]> => {
        if (!isContactsAPISupported()) {
            // Mark as attempted even if not supported (so we don't keep asking)
            setContactsGranted(false);
            return [];
        }
        const contacts = await pickContactsFromDevice();
        setContactsGranted(true);
        return contacts;
    }, [setContactsGranted]);

    return {
        requestLocation,
        requestContacts,
        locationGranted,
        contactsGranted,
        isContactsSupported: isContactsAPISupported(),
    };
}
