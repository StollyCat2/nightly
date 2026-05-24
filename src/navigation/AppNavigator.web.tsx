import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { C } from '../constants/theme';
import MapScreen from '../screens/MapScreen';
import ConcertsScreen from '../screens/ConcertsScreen';
import ProfileScreen from '../screens/ProfileScreen';

type Tab = 'map' | 'concerts' | 'profile';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'map', label: 'Utforsk', icon: '◎' },
  { id: 'concerts', label: 'Konserter', icon: '♪' },
  { id: 'profile', label: 'Profil', icon: '◉' },
];

export default function AppNavigator() {
  const [active, setActive] = useState<Tab>('map');

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {active === 'map' && <MapScreen />}
        {active === 'concerts' && <ConcertsScreen />}
        {active === 'profile' && <ProfileScreen />}
      </View>

      <View style={styles.tabBar}>
        <View style={styles.tabBarInner}>
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tab}
                onPress={() => setActive(tab.id)}
              >
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                  {tab.icon}
                </Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.tabDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1 },
  tabBar: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: C.cardSolid,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    position: 'relative',
  },
  tabIcon: { fontSize: 18, color: C.faint },
  tabIconActive: { color: C.accent },
  tabLabel: { fontSize: 10, color: C.faint, fontWeight: '600', letterSpacing: 0.5 },
  tabLabelActive: { color: C.accent },
  tabDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
});
