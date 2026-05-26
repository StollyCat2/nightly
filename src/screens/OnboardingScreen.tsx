import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { C, RADIUS } from '../constants/theme';

const { width: W } = Dimensions.get('window');

interface Props {
  onDone: () => void;
  requestPermission: () => Promise<boolean>;
}

const SLIDES = [
  {
    icon: '🌃',
    title: 'Velkommen til Nightly',
    body: 'Oppdag hva som skjer i din by i kveld — i sanntid.',
    features: null,
  },
  {
    icon: '◎',
    title: 'Alt du trenger, ett sted',
    body: null,
    features: [
      { icon: '◎', label: 'Kart i sanntid', desc: 'Se byens puls og aktive utesteder' },
      { icon: '♪', label: 'Eventer',         desc: 'Konserter og festivaler nær deg' },
      { icon: '✦', label: 'Kø og status',    desc: 'Sjekk ventetid før du drar ut' },
    ],
  },
  {
    icon: '📍',
    title: 'Del posisjonen din',
    body: 'Nightly bruker posisjonen din til å vise byens puls. Vi lagrer aldri nøyaktig posisjon permanent.',
    features: [
      { icon: '✦', label: 'Kun aktiv mens appen er åpen',         desc: '' },
      { icon: '✦', label: 'Forsvinner automatisk etter 10 min',   desc: '' },
      { icon: '✦', label: 'Vises kun som et anonymt punkt',        desc: '' },
    ],
  },
];

export default function OnboardingScreen({ onDone, requestPermission }: Props) {
  const [step, setStep] = useState(0);
  const [locLoading, setLocLoading] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const goTo = (next: number) => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateX,  { toValue: -24, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      translateX.setValue(24);
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (step < SLIDES.length - 1) { goTo(step + 1); return; }
  };

  const handleAllow = async () => {
    setLocLoading(true);
    await requestPermission();
    setLocLoading(false);
    onDone();
  };

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  return (
    <View style={styles.container}>
      {/* Background glow */}
      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />

      {/* Progress dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity, transform: [{ translateX }] }]}>
        <Text style={styles.icon}>{slide.icon}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        {slide.body ? (
          <Text style={styles.body}>{slide.body}</Text>
        ) : null}
        {slide.features ? (
          <View style={styles.features}>
            {slide.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  {f.desc ? <Text style={styles.featureDesc}>{f.desc}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        {isLast ? (
          locLoading ? (
            <ActivityIndicator color={C.accent} size="large" />
          ) : (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAllow} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Tillat posisjon</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={onDone}>
                <Text style={styles.skipBtnText}>Ikke nå</Text>
              </TouchableOpacity>
            </>
          )
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>
              {step === 0 ? 'Kom i gang' : 'Neste'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 52,
  },
  glowOuter: {
    position: 'absolute',
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: C.accent, opacity: 0.06,
    top: '8%', alignSelf: 'center',
  },
  glowInner: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: C.accent, opacity: 0.1,
    top: '14%', alignSelf: 'center',
  },

  dots: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.border,
  },
  dotActive: {
    width: 22, backgroundColor: C.accent,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 16,
  },
  icon: { fontSize: 60, marginBottom: 28 },
  title: {
    fontSize: 26, fontWeight: '800', color: C.text,
    textAlign: 'center', marginBottom: 14, letterSpacing: 0.3,
    lineHeight: 34,
  },
  body: {
    fontSize: 16, color: C.muted,
    textAlign: 'center', lineHeight: 25,
  },

  features: { alignSelf: 'stretch', gap: 14, marginTop: 8 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: 'rgba(120,60,200,0.08)',
    borderRadius: RADIUS, padding: 14,
    borderWidth: 1, borderColor: 'rgba(120,60,200,0.15)',
  },
  featureIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.accent + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  featureIcon: { fontSize: 16, color: C.accent },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  featureDesc: { fontSize: 12, color: C.muted, marginTop: 2 },

  actions: {
    alignSelf: 'stretch',
    gap: 0,
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: RADIUS,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: { color: '#000', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  skipBtn: { marginTop: 16, paddingVertical: 10, alignItems: 'center' },
  skipBtnText: { color: C.faint, fontSize: 14 },
});
