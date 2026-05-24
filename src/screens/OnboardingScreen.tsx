import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, RADIUS } from '../constants/theme';

interface Props {
  onDone: () => void;
  requestPermission: () => Promise<boolean>;
}

export default function OnboardingScreen({ onDone, requestPermission }: Props) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'intro' | 'location'>('intro');

  const handleAllowLocation = async () => {
    setLoading(true);
    await requestPermission();
    await AsyncStorage.setItem('onboarded', '1');
    setLoading(false);
    onDone();
  };

  const handleSkipLocation = async () => {
    await AsyncStorage.setItem('onboarded', '1');
    onDone();
  };

  if (step === 'intro') {
    return (
      <View style={styles.container}>
        <View style={styles.glow} />
        <Text style={styles.emoji}>🌃</Text>
        <Text style={styles.title}>Velkommen til Nightly</Text>
        <Text style={styles.body}>
          Se byens puls i sanntid. Finn ut hvilke utesteder som er hete, hva som skjer i kveld og
          hvor folkemengden samler seg.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('location')}>
          <Text style={styles.primaryBtnText}>Kom i gang</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <Text style={styles.emoji}>📍</Text>
      <Text style={styles.title}>Del posisjonen din</Text>
      <Text style={styles.body}>
        Nightly bruker posisjonen din til å vise byens puls — fargelagene på kartet som viser
        hvor folk er akkurat nå. Vi lagrer aldri nøyaktig posisjon permanent.
      </Text>
      <View style={styles.bullets}>
        <Text style={styles.bullet}>✦ Kun aktiv mens appen er åpen</Text>
        <Text style={styles.bullet}>✦ Forsvinner etter 10 minutter</Text>
        <Text style={styles.bullet}>✦ Vises kun som et anonymt punkt i sonen</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 32 }} />
      ) : (
        <>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAllowLocation}>
            <Text style={styles.primaryBtnText}>Tillat posisjon</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkipLocation}>
            <Text style={styles.skipBtnText}>Ikke nå</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: C.accent,
    opacity: 0.1,
    top: '15%',
  },
  emoji: { fontSize: 56, marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 16,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  bullets: { alignSelf: 'stretch', gap: 10, marginBottom: 36 },
  bullet: { fontSize: 14, color: C.accent, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: RADIUS,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: { color: '#000', fontSize: 17, fontWeight: '800' },
  skipBtn: { marginTop: 16, paddingVertical: 12 },
  skipBtnText: { color: C.faint, fontSize: 14 },
});
