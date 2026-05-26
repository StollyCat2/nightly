import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './src/hooks/useAuth';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { C } from './src/constants/theme';
import { checkWeekendNotification } from './src/utils/notifications';

async function requestLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(false); return; }
    navigator.geolocation.getCurrentPosition(() => resolve(true), () => resolve(false));
  });
}

function Root() {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // Check onboarding flag tied to this specific user's UID
  useEffect(() => {
    if (!user) { setOnboarded(null); return; }
    const key = `onboarded_${user.uid}`;
    AsyncStorage.getItem(key).then((val) => setOnboarded(val === '1'));
    AsyncStorage.getItem('notifications_enabled').then((enabled) => {
      if (enabled !== '1') return;
      AsyncStorage.getItem('my_city').then((city) => {
        checkWeekendNotification(city ?? 'Bergen');
      });
    });
  }, [user?.uid]);

  if (loading) return <View style={styles.splash} />;
  if (!user) return <AuthScreen />;
  if (onboarded === null) return <View style={styles.splash} />;

  if (!onboarded) {
    return (
      <OnboardingScreen
        onDone={async () => {
          await AsyncStorage.setItem(`onboarded_${user.uid}`, '1');
          setOnboarded(true);
        }}
        requestPermission={requestLocationPermission}
      />
    );
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: C.bg },
});
