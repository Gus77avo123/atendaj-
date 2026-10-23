import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type Coordinates = { latitude: number; longitude: number };
export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

const fallback: Coordinates = { latitude: -15.7942, longitude: -47.8825 };
let foregroundPermissionRequest: Promise<Location.LocationPermissionResponse> | null = null;

export async function ensureForegroundLocationPermission(promptAfterDenial = true) {
  if (foregroundPermissionRequest) return foregroundPermissionRequest;

  foregroundPermissionRequest = (async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted || (!promptAfterDenial && current.status !== 'undetermined') || !current.canAskAgain) {
      return current;
    }
    return Location.requestForegroundPermissionsAsync();
  })();

  try {
    return await foregroundPermissionRequest;
  } finally {
    foregroundPermissionRequest = null;
  }
}

export function useCurrentLocation(enabled = true) {
  const [coordinates, setCoordinates] = useState(fallback);
  const [source, setSource] = useState<'device' | 'sample'>('sample');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<LocationStatus>(enabled ? 'requesting' : 'idle');
  const [canWatchLocation, setCanWatchLocation] = useState(false);

  const locate = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setStatus('requesting');
    try {
      const permission = await ensureForegroundLocationPermission();
      if (!permission.granted) {
        setSource('sample');
        setStatus('denied');
        setCanWatchLocation(false);
        return;
      }
      setCanWatchLocation(true);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setSource('device');
      setStatus('granted');
    } catch (error) {
      setSource('sample');
      setStatus('error');
      console.warn('Falha ao obter localização do dispositivo.', error);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!canWatchLocation) return undefined;
    let active = true;
    let subscription: Location.LocationSubscription | null = null;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 25 },
      (position) => {
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setSource('device');
      },
    ).then((nextSubscription) => {
      if (active) subscription = nextSubscription;
      else nextSubscription.remove();
    }).catch((error: unknown) => {
      console.warn('Não foi possível acompanhar a localização do dispositivo.', error);
      if (active) setStatus('error');
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [canWatchLocation]);

  useEffect(() => {
    if (enabled) void locate();
  }, [enabled, locate]);
  return { coordinates, source, status, loading, locate };
}
