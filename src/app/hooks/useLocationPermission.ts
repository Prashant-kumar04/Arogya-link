import { useState, useCallback } from 'react';

export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    mapsUrl: string; // Google Maps link
}

export interface LocationState {
    status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
    location: LocationData | null;
    error: string | null;
}

export function useLocationPermission() {
    const [locationState, setLocationState] = useState<LocationState>({
        status: 'idle',
        location: null,
        error: null,
    });

    const requestLocation = useCallback((): Promise<LocationData | null> => {
        return new Promise((resolve) => {
            // Check if geolocation is supported
            if (!navigator.geolocation) {
                setLocationState({
                    status: 'unavailable',
                    location: null,
                    error: 'Location is not supported by this browser/device',
                });
                resolve(null);
                return;
            }

            setLocationState(prev => ({ ...prev, status: 'requesting', error: null }));

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    const mapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
                    const locationData: LocationData = {
                        latitude,
                        longitude,
                        accuracy,
                        timestamp: position.timestamp,
                        mapsUrl,
                    };
                    setLocationState({
                        status: 'granted',
                        location: locationData,
                        error: null,
                    });
                    resolve(locationData);
                },
                (error) => {
                    let errorMessage = 'Could not get location';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied by user';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out';
                            break;
                    }
                    setLocationState({
                        status: 'denied',
                        location: null,
                        error: errorMessage,
                    });
                    resolve(null); // Resolve with null — do NOT reject — let the app continue without location
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,      // 10 second timeout
                    maximumAge: 60000,   // Accept cached location up to 1 minute old
                }
            );
        });
    }, []);

    return { locationState, requestLocation };
}
