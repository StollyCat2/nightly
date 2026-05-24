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

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <View style={styles.avatarGlow} />
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
          <Text style={styles.memberSince}>Nightly-bruker</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{myCity}</Text>
            <Text style={styles.statLabel}>Din by</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>◎</Text>
            <Text style={styles.statLabel}>Utforsker</Text>
          </View>
        </View>

        {/* Innstillinger */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Innstillinger</Text>
          <View style={styles.menuCard}>

            {/* Varsler */}
            <View style={styles.menuItem}>
              <Text style={styles.menuIcon}>🔔</Text>
              <Text style={styles.menuText}>Varsler</Text>
              <Switch
                value={notificationsOn}
                onValueChange={toggleNotifications}
                trackColor={{ false: C.border, true: C.accent + '88' }}
                thumbColor={notificationsOn ? C.accent : C.faint}
              />
            </View>

            <View style={styles.menuDivider} />

            {/* Posisjon */}
            <TouchableOpacity style={styles.menuItem} onPress={() => setSheet('posisjon')}>
              <Text style={styles.menuIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuText}>Posisjon</Text>
                <Text style={styles.menuSub}>{locationOn ? 'Aktivert' : 'Ikke aktivert'}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* Min by */}
            <TouchableOpacity style={styles.menuItem} onPress={() => setSheet('by')}>
              <Text style={styles.menuIcon}>🌆</Text>
              <View style={{ flex: 1 }}>
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
              <Text style={styles.menuIcon}>📋</Text>
              <Text style={styles.menuText}>Personvern</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => setSheet('om')}>
              <Text style={styles.menuIcon}>ℹ️</Text>
              <Text style={styles.menuText}>Om Nightly</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={loggingOut}>
          <Text style={styles.signOutText}>{loggingOut ? 'Logger ut...' : 'Logg ut'}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Nightly v1.0</Text>
      </ScrollView>

      {/* Posisjon sheet */}
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
            trackColor={{ false: C.border, true: C.accent + '88' }}
            thumbColor={locationOn ? C.accent : C.faint}
          />
        </View>
        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.sheetLink} onPress={() => Linking.openSettings()}>
            <Text style={styles.sheetLinkText}>Åpne systeminnstillinger →</Text>
          </TouchableOpacity>
        )}
      </InfoModal>

      {/* Min by sheet */}
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

      {/* Personvern sheet */}
      <InfoModal visible={sheet === 'personvern'} onClose={() => setSheet(null)} title="Personvern">
        <Text style={styles.sheetHeading}>Hvilke data samler vi inn?</Text>
        <Text style={styles.sheetBody}>
          Nightly samler kun inn anonymisert posisjonsdata når du aktivt bruker appen og har gitt tillatelse.
          Dataen brukes utelukkende til å vise byens puls på kartet.
        </Text>
        <Text style={styles.sheetHeading}>Lagring</Text>
        <Text style={styles.sheetBody}>
          Din eksakte posisjon lagres aldri permanent. Posisjonspunkter slettes automatisk etter 10 minutter.
          Vi lagrer ikke navn, telefonnummer eller annen personlig informasjon utover e-postadressen du
          brukte til å opprette konto.
        </Text>
        <Text style={styles.sheetHeading}>Deling med tredjeparter</Text>
        <Text style={styles.sheetBody}>
          Vi deler ingen personopplysninger med tredjeparter. Appen bruker Firebase (Google) for
          autentisering og datalagring, underlagt Googles personvernpolitikk.
        </Text>
        <Text style={styles.sheetHeading}>Sletting av konto</Text>
        <Text style={styles.sheetBody}>
          Ønsker du å slette kontoen din og alle tilknyttede data, ta kontakt med oss på{' '}
          <Text style={styles.sheetLinkInline} onPress={() => Linking.openURL('mailto:hei@nightly.no')}>
            hei@nightly.no
          </Text>
        </Text>
      </InfoModal>

      {/* Om Nightly sheet */}
      <InfoModal visible={sheet === 'om'} onClose={() => setSheet(null)} title="Om Nightly">
        <View style={styles.omLogo}>
          <Text style={styles.omLogoIcon}>✦</Text>
          <Text style={styles.omLogoText}>Nightly</Text>
        </View>
        <Text style={styles.omVersion}>Versjon 1.0.0</Text>
        <Text style={styles.sheetBody}>
          Nightly er appen som viser byens puls i sanntid. Se hvilke utesteder som er hete,
          hva som skjer i kveld og hvor folkemengden samler seg — alt på ett kart.
        </Text>
        <View style={styles.sheetBullets}>
          <Text style={styles.bullet}>✦ Live kø-status fra utesteder</Text>
          <Text style={styles.bullet}>✦ Konserter og arrangementer</Text>
          <Text style={styles.bullet}>✦ Byens puls i sanntid</Text>
        </View>
        <TouchableOpacity style={styles.sheetLink} onPress={() => Linking.openURL('mailto:hei@nightly.no')}>
          <Text style={styles.sheetLinkText}>Kontakt oss: hei@nightly.no →</Text>
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
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  title: { fontSize: 32, fontWeight: '800', color: C.text },
  avatarSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: C.cardSolid,
    borderWidth: 2, borderColor: C.borderBright,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarGlow: { position: 'absolute', width: 88, height: 88, borderRadius: 44, backgroundColor: C.accent, opacity: 0.15 },
  avatarText: { fontSize: 28, fontWeight: '800', color: C.accent },
  email: { fontSize: 16, color: C.text, fontWeight: '600', marginTop: 12 },
  memberSince: { fontSize: 13, color: C.muted, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: C.cardSolid, borderRadius: RADIUS, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: C.accent, marginBottom: 4 },
  statLabel: { fontSize: 12, color: C.muted },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.faint, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  menuCard: { backgroundColor: C.cardSolid, borderRadius: RADIUS_LG, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon: { fontSize: 18, width: 28 },
  menuText: { flex: 1, fontSize: 16, color: C.text, fontWeight: '500' },
  menuSub: { fontSize: 12, color: C.muted, marginTop: 1 },
  menuArrow: { fontSize: 20, color: C.faint },
  menuDivider: { height: 1, backgroundColor: C.border, marginLeft: 56 },
  signOutBtn: { marginHorizontal: 20, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,34,68,0.3)', borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: '#ff2244', fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 12, color: C.faint, marginTop: 24 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,0,8,0.85)' },
  modalSheet: { backgroundColor: '#0d001a', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.border, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: C.text },
  modalClose: { padding: 4 },
  modalCloseText: { fontSize: 16, color: C.muted },
  modalContent: { padding: 24, paddingBottom: 48 },

  // Sheet content
  sheetHeading: { fontSize: 13, fontWeight: '700', color: C.accent, letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  sheetBody: { fontSize: 15, color: C.muted, lineHeight: 24 },
  sheetBullets: { gap: 10, marginTop: 16 },
  bullet: { fontSize: 14, color: C.accent, lineHeight: 20 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.border },
  sheetLabel: { flex: 1, fontSize: 16, color: C.text, fontWeight: '500' },
  sheetLink: { marginTop: 24 },
  sheetLinkText: { color: C.accent, fontSize: 14, fontWeight: '600' },
  sheetLinkInline: { color: C.accent, fontWeight: '600' },

  // City picker
  cityList: { gap: 4, marginTop: 16 },
  cityRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: RADIUS, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardSolid },
  cityRowActive: { borderColor: C.accent, backgroundColor: C.accentGlow },
  cityRowText: { flex: 1, fontSize: 16, color: C.muted, fontWeight: '600' },
  cityRowTextActive: { color: C.text },
  cityCheck: { color: C.accent, fontSize: 16, fontWeight: '800' },

  // Om Nightly
  omLogo: { alignItems: 'center', paddingVertical: 24 },
  omLogoIcon: { fontSize: 36, color: C.accent, marginBottom: 8 },
  omLogoText: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: 1 },
  omVersion: { textAlign: 'center', fontSize: 13, color: C.faint, marginBottom: 20 },
});
