import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  OAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { C, RADIUS } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [, , promptGoogle] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await promptGoogle();
      if (result?.type === 'success') {
        const idToken = result.params?.id_token ?? result.authentication?.idToken;
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
        }
      }
    } catch {
      setError('Google-innlogging feilet. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setLoading(true);
    setError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const provider = new OAuthProvider('apple.com');
        const firebaseCredential = provider.credential({
          idToken: credential.identityToken,
          rawNonce: undefined,
        });
        await signInWithCredential(auth, firebaseCredential);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('canceled')) {
        // user cancelled
      } else {
        setError('Apple-innlogging feilet. Prøv igjen.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glow} />

      <Text style={styles.logo}>nightly</Text>
      <Text style={styles.tagline}>Finn pulsen i din by</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.buttons}>
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={RADIUS}
              style={styles.appleBtn}
              onPress={handleApple}
            />
          )}
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle}>
            <Text style={styles.googleBtnText}>Fortsett med Google</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.fine}>
        Ved å logge inn godtar du at Nightly bruker din posisjon for å vise byens puls.
      </Text>
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
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: C.accent,
    opacity: 0.12,
    top: '20%',
    alignSelf: 'center',
  },
  logo: {
    fontSize: 52,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 6,
    marginBottom: 8,
    textShadowColor: C.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    fontSize: 16,
    color: C.muted,
    letterSpacing: 1,
    marginBottom: 60,
  },
  buttons: { width: '100%', gap: 14 },
  appleBtn: { width: '100%', height: 54 },
  googleBtn: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  googleBtnText: { color: C.text, fontSize: 16, fontWeight: '600' },
  error: { color: C.statusRed, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  fine: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: C.faint,
    textAlign: 'center',
    lineHeight: 16,
  },
});
