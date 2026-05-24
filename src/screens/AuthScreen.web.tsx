import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { C, RADIUS } from '../constants/theme';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handle = async () => {
    if (!email || !password) { setError('Fyll inn e-post og passord.'); return; }
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (e: any) {
      const code = e.code ?? '';
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        setError('Feil e-post eller passord.');
      } else if (code.includes('email-already-in-use')) {
        setError('E-posten er allerede i bruk.');
      } else if (code.includes('weak-password')) {
        setError('Passordet må være minst 6 tegn.');
      } else {
        setError('Noe gikk galt. Prøv igjen.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background glows */}
      <View style={[styles.glow, styles.glow1]} />
      <View style={[styles.glow, styles.glow2]} />

      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logo}>nightly</Text>
          <Text style={styles.tagline}>Finn pulsen i din by</Text>
        </View>

        {/* Fields */}
        <View style={styles.fields}>
          <input
            style={{ ...inputBase, ...(email ? inputFilled : {}) }}
            type="email"
            placeholder="E-postadresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handle()}
          />
          <input
            style={{ ...inputBase, ...(password ? inputFilled : {}) }}
            type="password"
            placeholder="Passord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handle()}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handle}>
            <Text style={styles.primaryBtnText}>
              {mode === 'login' ? 'Logg inn' : 'Opprett konto'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
        >
          <Text style={styles.switchBtnText}>
            {mode === 'login' ? 'Ny bruker? Opprett konto' : 'Har du konto? Logg inn'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.fine}>
        Ved å logge inn godtar du at Nightly bruker din posisjon til å vise byens puls.
      </Text>
    </View>
  );
}

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'rgba(5,0,8,0.8)',
  border: '1px solid rgba(120,60,200,0.25)',
  borderRadius: 14,
  padding: '15px 18px',
  color: '#ffffff',
  fontSize: 16,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const inputFilled: React.CSSProperties = {
  borderColor: 'rgba(199,125,255,0.4)',
};

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20,
  },
  glow: {
    position: 'absolute', borderRadius: 999,
  },
  glow1: {
    width: 400, height: 400,
    backgroundColor: C.accent, opacity: 0.07,
    top: -100, left: -100,
  },
  glow2: {
    width: 300, height: 300,
    backgroundColor: C.accentBright, opacity: 0.05,
    bottom: 50, right: -80,
  },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: C.card,
    borderRadius: 28, borderWidth: 1,
    borderColor: C.border, padding: 32,
  },
  logoArea: { alignItems: 'center', marginBottom: 36 },
  logo: {
    fontSize: 44, fontWeight: '800', color: C.text,
    letterSpacing: 8,
    textShadowColor: C.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  tagline: { fontSize: 13, color: C.muted, letterSpacing: 2, marginTop: 6 },
  fields: { gap: 10, marginBottom: 8 },
  error: {
    color: '#ff4466', fontSize: 13, textAlign: 'center',
    marginTop: 8, marginBottom: 4,
  },
  primaryBtn: {
    backgroundColor: C.accent, borderRadius: RADIUS,
    paddingVertical: 16, alignItems: 'center', marginTop: 16,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20,
  },
  primaryBtnText: { color: '#050008', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  switchBtn: { paddingVertical: 16, alignItems: 'center' },
  switchBtnText: { color: C.muted, fontSize: 13 },
  fine: {
    position: 'absolute', bottom: 24,
    fontSize: 11, color: C.faint,
    textAlign: 'center', paddingHorizontal: 40, lineHeight: 16,
  },
});
