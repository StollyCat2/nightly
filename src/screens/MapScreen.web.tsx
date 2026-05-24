import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useVenues } from '../hooks/useVenues';
import { usePulseZones } from '../hooks/usePulseZones';
import { VenueDoc, VenueType } from '../types';
import { CITIES, DEFAULT_CITY, City } from '../constants/cities';
import { C } from '../constants/theme';
import GoingOutPrompt from '../components/GoingOutPrompt';
import VenueTypeFilter, { VENUE_COLORS } from '../components/VenueTypeFilter';
import VenueBottomSheet, { VenueBottomSheetRef } from '../components/VenueBottomSheet';

mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function isWeekendNight(): boolean {
  const day = new Date().getDay();
  return day === 5 || day === 6;
}

export default function MapScreen() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const sheetRef = useRef<VenueBottomSheetRef>(null);

  const [activeCity, setActiveCity] = useState<City>(DEFAULT_CITY);
  const [selectedVenue, setSelectedVenue] = useState<VenueDoc | null>(null);
  const [goingOutCount, setGoingOutCount] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [typeFilter, setTypeFilter] = useState<VenueType | 'alle'>('alle');

  const { venues } = useVenues();
  const filteredVenues = typeFilter === 'alle' ? venues : venues.filter(v => v.type === typeFilter);
  const pulsePoints = usePulseZones(activeCity.id, venues);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [activeCity.lng, activeCity.lat],
      zoom: activeCity.zoom,
      minZoom: activeCity.minZoom,
      maxZoom: 18,
      attributionControl: false,
    });

    map.current.on('load', () => {
      map.current!.addSource('pulse-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.current!.addLayer({
        id: 'pulse-heat',
        type: 'heatmap',
        source: 'pulse-source',
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 22, 13, 36, 15, 60],
          'heatmap-opacity': 0.9,
          'heatmap-intensity': 3,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,    'rgba(0,0,0,0)',
            0.15, 'rgba(60,0,120,0.3)',
            0.35, 'rgba(110,20,200,0.6)',
            0.55, 'rgba(160,70,240,0.8)',
            0.75, 'rgba(199,125,255,0.95)',
            1.0,  'rgba(235,200,255,1)',
          ],
        },
      });

      const animate = () => {
        const t = Date.now() / 1000;
        const pulse = Math.sin(t * 1.4) * 0.5 + 0.5;
        const zoom = map.current?.getZoom() ?? 13;
        const baseRadius = zoom < 12 ? 22 : zoom < 14 ? 36 : 60;
        map.current?.setPaintProperty('pulse-heat', 'heatmap-radius', baseRadius * (0.85 + pulse * 0.3));
        map.current?.setPaintProperty('pulse-heat', 'heatmap-intensity', 2.5 + pulse * 1.5);
        map.current?.setPaintProperty('pulse-heat', 'heatmap-opacity', 0.75 + pulse * 0.2);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const src = map.current?.getSource('pulse-source') as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: 'FeatureCollection',
      features: pulsePoints.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { weight: p.weight },
      })),
    });
  }, [pulsePoints]);

  useEffect(() => {
    if (!map.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredVenues.forEach((venue) => {
      if (!venue.lat || !venue.lng) return;
      const color = venue.type ? VENUE_COLORS[venue.type] : VENUE_COLORS.bar;

      const el = document.createElement('div');
      el.style.cssText = `
        width:28px;height:28px;border-radius:50%;
        background:${color}40;border:1.5px solid ${color}99;
        display:flex;align-items:center;justify-content:center;cursor:pointer;
      `;
      const core = document.createElement('div');
      core.style.cssText = `
        width:10px;height:10px;border-radius:50%;
        background:${color};box-shadow:0 0 8px 3px ${color};
      `;
      el.appendChild(core);
      el.addEventListener('click', () => {
        setSelectedVenue(venue);
        sheetRef.current?.open();
      });

      markersRef.current.push(
        new mapboxgl.Marker({ element: el }).setLngLat([venue.lng, venue.lat]).addTo(map.current!),
      );
    });
  }, [filteredVenues]);

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

  useEffect(() => {
    if (!isWeekendNight()) return;
    const key = `prompt_shown_${today()}`;
    AsyncStorage.getItem(key).then((val) => {
      if (!val) setShowPrompt(true);
    });
  }, []);

  const flyToCity = (city: City) => {
    setActiveCity(city);
    setShowCityPicker(false);
    map.current?.flyTo({ center: [city.lng, city.lat], zoom: city.zoom, duration: 1200 });
  };

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
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

      {/* City picker */}
      <View style={styles.searchWrapper}>
        <TouchableOpacity style={styles.cityPill} onPress={() => setShowCityPicker(v => !v)}>
          <Text style={styles.cityPillIcon}>📍</Text>
          <Text style={styles.cityPillText}>{activeCity.name}</Text>
          <Text style={styles.cityPillChevron}>{showCityPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showCityPicker && (
          <View style={styles.dropdown}>
            {CITIES.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={[styles.dropdownItem, city.id === activeCity.id && styles.dropdownItemActive]}
                onPress={() => flyToCity(city)}
              >
                <Text style={styles.dropdownIcon}>📍</Text>
                <Text style={[styles.dropdownText, city.id === activeCity.id && styles.dropdownTextActive]}>
                  {city.name}
                </Text>
                {city.id === activeCity.id && <Text style={styles.dropdownCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Type filter */}
      <View style={styles.filterWrapper}>
        <VenueTypeFilter active={typeFilter} onChange={setTypeFilter} />
      </View>

      {/* Going out counter */}
      {goingOutCount >= 40 && (
        <View style={styles.counter}>
          <View style={styles.counterDot} />
          <Text style={styles.counterCount}>{goingOutCount}</Text>
          <Text style={styles.counterLabel}>skal ut i {activeCity.name} i kveld</Text>
        </View>
      )}

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
  filterWrapper: { position: 'absolute', top: 76, left: 8, right: 8, zIndex: 10 },
  searchWrapper: { position: 'absolute', top: 20, left: 16, right: 16, zIndex: 20 },
  cityPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: C.card, borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 11,
    borderWidth: 1, borderColor: C.borderBright, gap: 8,
  },
  cityPillIcon: { fontSize: 14 },
  cityPillText: { color: C.text, fontSize: 16, fontWeight: '700' },
  cityPillChevron: { color: C.muted, fontSize: 10 },
  dropdown: {
    backgroundColor: C.cardSolid, borderRadius: 16, marginTop: 8,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    alignSelf: 'flex-start', minWidth: 180,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dropdownItemActive: { backgroundColor: C.accentGlow },
  dropdownIcon: { fontSize: 14 },
  dropdownText: { color: C.muted, fontSize: 15, fontWeight: '600', flex: 1 },
  dropdownTextActive: { color: C.text },
  dropdownCheck: { color: C.accent, fontSize: 14, fontWeight: '800' },
  counter: {
    position: 'absolute', top: 80, right: 16,
    backgroundColor: C.card, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.accent + '66', zIndex: 10,
  },
  counterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e040fb' },
  counterCount: { fontSize: 15, fontWeight: '800', color: C.accent },
  counterLabel: { fontSize: 11, color: C.muted },
});
