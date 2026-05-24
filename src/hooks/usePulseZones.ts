import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { VenueDoc, QueueStatus } from '../types';

export interface PulsePoint {
  lat: number;
  lng: number;
  weight: number;
}

const STATUS_WEIGHT: Record<QueueStatus, number> = {
  lite:     0.3,
  moderat:  0.55,
  lang:     0.8,
  fullt:    1.0,
};

function venuePoints(venue: VenueDoc): PulsePoint[] {
  if (!venue.lat || !venue.lng || !venue.queueStatus) return [];
  return [{ lat: venue.lat, lng: venue.lng, weight: STATUS_WEIGHT[venue.queueStatus] }];
}

export function usePulseZones(cityId: string | null, venues: VenueDoc[]) {
  const [userPoints, setUserPoints] = useState<PulsePoint[]>([]);

  useEffect(() => {
    if (!cityId) return;
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000));
    const q = query(
      collection(db, 'userPings'),
      where('cityId', '==', cityId),
      where('expiresAt', '>', cutoff),
    );
    return onSnapshot(q, (snap) => {
      setUserPoints(snap.docs.map((d) => ({
        lat: d.data().lat as number,
        lng: d.data().lng as number,
        weight: 0.4,
      })));
    });
  }, [cityId]);

  // Venue-based synthetic points from active queue statuses
  const venueBasedPoints = venues.flatMap(venuePoints);

  return [...venueBasedPoints, ...userPoints];
}
