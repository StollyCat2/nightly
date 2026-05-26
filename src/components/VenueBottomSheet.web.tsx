import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { VenueDoc, QueueStatus, DayHours } from '../types';
import { C, RADIUS } from '../constants/theme';
import { logEvent } from '../firebase/config';

const STATUS_LABELS: Record<QueueStatus, string> = {
  lite: 'Lite kø',
  moderat: 'Moderat kø',
  lang: 'Lang kø',
  fullt: 'Fullt',
};

const STATUS_COLORS: Record<QueueStatus, string> = {
  lite: C.statusGreen,
  moderat: C.statusYellow,
  lang: C.statusOrange,
  fullt: C.statusRed,
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Mandag', tue: 'Tirsdag', wed: 'Onsdag',
  thu: 'Torsdag', fri: 'Fredag', sat: 'Lørdag', sun: 'Søndag',
};

const SHEET_HEIGHT = Dimensions.get('window').height * 0.65;

const GRAD_PAIRS = [
  ['#3a0060', '#c77dff'], ['#001a3a', '#00d4ff'], ['#002a10', '#39ff14'],
  ['#3a1a00', '#ff8c42'], ['#1a002a', '#e040fb'], ['#2a0020', '#ff4d6d'],
];

function venueGradient(name: string): [string, string] {
  const idx = (name.charCodeAt(0) ?? 0) % GRAD_PAIRS.length;
  return GRAD_PAIRS[idx] as [string, string];
}

function todayKey(): typeof DAY_KEYS[number] {
  return DAY_KEYS[new Date().getDay()];
}

export interface VenueBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface Props {
  venue: VenueDoc | null;
  onClose: () => void;
}

