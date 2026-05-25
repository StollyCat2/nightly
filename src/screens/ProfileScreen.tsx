import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Modal, Linking, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { C, RADIUS, RADIUS_LG } from '../constants/theme';
import { CITIES } from '../constants/cities';
import { requestNotificationPermission } from '../utils/notifications';

type Sheet = 'varsler' | 'posisjon' | 'by' | 'personvern' | 'om' | null;

const ICON_COLORS = {
  bell:    { bg: '#2a1a4a', color: '#c77dff' },
  pin:     { bg: '#0d2a1a', color: '#39ff14' },
  city:    { bg: '#1a1a2a', color: '#7eb8ff' },
  privacy: { bg: '#2a1a1a', color: '#ff8c42' },
  info:    { bg: '#1a2a2a', color: '#00d4ff' },
};

function IconBox({ icon, scheme }: { icon: string; scheme: keyof typeof ICON_COLORS }) {
  const s = ICON_COLORS[scheme];
  return (
    <View style={[styles.iconBox, { backgroundColor: s.bg }]}>
      <Text style={[styles.iconBoxText, { color: s.color }]}>{icon}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const user = auth.currentUser;
  const [loggingOut, setLoggingOut] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [locationOn, setLocationOn] = useState(false);
  const [myCity, setMyCity] = useState('Oslo');

  useEffect(() => {
    AsyncStorage.getItem('notifications_enabled').then((v) => setNotificationsOn(v === '1'));
    AsyncStorage.getItem('location_enabled').then((v) => setLocationOn(v === '1'));
    AsyncStorage.getItem('my_city').then((v) => { if (v) setMyCity(v); });
  }, []);

  const toggleNotifications = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    setNotificationsOn(val);
    AsyncStorage.setItem('notifications_enabled', val ? '1' : '0');
  };

  const toggleLocation = (val: boolean) => {
    setLocationOn(val);
    AsyncStorage.setItem('location_enabled', val ? '1' : '0');
    if (val && Platform.OS === 'web') {
      navigator.geolocation?.getCurrentPosition(() => {}, () => {});
    }
  };

  const selectCity = (city: string) => {
    setMyCity(city);
    AsyncStorage.setItem('my_city', city);
    setSheet(null);
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut(auth);
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '?';
  const emailShort = user?.email ?? '';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Hero / Avatar */}
        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.email}>{emailShort}</Text>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Nightly</Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📍</Text>
            <Text style={styles.statValue}>{myCity}</Text>
            <Text style={styles.statLabel}>Din by</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMid]}>
            <Text style={styles.statIcon}>◎</Text>
            <Text style={styles.statValue}>Utforsker</Text>
            <Text style={styles.statLabel}>Nivå</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✦</Text>
            <Text style={styles.statValue}>v1.0</Text>
            <Text style={styles.statLabel}>Versjon</Text>
          </View>
        </View>

        {/* Innstillinger */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Innstillinger</Text>
          <View style={styles.menuCard}>

            <View style={styles.menuItem}>
              <IconBox icon="🔔" scheme="bell" />
              <Text style={styles.menuText}>Varsler</Text>
              <Switch
                value={notificationsOn}
                onValueChange={toggleNotifications}
                trackColor={{ false: C.border, true: '#c77dff55' }}
                thumbColor={notificationsOn ? C.accent : '#4a3a6b'}
              />
            </View>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setSheet('posisjon')}>
              <IconBox icon="◉" scheme="pin" />
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuText}>Posisjon</Text>
                <Text style={styles.menuSub}>{locationOn ? 'Aktivert' : 'Ikke aktivert'}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setSheet('by')}>
              <IconBox icon="◈" scheme="city" />
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuText}>Min by</Text>
                <Text style={styles.menuSub}>{myCity}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Om */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Om</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setSheet('personvern')}>
              <IconBox icon="◻" scheme="privacy" />
              <Text style={styles.menuText}>Personvern</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => setSheet('om')}>
              <IconBox icon="✦" scheme="info" />
              <Text style={styles.menuText}>Om Nightly</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={loggingOut}>
          <Text style={styles.signOutText}>{loggingOut ? 'Logger ut...' : 'Logg ut'}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modals */}
      <InfoModal visible={sheet === 'posisjon'} onClose={() => setSheet(null)} title="Posisjon">
        <Text style={styles.sheetBody}>
          Nightly bruker posisjonen din til å vise byens puls — de fargede områdene på kartet som viser
          hvor folk befinner seg akkurat nå.
        </Text>
        <View style={styles.sheetBullets}>
          <Text style={styles.bullet}>✦ Posisjonen din er anonym</Text>
          <Text style={styles.bullet}>✦ Vises kun som et punkt i sonen</Text>
          <Text style={styles.bullet}>✦ Slettes automatisk etter 10 minutter</Text>
          <Text style={styles.bullet}>✦ Aldri delt med tredjeparter</Text>
        </View>
        <View style={styles.sheetRow}>
          <Text style={styles.sheetLabel}>Posisjonsdeling</Text>
          <Switch
            value={locationOn}
            onValueChange={(val) => { toggleLocation(val); }}
            trackColor={{ false: C.border, true: '#c77dff55' }}
            thumbColor={locationOn ? C.accent : '#4a3a6b'}
          />
        </View>
        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.sheetLink} onPress={() => Linking.openSettings()}>
            <Text style={styles.sheetLinkText}>Åpne systeminnstillinger →</Text>
          </TouchableOpacity>
        )}
      </InfoModal>

      <InfoModal visible={sheet === 'by'} onClose={() => setSheet(null)} title="Min by">
        <Text style={styles.sheetBody}>Velg din hjemby. Dette påvirker hvilken by som vises som standard på kartet.</Text>
        <View style={styles.cityList}>
          {CITIES.map((city) => (
            <TouchableOpacity
              key={city.id}
              style={[styles.cityRow, myCity === city.name && styles.cityRowActive]}
              onPress={() => selectCity(city.name)}
            >
              <Text style={[styles.cityRowText, myCity === city.name && styles.cityRowTextActive]}>
                {city.name}
              </Text>
              {myCity === city.name && <Text style={styles.cityCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </InfoModal>

      <InfoModal visible={sheet === 'personvern'} onClose={() => setSheet(null)} title="Personvern">
        <Text style={styles.sheetHeading}>Hvilke data samler vi inn?</Text>
        <Text style={styles.sheetBody}>
          Nightly samler kun inn anonymisert posisjonsdata når du aktivt bruker appen og har gitt tillatelse.
          Dataen brukes utelukkende til å vise byens puls på kartet.
        </Text>
        <Text style={styles.sheetHeading}>Lagring</Text>
        <Text style={styles.sheetBody}>
          Din eksakte posisjon lagres aldri permanent. Posisjonspunkter slettes automatisk etter 10 minutter.
        </Text>
        <Text style={styles.sheetHeading}>Sletting av konto</Text>
        <Text style={styles.sheetBody}>
          Ta kontakt på{' '}
          <Text style={styles.sheetLinkInline} onPress={() => Linking.openURL('mailto:hei@nightly.no')}>
            hei@nightly.no
          </Text>
        </Text>
      </InfoModal>

      <InfoModal visible={sheet === 'om'} onClose={() => setSheet(null)} title="Om Nightly">
        <View style={styles.omLogo}>
          <Text style={styles.omLogoText}>nightly</Text>
          <Text style={styles.omVersion}>Versjon 1.0.0</Text>
        </View>
        <Text style={styles.sheetBody}>
          Appen som viser byens puls i sanntid. Se hvilke utesteder som er hete,
          hva som skjer i kveld og hvor folkemengden samler seg.
        </Text>
        <View style={styles.sheetBullets}>
          <Text style={styles.bullet}>✦ Live kø-status fra utesteder</Text>
          <Text style={styles.bullet}>✦ Konserter og arrangementer</Text>
          <Text style={styles.bullet}>✦ Byens puls i sanntid</Text>
        </View>
        <TouchableOpacity style={styles.sheetLink} onPress={() => Linking.openURL('mailto:hei@nightly.no')}>
          <Text style={styles.sheetLinkText}>hei@nightly.no →</Text>
        </TouchableOpacity>
      </InfoModal>
    </>
  );
}

function InfoModal({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 60 },

  // Hero
  hero: { alignItems: 'center', paddingTop: 56, paddingBottom: 32 },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: C.borderBright,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 16,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: C.cardSolid,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: C.accent },
  email: { fontSize: 15, color: C.text, fontWeight: '500', marginBottom: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.cardSolid, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  badgeText: { fontSize: 12, color: C.muted, fontWeight: '600', letterSpacing: 0.5 },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 28, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: C.cardSolid,
    borderRadius: RADIUS, borderWidth: 1, borderColor: C.border,
    padding: 14, alignItems: 'center', gap: 4,
  },
  statCardMid: { borderColor: C.borderBright },
  statIcon: { fontSize: 16, marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'center' },
  statLabel: { fontSize: 10, color: C.faint, letterSpacing: 0.5 },

  // Menu
  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.faint,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  menuCard: {
    backgroundColor: C.cardSolid, borderRadius: RADIUS_LG,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 14 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconBoxText: { fontSize: 16 },
  menuTextWrap: { flex: 1 },
  menuText: { fontSize: 15, color: C.text, fontWeight: '500' },
  menuSub: { fontSize: 12, color: C.faint, marginTop: 1 },
  menuArrow: { fontSize: 18, color: C.faint },
  menuDivider: { height: 1, backgroundColor: C.border, marginLeft: 66 },

  // Sign out
  signOutBtn: {
    marginHorizontal: 20, marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(255,34,68,0.25)',
    borderRadius: RADIUS_LG, paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,34,68,0.05)',
  },
  signOutText: { color: '#ff4466', fontSize: 15, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,0,8,0.88)' },
  modalSheet: {
    backgroundColor: '#0d001a', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: C.border, maxHeight: '85%',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.faint, alignSelf: 'center', marginTop: 12 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.cardSolid, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 13, color: C.muted },
  modalContent: { padding: 24, paddingBottom: 48 },

  sheetHeading: { fontSize: 12, fontWeight: '700', color: C.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, marginTop: 20 },
  sheetBody: { fontSize: 15, color: C.muted, lineHeight: 24 },
  sheetBullets: { gap: 10, marginTop: 16 },
  bullet: { fontSize: 14, color: C.accent, lineHeight: 20 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.border },
  sheetLabel: { flex: 1, fontSize: 16, color: C.text, fontWeight: '500' },
  sheetLink: { marginTop: 24 },
  sheetLinkText: { color: C.accent, fontSize: 14, fontWeight: '600' },
  sheetLinkInline: { color: C.accent, fontWeight: '600' },

  cityList: { gap: 6, marginTop: 16 },
  cityRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: RADIUS, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.cardSolid,
  },
  cityRowActive: { borderColor: C.accent, backgroundColor: 'rgba(199,125,255,0.08)' },
  cityRowText: { flex: 1, fontSize: 16, color: C.muted, fontWeight: '500' },
  cityRowTextActive: { color: C.text, fontWeight: '700' },
  cityCheck: { color: C.accent, fontSize: 15, fontWeight: '800' },

  omLogo: { alignItems: 'center', paddingVertical: 20 },
  omLogoText: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: 6 },
  omVersion: { fontSize: 12, color: C.faint, marginTop: 6 },
});
