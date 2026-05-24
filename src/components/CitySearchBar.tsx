import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { CITIES, City } from '../constants/cities';
import { C, RADIUS } from '../constants/theme';

interface Props {
  currentCity: City;
  onSelectCity: (city: City) => void;
}

export default function CitySearchBar({ currentCity, onSelectCity }: Props) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const results = query.length > 0
    ? CITIES.filter((c) => c.name.toLowerCase().startsWith(query.toLowerCase()))
    : [];

  const select = (city: City) => {
    onSelectCity(city);
    setQuery('');
    setFocused(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.bar, focused && styles.barFocused]}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder={currentCity.name}
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {focused && results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((city) => (
            <TouchableOpacity key={city.id} style={styles.dropdownItem} onPress={() => select(city)}>
              <Text style={styles.dropdownIcon}>📍</Text>
              <Text style={styles.dropdownText}>{city.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', top: 56, left: 16, right: 16, zIndex: 10 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  barFocused: { borderColor: C.accent + '88' },
  icon: { fontSize: 14 },
  input: { flex: 1, color: C.text, fontSize: 16 },
  clear: { color: C.faint, fontSize: 16, paddingLeft: 4 },
  dropdown: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownIcon: { fontSize: 14 },
  dropdownText: { color: C.text, fontSize: 16 },
});
