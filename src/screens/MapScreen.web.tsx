import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db, logEvent } from '../firebase/config';
import { useVenues } from '../hooks/useVenues';
import { usePulseZones } from '../hooks/usePulseZones';
import { VenueDoc, VenueType } from '../types';
import { CITIES, DEFAULT_CITY, City } from '../constants/cities';
import { C } from '../constants/theme';
import GoingOutPrompt from '../components/GoingOutPrompt';
import VenueTypeFilter, { VENUE_COLORS } from '../components/VenueTypeFilter';
import VenueBottomSheet, { VenueBottomSheetRef } from '../components/VenueBottomSheet';

mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

const searchInputStyle: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none', outline: 'none',
  color: '#ffffff', fontSize: 15, fontFamily: 'inherit', minWidth: 0,
};

const QUEUE_COLORS: Record<string, string> = {
  lite:     '#39ff14', // neon grønn
  moderat:  '#ffe600', // gul
  lang:     '#ff6b00', // oransje
  fullt:    '#ff2244', // rød
};

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
  const animFrameRef = useRef<number | null>(null);
  const venuesRef = useRef<VenueDoc[]>([]);
  const mapReadyRef = useRef(false);
  const sheetRef = useRef<VenueBottomSheetRef>(null);

  const [activeCity, setActiveCity] = useState<City>(DEFAULT_CITY);
  const [selectedVenue, setSelectedVenue] = useState<VenueDoc | null>(null);
  const [goingOutCount, setGoingOutCount] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<VenueType | 'alle'>('alle');

  const cityResults = cityQuery.length > 0
    ? CITIES.filter((c) => c.name.toLowerCase().startsWith(cityQuery.toLowerCase()))
    : CITIES;

  const { venues } = useVenues();
  const filteredVenues = useMemo(
    () => typeFilter === 'alle' ? venues : venues.filter(v => v.type === typeFilter),
    [venues, typeFilter],
  );
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
      // Pulse heatmap source
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

      // Venue markers — WebGL circles (no DOM lag)
      // Priority: queue status → venue type → default
      const colorExpr: mapboxgl.Expression = ['case',
        ['==', ['get', 'qs'], 'lite'],          '#39ff14',
        ['==', ['get', 'qs'], 'moderat'],       '#ffe600',
        ['==', ['get', 'qs'], 'lang'],          '#ff6b00',
        ['==', ['get', 'qs'], 'fullt'],         '#ff2244',
        ['==', ['get', 'type'], 'nattklubb'],   '#ffc300',
        ['==', ['get', 'type'], 'bar'],         '#c77dff',
        '#888888',
      ];

      map.current!.addSource('venues-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Outer glow ring
      map.current!.addLayer({
        id: 'venues-halo',
        type: 'circle',
        source: 'venues-source',
        paint: {
          'circle-radius': 18,
          'circle-color': colorExpr,
          'circle-opacity': 0.12,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': colorExpr,
          'circle-stroke-opacity': 0.5,
        },
      });

      // Inner core dot
      map.current!.addLayer({
        id: 'venues-core',
        type: 'circle',
        source: 'venues-source',
        paint: {
          'circle-radius': 6,
          'circle-color': colorExpr,
          'circle-opacity': 1,
          'circle-blur': 0.15,
        },
      });

      // Click handler
      map.current!.on('click', 'venues-halo', (e) => {
        const id = e.features?.[0]?.properties?.id;
        const venue = venuesRef.current.find((v) => v.id === id);
        if (venue) {
          setSelectedVenue(venue); sheetRef.current?.open();
          logEvent('venue_tap', { venue_id: venue.id, venue_name: venue.name, city: venue.city ?? '' });
        }
      });
      map.current!.on('click', 'venues-core', (e) => {
        const id = e.features?.[0]?.properties?.id;
        const venue = venuesRef.current.find((v) => v.id === id);
        if (venue) {
          setSelectedVenue(venue); sheetRef.current?.open();
          logEvent('venue_tap', { venue_id: venue.id, venue_name: venue.name, city: venue.city ?? '' });
        }
      });

      // Cursor
      map.current!.on('mouseenter', 'venues-core', () => { map.current!.getCanvas().style.cursor = 'pointer'; });
      map.current!.on('mouseleave', 'venues-core', () => { map.current!.getCanvas().style.cursor = ''; });
      map.current!.on('mouseenter', 'venues-halo', () => { map.current!.getCanvas().style.cursor = 'pointer'; });
      map.current!.on('mouseleave', 'venues-halo', () => { map.current!.getCanvas().style.cursor = ''; });

      // Mark map ready and seed any venues that arrived before load fired
      mapReadyRef.current = true;
      const initialSrc = map.current!.getSource('venues-source') as mapboxgl.GeoJSONSource;
      initialSrc.setData({
        type: 'FeatureCollection',
        features: venuesRef.current
          .filter((v) => v.lat && v.lng)
          .map((v) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [v.lng!, v.lat!] },
            properties: { id: v.id, qs: v.queueStatus ?? '', type: v.type ?? '' },
          })),
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

  // Keep venuesRef in sync for click handler
  useEffect(() => { venuesRef.current = filteredVenues; }, [filteredVenues]);

  // Update WebGL venue source (only after map has loaded)
  useEffect(() => {
    if (!mapReadyRef.current) return;
    const src = map.current?.getSource('venues-source') as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: 'FeatureCollection',
      features: filteredVenues
        .filter((v) => v.lat && v.lng)
        .map((v) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [v.lng!, v.lat!] },
          properties: { id: v.id, qs: v.queueStatus ?? '', type: v.type ?? '' },
        })),
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
    logEvent('going_out_confirmed', { city: activeCity.id });
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

      {/* City search */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, showCityPicker && styles.searchBarFocused]}>
          <Text style={styles.searchPin}>📍</Text>
          <input
            style={searchInputStyle}
            placeholder={`${activeCity.name}`}
            value={cityQuery}
            onChange={(e) => { setCityQuery(e.target.value); setShowCityPicker(true); }}
            onFocus={() => setShowCityPicker(true)}
            onBlur={() => setTimeout(() => setShowCityPicker(false), 150)}
          />
          {cityQuery.length > 0 && (
            <TouchableOpacity onPress={() => setCityQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {showCityPicker && cityResults.length > 0 && (
          <View style={styles.dropdown}>
            {cityResults.map((city, i) => (
              <TouchableOpacity
                key={city.id}
                style={[styles.dropdownItem, i === cityResults.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => { flyToCity(city); setCityQuery(''); }}
              >
                <Text style={styles.dropdownIcon}>{city.id === activeCity.id ? '✓' : '📍'}</Text>
                <View style={styles.dropdownTextWrap}>
                  <Text style={[styles.dropdownText, city.id === activeCity.id && styles.dropdownTextActive]}>
                    {city.name}
                  </Text>
                  {i < 2 && cityQuery.length === 0 && (
                    <Text style={styles.dropdownHint}>Anbefalt</Text>
                  )}
                </View>
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

      {/* Queue legend */}
      <View style={styles.legend}>
        {[
          { color: '#39ff14', label: 'Lite kø' },
          { color: '#ffe600', label: 'Moderat' },
          { color: '#ff6b00', label: 'Lang kø' },
          { color: '#ff2244', label: 'Fullt' },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color, shadowColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

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
  searchWrapper: { position: 'absolute', top: 20, left: 16, width: 200, zIndex: 20 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: C.border, gap: 8,
  },
  searchBarFocused: { borderColor: C.borderBright },
  searchPin: { fontSize: 14 },
  searchClear: { color: C.faint, fontSize: 14, paddingLeft: 4 },
  dropdown: {
    backgroundColor: C.cardSolid, borderRadius: 16, marginTop: 6,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dropdownIcon: { fontSize: 13, width: 18, color: C.accent },
  dropdownTextWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { color: C.muted, fontSize: 15, fontWeight: '500' },
  dropdownTextActive: { color: C.text, fontWeight: '700' },
  dropdownHint: { fontSize: 11, color: C.faint, fontStyle: 'italic' },
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
  legend: {
    position: 'absolute', bottom: 24, left: 16,
    flexDirection: 'row', gap: 10,
    backgroundColor: C.card,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 8,
    zIndex: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: {
    width: 8, height: 8, borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 4,
  },
  legendLabel: { fontSize: 11, color: C.muted, fontWeight: '500' },
});
