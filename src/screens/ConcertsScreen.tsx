import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking,
} from 'react-native';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { C, RADIUS, RADIUS_LG } from '../constants/theme';
import { CITIES } from '../constants/cities';

interface Concert {
  id: string;
  title: string;
  artist: string;
  venue: string;
  city: string;
  date: Date;
  genre: string;
  imageUrl?: string;
  ticketUrl?: string;
}

const GENRES = ['Alle', 'Pop', 'Rock', 'Hip-hop', 'Elektronisk', 'Jazz', 'Metal', 'R&B'];
const CITY_OPTIONS = ['Alle', ...CITIES.map((c) => c.name)];

function formatDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'I kveld';
  if (date.toDateString() === tomorrow.toDateString()) return 'I morgen';
  return date.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isThisWeekend(date: Date): boolean {
  const day = date.getDay();
  const diff = date.getTime() - Date.now();
  return (day === 5 || day === 6) && diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

const GENRE_COLORS: Record<string, string> = {
  Pop: '#ff6eb4',
  Rock: '#ff8c42',
  Metal: '#9b59ff',
  'Hip-hop': '#ffd60a',
  Elektronisk: '#00d4ff',
  Jazz: '#39ff14',
  Klassisk: '#c77dff',
  'R&B': '#ff4d6d',
};

export default function ConcertsScreen() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('Alle');
  const [selectedGenre, setSelectedGenre] = useState('Alle');

  useEffect(() => {
    const now = Timestamp.fromDate(new Date());
    const q = query(
      collection(db, 'concerts'),
      where('date', '>=', now),
      orderBy('date', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      setConcerts(snap.docs.map((d) => {
        const raw = d.data();
        return { id: d.id, ...raw, date: raw.date?.toDate?.() ?? new Date(raw.date) } as Concert;
      }));
      setLoading(false);
    });
  }, []);

  const filtered = concerts.filter((c) => {
    const cityMatch = selectedCity === 'Alle' || c.city === selectedCity;
    const genreMatch = selectedGenre === 'Alle' || c.genre === selectedGenre;
    return cityMatch && genreMatch;
  });

  const featured = filtered.filter((c) => isThisWeekend(c.date));
  const upcoming = filtered.filter((c) => !isThisWeekend(c.date));

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Konserter</Text>
          <Text style={styles.subtitle}>Hva skjer i Norge</Text>
        </View>

        {/* City filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CITY_OPTIONS.map((city) => (
            <TouchableOpacity
              key={city}
              style={[styles.chip, selectedCity === city && styles.chipActive]}
              onPress={() => setSelectedCity(city)}
            >
              <Text style={[styles.chipText, selectedCity === city && styles.chipTextActive]}>{city}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Genre filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, { marginBottom: 24 }]}>
          {GENRES.map((genre) => {
            const isActive = selectedGenre === genre;
            const color = GENRE_COLORS[genre] ?? C.accent;
            return (
              <TouchableOpacity
                key={genre}
                style={[styles.chip, styles.chipSm, isActive && { backgroundColor: color + '22', borderColor: color }]}
                onPress={() => setSelectedGenre(genre)}
              >
                <Text style={[styles.chipText, styles.chipTextSm, isActive && { color }]}>{genre}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>♪</Text>
            <Text style={styles.emptyTitle}>
              {selectedCity !== 'Alle' || selectedGenre !== 'Alle'
                ? 'Ingen treff'
                : 'Ingen kommende konserter'}
            </Text>
            <Text style={styles.emptyText}>
              {selectedCity !== 'Alle' || selectedGenre !== 'Alle'
                ? 'Prøv et annet filter.'
                : 'Nye konserter legges til fortløpende.'}
            </Text>
          </View>
        ) : (
          <>
            {/* This weekend */}
            {featured.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Denne helgen</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                  {featured.map((c) => <FeaturedCard key={c.id} concert={c} />)}
                </ScrollView>
              </View>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <View style={styles.section}>
                {featured.length > 0 && <Text style={styles.sectionLabel}>Kommende</Text>}
                <View style={styles.list}>
                  {upcoming.map((c) => <ConcertRow key={c.id} concert={c} />)}
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function FeaturedCard({ concert }: { concert: Concert }) {
  const color = GENRE_COLORS[concert.genre] ?? C.accent;
  return (
    <TouchableOpacity
      style={styles.featuredCard}
      activeOpacity={0.92}
      onPress={() => concert.ticketUrl && Linking.openURL(concert.ticketUrl)}
    >
      {concert.imageUrl ? (
        <Image source={{ uri: concert.imageUrl }} style={styles.featuredImg} />
      ) : (
        <View style={[styles.featuredImg, styles.featuredImgPlaceholder, { backgroundColor: color + '18' }]}>
          <Text style={[styles.featuredPlaceholderIcon, { color }]}>♪</Text>
        </View>
      )}
      <View style={styles.featuredGradient} />
      <View style={styles.featuredContent}>
        <View style={[styles.genreBadge, { borderColor: color + '66', backgroundColor: color + '18' }]}>
          <Text style={[styles.genreBadgeText, { color }]}>{concert.genre}</Text>
        </View>
        <Text style={styles.featuredArtist}>{concert.artist}</Text>
        <Text style={styles.featuredTitle} numberOfLines={1}>{concert.title}</Text>
        <View style={styles.featuredMeta}>
          <Text style={styles.featuredDate}>{formatDate(concert.date)}</Text>
          <Text style={styles.featuredVenue}>· {concert.venue}</Text>
        </View>
      </View>
      {concert.ticketUrl && (
        <View style={styles.featuredTicketBadge}>
          <Text style={styles.featuredTicketText}>Billetter →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ConcertRow({ concert }: { concert: Concert }) {
  const color = GENRE_COLORS[concert.genre] ?? C.accent;
  return (
    <View style={styles.row}>
      {/* Date column */}
      <View style={styles.rowDate}>
        <Text style={styles.rowDateDay}>
          {concert.date.toLocaleDateString('nb-NO', { day: 'numeric' })}
        </Text>
        <Text style={styles.rowDateMonth}>
          {concert.date.toLocaleDateString('nb-NO', { month: 'short' })}
        </Text>
      </View>

      {/* Main content */}
      <View style={[styles.rowDivider, { backgroundColor: color }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <View style={[styles.genreBadge, { borderColor: color + '55', backgroundColor: color + '15' }]}>
            <Text style={[styles.genreBadgeText, { color }]}>{concert.genre}</Text>
          </View>
        </View>
        <Text style={styles.rowArtist}>{concert.artist}</Text>
        <Text style={styles.rowTitle} numberOfLines={1}>{concert.title}</Text>
        <Text style={styles.rowVenue}>📍 {concert.venue}, {concert.city}</Text>
      </View>

      {/* Ticket */}
      {concert.ticketUrl && (
        <TouchableOpacity
          style={styles.ticketBtn}
          onPress={() => Linking.openURL(concert.ticketUrl!)}
          activeOpacity={0.8}
        >
          <Text style={styles.ticketBtnText}>Billetter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingTop: 0 },
  header: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 20 },
  title: { fontSize: 34, fontWeight: '800', color: C.text, letterSpacing: 0.3 },
  subtitle: { fontSize: 14, color: C.faint, marginTop: 4 },

  filterRow: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.cardSolid,
  },
  chipSm: { paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: C.accentGlow, borderColor: C.accent },
  chipText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  chipTextSm: { fontSize: 12 },
  chipTextActive: { color: C.accent },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 44, color: C.faint, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 6 },
  emptyText: { fontSize: 14, color: C.muted },

  section: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.faint,
    letterSpacing: 1.8, textTransform: 'uppercase',
    paddingHorizontal: 20, marginBottom: 14,
  },

  // Featured (this weekend) horizontal cards
  featuredRow: { paddingHorizontal: 20, gap: 14, paddingBottom: 8 },
  featuredCard: {
    width: 240, height: 300, borderRadius: RADIUS_LG,
    overflow: 'hidden', borderWidth: 1, borderColor: C.border,
    backgroundColor: C.cardSolid,
  },
  featuredImg: { position: 'absolute', width: '100%', height: '100%' },
  featuredImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  featuredPlaceholderIcon: { fontSize: 52 },
  featuredGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 180,
    backgroundColor: 'transparent',
    // gradient via multiple layers
  },
  featuredContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
    backgroundColor: 'rgba(5,0,8,0.75)',
  },
  featuredArtist: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 8, marginBottom: 2 },
  featuredTitle: { fontSize: 13, color: C.muted, marginBottom: 8 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredDate: { fontSize: 12, color: C.accent, fontWeight: '700' },
  featuredVenue: { fontSize: 12, color: C.muted },
  featuredTicketBadge: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: C.accent, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  featuredTicketText: { fontSize: 11, fontWeight: '800', color: '#000' },

  genreBadge: {
    alignSelf: 'flex-start', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1,
  },
  genreBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Upcoming list rows
  list: { paddingHorizontal: 20, gap: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.cardSolid, borderRadius: RADIUS,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 14, paddingHorizontal: 14,
    marginBottom: 10, gap: 14,
  },
  rowDate: { alignItems: 'center', width: 32 },
  rowDateDay: { fontSize: 20, fontWeight: '800', color: C.text, lineHeight: 22 },
  rowDateMonth: { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowDivider: { width: 2, height: 44, borderRadius: 2, opacity: 0.7 },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { marginBottom: 4 },
  rowArtist: { fontSize: 16, fontWeight: '800', color: C.text },
  rowTitle: { fontSize: 13, color: C.muted },
  rowVenue: { fontSize: 11, color: C.faint, marginTop: 4 },
  ticketBtn: {
    backgroundColor: C.accentGlow, borderRadius: RADIUS,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: C.borderBright,
  },
  ticketBtnText: { fontSize: 12, color: C.accent, fontWeight: '700' },
});
