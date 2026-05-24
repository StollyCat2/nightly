import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { VenueDoc, QueueStatus, DayHours } from '../types';
import { C, RADIUS } from '../constants/theme';

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

const DAY_LABELS: Record<string, string> = {
  mon: 'Man', tue: 'Tir', wed: 'Ons', thu: 'Tor', fri: 'Fre', sat: 'Lør', sun: 'Søn',
};
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const SHEET_HEIGHT = Dimensions.get('window').height * 0.6;

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
  const visible = useRef(false);

  const open = useCallback(() => {
    visible.current = true;
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      visible.current = false;
      onClose();
    });
  }, [onClose]);

  useImperativeHandle(ref, () => ({ open, close }));

  if (!venue) return null;

  return (
    <>
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        <TouchableOpacity style={styles.closeBtn} onPress={close}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {venue.images?.[0] ? (
            <Image source={{ uri: venue.images[0] }} style={styles.cover} />
          ) : (
            <View style={styles.coverPlaceholder} />
          )}

          <View style={styles.body}>
            <Text style={styles.name}>{venue.name}</Text>
            <Text style={styles.address}>{venue.address}</Text>

            {venue.queueStatus && (
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[venue.queueStatus] }]} />
                <Text style={[styles.statusText, { color: STATUS_COLORS[venue.queueStatus] }]}>
                  {STATUS_LABELS[venue.queueStatus]}
                </Text>
                {venue.queueEstimate && (
                  <Text style={styles.waitText}>~{venue.queueEstimate} min</Text>
                )}
              </View>
            )}

            {venue.eveningMessage ? (
              <View style={styles.messageCard}>
                <Text style={styles.messageLabel}>I kveld</Text>
                <Text style={styles.messageText}>{venue.eveningMessage}</Text>
              </View>
            ) : null}

            {venue.description ? (
              <Text style={styles.description}>{venue.description}</Text>
            ) : null}

            {venue.openingHours && (
              <>
                <Text style={styles.sectionLabel}>Åpningstider</Text>
                <View style={styles.hoursCard}>
                  {DAY_ORDER.map((day) => {
                    const h = venue.openingHours![day as keyof typeof venue.openingHours] as DayHours;
                    return (
                      <View key={day} style={styles.hoursRow}>
                        <Text style={styles.hoursDay}>{DAY_LABELS[day]}</Text>
                        <Text style={styles.hoursTime}>
                          {h.closed ? 'Stengt' : `${h.open} – ${h.close}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
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
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    zIndex: 21,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
    opacity: 0.7,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: C.muted, fontSize: 16, fontWeight: '600' },
  content: { paddingBottom: 48 },
  cover: { width: '100%', height: 180, backgroundColor: C.cardHigh },
  coverPlaceholder: { width: '100%', height: 120, backgroundColor: C.cardHigh },
  body: { padding: 20 },
  name: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 4 },
  address: { fontSize: 14, color: C.muted, marginBottom: 16 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, backgroundColor: C.cardHigh,
    borderRadius: 12, padding: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontWeight: '700', flex: 1 },
  waitText: { fontSize: 13, color: C.muted },
  messageCard: {
    backgroundColor: C.cardHigh, borderRadius: RADIUS, padding: 14,
    borderWidth: 1, borderColor: C.accent + '44', marginBottom: 16,
  },
  messageLabel: {
    fontSize: 10, fontWeight: '700', color: C.accent,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
  },
  messageText: { fontSize: 15, color: C.text, lineHeight: 22 },
  description: { fontSize: 14, color: C.muted, lineHeight: 22, marginBottom: 20 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: C.faint,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
  },
  hoursCard: { backgroundColor: C.cardHigh, borderRadius: RADIUS, padding: 14, gap: 8 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hoursDay: { fontSize: 14, color: C.muted, width: 40 },
  hoursTime: { fontSize: 14, color: C.text },
});
