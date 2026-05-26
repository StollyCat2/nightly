import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VenueType } from '../types';
import { C, RADIUS } from '../constants/theme';

export const VENUE_COLORS: Record<VenueType, string> = {
  bar:        '#ffc300',
  nattklubb:  '#c77dff',
};

type Filter = VenueType | 'alle';

interface Props {
  active: Filter;
  onChange: (f: Filter) => void;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'alle',       label: 'Alle' },
  { id: 'bar',        label: '🍺 Bar' },
  { id: 'nattklubb',  label: '✦ Nattklubb' },
];

export default function VenueTypeFilter({ active, onChange }: Props) {
  return (
    <View style={styles.row}>
      {FILTERS.map((f) => {
        const isActive = active === f.id;
        const color = f.id !== 'alle' ? VENUE_COLORS[f.id as VenueType] : C.accent;
        return (
          <TouchableOpacity
            key={f.id}
            style={[styles.pill, isActive && { backgroundColor: color + '22', borderColor: color }]}
            onPress={() => onChange(f.id)}
          >
            <Text style={[styles.label, isActive && { color }]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(120,60,200,0.25)',
    backgroundColor: 'rgba(15,0,26,0.85)',
  },
  label: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '700',
  },
});
