import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
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

export interface VenueBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface Props {
  venue: VenueDoc | null;
  onClose: () => void;
}

const VenueBottomSheet = forwardRef<VenueBottomSheetRef, Props>(({ venue, onClose }, ref) => {
  const sheetRef = useRef<BottomSheet>(null);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.expand(),
    close: () => sheetRef.current?.close(),
  }));

  const handleChange = useCallback((index: number) => {
    if (index === -1) onClose();
  }, [onClose]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['52%', '88%']}
      enablePanDownToClose
      onChange={handleChange}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      {venue && (
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => sheetRef.current?.close()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
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
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  );
});

export default VenueBottomSheet;

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: C.card, borderRadius: 24 },
  handle: { backgroundColor: C.accent, width: 40, opacity: 0.7 },
  content: { paddingBottom: 48 },
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
  cover: { width: '100%', height: 200, backgroundColor: C.cardHigh },
  coverPlaceholder: { width: '100%', height: 160, backgroundColor: C.cardHigh },
  body: { padding: 20 },
  name: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 4 },
  address: { fontSize: 14, color: C.muted, marginBottom: 16 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: C.cardHigh,
    borderRadius: 12,
    padding: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontWeight: '700', flex: 1 },
  waitText: { fontSize: 13, color: C.muted },
  messageCard: {
    backgroundColor: C.cardHigh,
    borderRadius: RADIUS,
    padding: 14,
    borderWidth: 1,
    borderColor: C.accent + '44',
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  messageText: { fontSize: 15, color: C.text, lineHeight: 22 },
  description: { fontSize: 14, color: C.muted, lineHeight: 22, marginBottom: 20 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.faint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  hoursCard: {
    backgroundColor: C.cardHigh,
    borderRadius: RADIUS,
    padding: 14,
    gap: 8,
  },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hoursDay: { fontSize: 14, color: C.muted, width: 40 },
  hoursTime: { fontSize: 14, color: C.text },
});
