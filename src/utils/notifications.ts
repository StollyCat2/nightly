import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  return false;
}

export function checkWeekendNotification(city: string) {
  if (Platform.OS !== 'web') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  if ((day === 5 || day === 6) && hour >= 16) {
    const key = `weekend_notif_${now.toDateString()}`;
    AsyncStorage.getItem(key).then((shown) => {
      if (shown) return;
      AsyncStorage.setItem(key, '1');
      new Notification('Nightly', {
        body: `Sjekk pulsen i ${city} i dag`,
        icon: '/favicon.ico',
      });
    });
  }
}
