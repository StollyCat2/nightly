import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { encodeGeohash } from '../utils/geohash';

const PING_INTERVAL_MS = 60_000; // ping every 60 seconds
const PING_TTL_MS = 10 * 60 * 1000; // expire after 10 minutes

export function useLocation(cityId: string | null) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const latestPos = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ granted }) => setGranted(granted));
  }, []);

  useEffect(() => {
    if (!granted || !cityId) return;

    subRef.current = null;

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 30_000, distanceInterval: 100 },
      (loc) => {
        latestPos.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      },
    ).then((sub) => { subRef.current = sub; });

    const ping = () => {
      const uid = auth.currentUser?.uid;
      const pos = latestPos.current;
      if (!uid || !pos) return;

      const expiresAt = new Date(Date.now() + PING_TTL_MS);
      const geohash = encodeGeohash(pos.lat, pos.lng, 6);

      setDoc(doc(db, 'userPings', uid), {
        lat: pos.lat,
        lng: pos.lng,
        geohash,
        cityId,
        expiresAt: Timestamp.fromDate(expiresAt),
      }).catch(() => {});
    };

    ping();
    intervalRef.current = setInterval(ping, PING_INTERVAL_MS);

    return () => {
      subRef.current?.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [granted, cityId]);

  const requestPermission = async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    setGranted(granted);
    return granted;
  };

  return { granted, requestPermission };
}