const VenueBottomSheet = forwardRef<VenueBottomSheetRef, Props>(({ venue, onClose }, ref) => {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const open = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  useImperativeHandle(ref, () => ({ open, close }));

  if (!venue) return null;

  const today = todayKey();
  const todayHours = venue.openingHours?.[today] as DayHours | undefined;
  const [gradFrom, gradTo] = venueGradient(venue.name);

  const openDirections = () => {
    const url = venue.lat && venue.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`;
    window.open(url, '_blank');
    logEvent('directions_open', { venue_id: venue.id, venue_name: venue.name });
  };

  return (
    <>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="box-none">
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        <TouchableOpacity style={styles.closeBtn} onPress={close}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Cover — photo or gradient placeholder */}
          {venue.images?.[0] ? (
            <img
              src={venue.images[0]}
              style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
              alt={venue.name}
            />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: gradFrom }]}>
              <View style={[styles.coverGlow, { backgroundColor: gradTo }]} />
              <Text style={styles.coverInitial}>{venue.name.charAt(0).toUpperCase()}</Text>
              <Text style={styles.coverName}>{venue.name}</Text>
            </View>
          )}

          <View style={styles.body}>
            <Text style={styles.name}>{venue.name}</Text>

            {/* Today's hours at a glance */}
            {todayHours && (
              <Text style={styles.todayHours}>
                {todayHours.closed
                  ? 'Stengt i dag'
                  : `I dag: ${todayHours.open} – ${todayHours.close}`}
              </Text>
            )}

            {/* Address + directions */}
            <View style={styles.addressRow}>
              <Text style={styles.address} numberOfLines={2}>{venue.address}</Text>
              <TouchableOpacity style={styles.directionsBtn} onPress={openDirections} activeOpacity={0.8}>
                <Text style={styles.directionsBtnText}>↗ Veibeskrivelse</Text>
              </TouchableOpacity>
            </View>

            {/* Queue status */}
            {venue.queueStatus ? (
              <View style={[styles.statusRow, { borderColor: STATUS_COLORS[venue.queueStatus] + '44' }]}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[venue.queueStatus], shadowColor: STATUS_COLORS[venue.queueStatus] }]} />
                <Text style={[styles.statusText, { color: STATUS_COLORS[venue.queueStatus] }]}>
                  {STATUS_LABELS[venue.queueStatus]}
                </Text>
                {venue.queueEstimate ? (
                  <Text style={styles.waitText}>~{venue.queueEstimate} min ventetid</Text>
                ) : null}
              </View>
            ) : null}

            {/* Evening message */}
            {venue.eveningMessage ? (
              <View style={styles.messageCard}>
                <Text style={styles.messageLabel}>I kveld</Text>
                <Text style={styles.messageText}>{venue.eveningMessage}</Text>
              </View>
            ) : null}

            {/* Description */}
            {venue.description ? (
              <Text style={styles.description}>{venue.description}</Text>
            ) : null}

            {/* Full opening hours */}
            {venue.openingHours ? (
              <>
                <Text style={styles.sectionLabel}>Åpningstider</Text>
                <View style={styles.hoursCard}>
                  {DAY_ORDER.map((day, i) => {
                    const h = venue.openingHours![day] as DayHours;
                    const isToday = day === today;
                    return (
                      <View
                        key={day}
                        style={[
                          styles.hoursRow,
                          isToday && styles.hoursRowToday,
                          i === DAY_ORDER.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>
                          {DAY_LABELS[day]}
                        </Text>
                        <Text style={[styles.hoursTime, isToday && styles.hoursTimeToday]}>
                          {h.closed ? 'Stengt' : `${h.open} – ${h.close}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
});

export default VenueBottomSheet;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,0,8,0.7)',
    zIndex: 20,
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#0a0014',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    zIndex: 21,
    overflow: 'hidden',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.accent, opacity: 0.5,
    alignSelf: 'center',
    position: 'absolute', top: 12, zIndex: 2,
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 14, zIndex: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: C.muted, fontSize: 14, fontWeight: '600' },
  content: { paddingBottom: 48 },

  coverPlaceholder: {
    width: '100%', height: 140,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  coverGlow: {
    position: 'absolute', width: 220, height: 220,
    borderRadius: 110, opacity: 0.22, top: -80, right: -50,
  },
  coverInitial: {
    fontSize: 64, fontWeight: '900', color: 'rgba(255,255,255,0.1)',
    position: 'absolute', bottom: 4, left: 16,
  },
  coverName: {
    fontSize: 20, fontWeight: '800', color: 'rgba(255,255,255,0.88)',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    paddingHorizontal: 20,
    textAlign: 'center',
  },

  body: { paddingHorizontal: 20, paddingTop: 18 },
  name: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 3 },
  todayHours: { fontSize: 12, color: C.accent, fontWeight: '600', marginBottom: 12 },

  addressRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 16,
  },
  address: { fontSize: 13, color: C.muted, flex: 1, lineHeight: 19 },
  directionsBtn: {
    backgroundColor: C.accent + '18',
    borderRadius: 10, borderWidth: 1, borderColor: C.accent + '44',
    paddingHorizontal: 12, paddingVertical: 7, flexShrink: 0,
  },
  directionsBtnText: { fontSize: 12, color: C.accent, fontWeight: '700' },

  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 14, backgroundColor: C.cardHigh,
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  statusDot: {
    width: 10, height: 10, borderRadius: 5,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6,
  },
  statusText: { fontSize: 14, fontWeight: '700', flex: 1 },
  waitText: { fontSize: 12, color: C.muted },

  messageCard: {
    backgroundColor: C.cardHigh, borderRadius: RADIUS, padding: 14,
    borderWidth: 1, borderColor: C.accent + '44', marginBottom: 16,
  },
  messageLabel: {
    fontSize: 10, fontWeight: '700', color: C.accent,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
  },
  messageText: { fontSize: 14, color: C.text, lineHeight: 21 },
  description: { fontSize: 13, color: C.muted, lineHeight: 21, marginBottom: 20 },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: C.faint,
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 8,
  },
  hoursCard: {
    backgroundColor: C.cardHigh, borderRadius: RADIUS,
    overflow: 'hidden', marginBottom: 8,
  },
  hoursRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(120,60,200,0.1)',
  },
  hoursRowToday: { backgroundColor: C.accent + '12' },
  hoursDay: { fontSize: 13, color: C.muted, width: 90 },
  hoursDayToday: { color: C.accent, fontWeight: '700' },
  hoursTime: { fontSize: 13, color: C.text },
  hoursTimeToday: { color: C.accent, fontWeight: '700' },
});
