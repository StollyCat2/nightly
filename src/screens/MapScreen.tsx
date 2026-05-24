import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useVenues } from '../hooks/useVenues';
import { useLocation } from '../hooks/useLocation';
import { usePulseZones } from '../hooks/usePulseZones';
import { VenueDoc } from '../types';
import { CITIES, DEFAULT_CITY, City } from '../constants/cities';
import { C } from '../constants/theme';
import PulseLayer from '../components/PulseLayer';
import VenueBottomSheet, { VenueBottomSheetRef } from '../components/VenueBottomSheet';
import CitySearchBar from '../components/CitySearchBar';
import GoingOutCounter from '../components/GoingOutCounter';
import GoingOutPrompt from '../components/GoingOutPrompt';
import VenueTypeFilter, { VENUE_COLORS } from '../components/VenueTypeFilter';
import { VenueType } from '../types';
import { signOut } from 'firebase/auth';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function isWeekendNight(): boolean {
  const day = new Date().getDay();
  return day === 5 || day === 6;
}

export default function MapScreen() {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const sheetRef = useRef<VenueBottomSheetRef>(null);

  const [activeCity, setActiveCity] = useState<City>(DEFAULT_CITY);
  const [selectedVenue, setSelectedVenue] = useState<VenueDoc | null>(null);
  const [goingOutCount, setGoingOutCount] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [typeFilter, setTypeFilter] = useState<VenueType | 'alle'>('alle');

  const { venues } = useVenues(activeCity.name);
  const filteredVenues = typeFilter === 'alle' ? venues : venues.filter(v => v.type === typeFilter);
  const { granted } = useLocation(activeCity.id);
  const pulsePoints = usePulseZones(activeCity.id, venues);

  // Check if we should show the "Skal du ut?" prompt
  useEffect(() => {
    if (!isWeekendNight()) return;
    const key = `prompt_shown_${today()}`;
    AsyncStorage.getItem(key).then((val) => {
      if (!val) setShowPrompt(true);
    });
  }, []);

  // Subscribe to going-out counter for active city
  useEffect(() => {
    const load = async () => {
      const ref = doc(db, 'cityCounters', activeCity.id);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().date === today()) {
        setGoingOutCount(snap.data().count ?? 0);
      } else {
        setGoingOutCount(0);
      }
    };
    load();
  }, [activeCity.id]);

  const flyToCity = useCallback((city: City) => {
    setActiveCity(city);
    cameraRef.current?.setCamera({
      centerCoordinate: [city.lng, city.lat],
      zoomLevel: city.zoom,
      animationDuration: 1200,
    });
  }, []);

  const openVenue = useCallback((venue: VenueDoc) => {
    setSelectedVenue(venue);
    sheetRef.current?.open();
  }, []);

  const handleGoingOut = async () => {
    await AsyncStorage.setItem(`prompt_shown_${today()}`, '1');
    setShowPrompt(false);
    const ref = doc(db, 'cityCounters', activeCity.id);
    await setDoc(ref, { count: increment(1), date: today() }, { merge: true });
    setGoingOutCount((c) => c + 1);
  };

  const handleExplore = async () => {
    await AsyncStorage.setItem(`prompt_shown_${today()}`, '1');
    setShowPrompt(false);
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MAP_STYLE}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        rotateEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={activeCity.zoom}
          centerCoordinate={[activeCity.lng, activeCity.lat]}
          minZoomLevel={activeCity.minZoom}
          maxZoomLevel={18}
        />

        {/* Pulse heatmap */}
        <PulseLayer points={pulsePoints} />

        {/* Venue markers */}
        {filteredVenues.map((venue) => {
          if (!venue.lat || !venue.lng) return null;
          const color = venue.type ? VENUE_COLORS[venue.type] : VENUE_COLORS.bar;
          return (
            <MapboxGL.PointAnnotation
              key={venue.id}
              id={venue.id}
              coordinate={[venue.lng, venue.lat]}
              onSelected={() => openVenue(venue)}
            >
              <View style={[styles.marker, { backgroundColor: color + '40', borderColor: color + '99' }]}>
                <View style={[styles.markerCore, { backgroundColor: color, shadowColor: color }]} />
              </View>
            </MapboxGL.PointAnnotation>
          );
        })}

        {granted && <MapboxGL.UserLocation visible animated />}
      </MapboxGL.MapView>

      {/* Search bar + filter */}
      <CitySearchBar currentCity={activeCity} onSelectCity={flyToCity} />
      <VenueTypeFilter active={typeFilter} onChange={setTypeFilter} />

      {/* Going out counter */}
      <GoingOutCounter count={goingOutCount} city={activeCity.name} />

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut(auth)}>
        <Text style={styles.logoutText}>Logg ut</Text>
      </TouchableOpacity>

      {/* Venue detail sheet */}
      <VenueBottomSheet
        ref={sheetRef}
        venue={selectedVenue}
        onClose={() => setSelectedVenue(null)}
      />

      {/* Weekend prompt */}
      <GoingOutPrompt
        visible={showPrompt}
        onGoingOut={handleGoingOut}
        onExplore={handleExplore}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  map: { flex: 1 },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(199,125,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(199,125,255,0.6)',
  },
  markerCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#c77dff',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  logoutBtn: {
    position: 'absolute',
    bottom: 40,
    right: 16,
    backgroundColor: 'rgba(17,0,25,0.85)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(42,0,64,0.8)',
  },
  logoutText: { color: '#4a3a6b', fontSize: 13 },
});
