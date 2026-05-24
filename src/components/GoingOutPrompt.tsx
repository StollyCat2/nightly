import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { C, RADIUS, RADIUS_LG } from '../constants/theme';

interface Props {
  visible: boolean;
  onGoingOut: () => void;
  onExplore: () => void;
}

export default function GoingOutPrompt({ visible, onGoingOut, onExplore }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.timing(fadeIn, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeIn }]}>
        <View style={styles.card}>

          {/* Atmospheric glow blobs */}
          <View style={[styles.glowBlob, styles.glowTop]} />
          <View style={[styles.glowBlob, styles.glowBottom]} />

          {/* Pulsing icon */}
          <View style={styles.iconWrap}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse }] }]} />
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>✦</Text>
            </View>
          </View>

          <Text style={styles.title}>Ut i kveld?</Text>
          <Text style={styles.subtitle}>
            Se byens puls i sanntid og finn ut hvor Bergen koker i natt.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={onGoingOut} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Ja, jeg skal ut!</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onExplore} activeOpacity={0.6}>
            <Text style={styles.secondaryBtnText}>Bare utforsk</Text>
          </TouchableOpacity>

        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,0,8,0.92)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: '#0d001a',
    borderRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.2)',
    overflow: 'hidden',
  },
  glowBlob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: C.accent,
  },
  glowTop: { opacity: 0.07, top: -120, left: -60 },
  glowBottom: { opacity: 0.05, bottom: -120, right: -60 },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: 72,
    height: 72,
  },
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: C.accent,
    opacity: 0.35,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(199,125,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    color: C.accent,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: RADIUS,
    paddingVertical: 17,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: C.faint,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
