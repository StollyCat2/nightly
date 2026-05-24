import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, RADIUS } from '../constants/theme';

interface Props {
  count: number;
  city: string;
}

const MIN_COUNT = 40;

export default function GoingOutCounter({ count, city }: Props) {
  if (count < MIN_COUNT) return null;

  return (
    <View style={styles.badge}>
      <View style={styles.dot} />
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>skal ut i {city} i kveld</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: C.card,
    borderRadius: RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.accent + '66',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accentBright,
  },
  count: { fontSize: 15, fontWeight: '800', color: C.accent },
  label: { fontSize: 11, color: C.muted, flexShrink: 1 },
});
