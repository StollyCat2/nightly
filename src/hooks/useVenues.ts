import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { VenueDoc } from '../types';

export function useVenues() {
  const [venues, setVenues] = useState<VenueDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'venues'), where('isActive', '==', true));
    return onSnapshot(q, (snap) => {
      setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VenueDoc)));
      setLoading(false);
    });
  }, []);

  return { venues, loading };
}
