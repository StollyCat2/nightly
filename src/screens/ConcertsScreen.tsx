import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking,
} from 'react-native';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { C, RADIUS, RADIUS_LG } from '../constants/theme';
import { CITIES } from '../constants/cities';

type EventType = 'concert' | 'festival';

interface Event {
  id: string;
  type: EventType;
  title: string;
  artist: string;
  venue: string;
  city: string;
  date: Date;
  endDate?: Date;
  genre: string;
  imageUrl?: string;
  ticketUrl?: string;
}

const GENRES = ['Alle', 'Pop', 'Rock', 'Hip-hop', 'Elektronisk', 'Jazz', 'Metal', 'R&B'];
const CITY_OPTIONS = ['Alle', ...CITIES.map((c) => c.name)];

const GENRE_COLORS: Record<string, string> = {
  Pop: '#ff6eb4', Rock: '#ff8c42', Metal: '#9b59ff',
  'Hip-hop': '#ffd60a', Elektronisk: '#00d4ff',
  Jazz: '#39ff14', Klassisk: '#c77dff', 'R&B': '#ff4d6d',
};

const FESTIVAL_GRAD: [string, string][] = [
  ['#1a003a', '#c77dff'], ['#001a2a', '#00d4ff'],
  ['#0d2a00', '#39ff14'], ['#2a1000', '#ff8c42'],
  ['#2a002a', '#e040fb'], ['#1a0010', '#ff4d6d'],
];

function festivalGrad(name: string): [string, string] {
  return FESTIVAL_GRAD[(name.charCodeAt(0) ?? 0) % FESTIVAL_GRAD.length];
}

function formatDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'I kveld';
  if (date.toDateString() === tomorrow.toDateString()) return 'I morgen';
  return date.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateRange(start: Date, end?: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (!end || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('nb-NO', opts);
  }
  const s = start.toLocaleDateString('nb-NO', { day: 'numeric', month: start.getMonth() !== end.getMonth() ? 'short' : undefined });
  const e = end.toLocaleDateString('nb-NO', opts);
  return `${s} – ${e}`;
}

function isThisWeekend(date: Date): boolean {
  const day = date.getDay();
  const diff = date.getTime() - Date.now();
  return (day === 5 || day === 6) && diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

export default function ConcertsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<EventType>('concert');
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
      setEvents(snap.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          type: (raw.type as EventType) ?? 'concert',
          ...raw,
          date: raw.date?.toDate?.() ?? new Date(raw.date),
          endDate: raw.endDate ? (raw.endDate?.toDate?.() ?? new Date(raw.endDate)) : undefined,
        } as Event;
      }));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => events.filter((e) => {
    if (e.type !== tab) return false;
    if (selectedCity !== 'Alle' && e.city !== selectedCity) return false;
    if (tab === 'concert' && selectedGenre !== 'Alle' && e.genre !== selectedGenre) return false;
    return true;
  }), [events, tab, selectedCity, selectedGenre]);

  const concerts = filtered.filter((e) => e.type === 'concert');
  const festivals = filtered.filter((e) => e.type === 'festival');
  const featured = concerts.filter((c) => isThisWeekend(c.date));
  const upcoming = concerts.filter((c) => !isThisWeekend(c.date));

  const concertCount = events.filter((e) => e.type === 'concert').length;
  const festivalCount = events.filter((e) => e.type === 'festival').length;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Eventer</Text>
          <Text style={styles.subtitle}>Konserter og festivaler i Norge</Text>
        </View>

        {/* Type tabs */}
        <View style={styles.typeTabs}>
          <TouchableOpacity
            style={[styles.typeTab, tab === 'concert' && styles.typeTabActive]}
            onPress={() => setTab('concert')}
          >
            <Text style={[styles.typeTabText, tab === 'concert' && styles.typeTabTextActive]}>
              ♪ Konserter
            </Text>
            {concertCount > 0 && (
              <View style={[styles.typeTabBadge, tab === 'concert' && styles.typeTabBadgeActive]}>
                <Text style={[styles.typeTabBadgeText, tab === 'concert' && styles.typeTabBadgeTextActive]}>
                  {concertCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeTab, tab === 'festival' && styles.typeTabActive]}
            onPress={() => setTab('festival')}
          >
            <Text style={[styles.typeTabText, tab === 'festival' && styles.typeTabTextActive]}>
              ⛺ Festivaler
            </Text>
            {festivalCount > 0 && (
              <View style={[styles.typeTabBadge, tab === 'festival' && styles.typeTabBadgeActive]}>
                <Text style={[styles.typeTabBadgeText, tab === 'festival' && styles.typeTabBadgeTextActive]}>
                  {festivalCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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

        {/* Genre filter — concerts only */}
        {tab === 'concert' && (
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
        )}

        {tab === 'festival' && <View style={{ height: 24 }} />}

        {loading ? (
          <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{tab === 'festival' ? '⛺' : '♪'}</Text>
            <Text style={styles.emptyTitle}>
              {selectedCity !== 'Alle' || selectedGenre !== 'Alle'
                ? 'Ingen treff'
                : tab === 'festival' ? 'Ingen kommende festivaler' : 'Ingen kommende konserter'}
            </Text>
            <Text style={styles.emptyText}>
              {selectedCity !== 'Alle' || selectedGenre !== 'Alle'
                ? 'Prøv et annet filter.'
                : 'Nye eventer legges til fortløpende.'}
            </Text>
          </View>
        ) : tab === 'concert' ? (
          <>
            {featured.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Denne helgen</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                  {featured.map((c) => <FeaturedCard key={c.id} event={c} />)}
                </ScrollView>
              </View>
            )}
            {upcoming.length > 0 && (
              <View style={styles.section}>
                {featured.length > 0 && <Text style={styles.sectionLabel}>Kommende</Text>}
                <View style={styles.list}>
                  {upcoming.map((c) => <ConcertRow key={c.id} event={c} />)}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.list}>
            {festivals.map((f) => <FestivalCard key={f.id} event={f} />)}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function FeaturedCard({ event: concert }: { event: Event }) {
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

function ConcertRow({ event: concert }: { event: Event }) {
  const color = GENRE_COLORS[concert.genre] ?? C.accent;
  return (
    <View style={styles.row}>
      <View style={styles.rowDate}>
        <Text style={styles.rowDateDay}>{concert.date.toLocaleDateString('nb-NO', { day: 'numeric' })}</Text>
        <Text style={styles.rowDateMonth}>{concert.date.toLocaleDateString('nb-NO', { month: 'short' })}</Text>
      </View>
      <View style={[styles.rowDivider, { backgroundColor: color }]} />
      <View style={styles.rowBody}>
        <View style={[styles.genreBadge, { borderColor: color + '55', backgroundColor: color + '15' }]}>
          <Text style={[styles.genreBadgeText, { color }]}>{concert.genre}</Text>
        </View>
        <Text style={styles.rowArtist}>{concert.artist}</Text>
        <Text style={styles.rowTitle} numberOfLines={1}>{concert.title}</Text>
        <Text style={styles.rowVenue}>📍 {concert.venue}, {concert.city}</Text>
      </View>
      {concert.ticketUrl && (
        <TouchableOpacity style={styles.ticketBtn} onPress={() => Linking.openURL(concert.ticketUrl!)} activeOpacity={0.8}>
          <Text style={styles.ticketBtnText}>Billetter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function FestivalCard({ event: festival }: { event: Event }) {
  const [gradFrom, gradTo] = festivalGrad(festival.title);
  const color = GENRE_COLORS[festival.genre] ?? C.accent;
  return (
    <TouchableOpacity
      style={styles.festivalCard}
      activeOpacity={0.92}
      onPress={() => festival.ticketUrl && Linking.openURL(festival.ticketUrl)}
    >
      {festival.imageUrl ? (
        <Image source={{ uri: festival.imageUrl }} style={StyleSheet.absoluteFill} />
      ) : (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: gradFrom }]} />
          <View style={[styles.festivalGlow, { backgroundColor: gradTo }]} />
        </>
      )}
      <View style={styles.festivalOverlay} />

      <View style={styles.festivalContent}>
        {/* Top row: genre + date range */}
        <View style={styles.festivalTopRow}>
          <View style={[styles.genreBadge, { borderColor: color + '88', backgroundColor: color + '22' }]}>
            <Text style={[styles.genreBadgeText, { color }]}>{festival.genre}</Text>
          </View>
          <View style={styles.festivalDateBadge}>
            <Text style={styles.festivalDateText}>{formatDateRange(festival.date, festival.endDate)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.festivalTitle}>{festival.title}</Text>
        {festival.artist ? (
          <Text style={styles.festivalArtist}>{festival.artist}</Text>
        ) : null}

        {/* Location */}
        <View style={styles.festivalLocationRow}>
          <Text style={styles.festivalLocation}>📍 {festival.venue}, {festival.city}</Text>
          {festival.ticketUrl && (
            <View style={styles.festivalTicketBadge}>
              <Text style={styles.festivalTicketText}>Billetter →</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingTop: 0 },
  header: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 16 },
  title: { fontSize: 34, fontWeight: '800', color: C.text, letterSpacing: 0.3 },
  subtitle: { fontSize: 14, color: C.faint, marginTop: 4 },

  typeTabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: C.cardSolid, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, padding: 4, gap: 4,
  },
  typeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, gap: 6,
  },
  typeTabActive: { backgroundColor: C.accent + '18', borderWidth: 1, borderColor: C.accent + '55' },
  typeTabText: { fontSize: 13, fontWeight: '700', color: C.muted },
  typeTabTextActive: { color: C.accent },
  typeTabBadge: {
    backgroundColor: C.border, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  typeTabBadgeActive: { backgroundColor: C.accent + '30' },
  typeTabBadgeText: { fontSize: 10, fontWeight: '700', color: C.muted },
  typeTabBadgeTextActive: { color: C.accent },

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

  featuredRow: { paddingHorizontal: 20, gap: 14, paddingBottom: 8 },
  featuredCard: {
    width: 240, height: 300, borderRadius: RADIUS_LG,
    overflow: 'hidden', borderWidth: 1, borderColor: C.border,
    backgroundColor: C.cardSolid,
  },
  featuredImg: { position: 'absolute', width: '100%', height: '100%' },
  featuredImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  featuredPlaceholderIcon: { fontSize: 52 },
  featuredContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16,
    backgroundColor: 'rgba(5,0,8,0.78)',
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
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
  },
  genreBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

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
  rowArtist: { fontSize: 16, fontWeight: '800', color: C.text },
  rowTitle: { fontSize: 13, color: C.muted },
  rowVenue: { fontSize: 11, color: C.faint, marginTop: 4 },
  ticketBtn: {
    backgroundColor: C.accentGlow, borderRadius: RADIUS,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: C.borderBright,
  },
  ticketBtnText: { fontSize: 12, color: C.accent, fontWeight: '700' },

  // Festival cards
  festivalCard: {
    height: 200, borderRadius: RADIUS_LG, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border, marginBottom: 14,
  },
  festivalGlow: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, opacity: 0.18, top: -100, right: -80,
  },
  festivalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,0,8,0.45)',
  },
  festivalContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18,
  },
  festivalTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  festivalDateBadge: {
    backgroundColor: 'rgba(5,0,8,0.7)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  festivalDateText: { fontSize: 12, color: C.text, fontWeight: '700' },
  festivalTitle: { fontSize: 24, fontWeight: '900', color: C.text, marginBottom: 3 },
  festivalArtist: { fontSize: 13, color: C.muted, marginBottom: 8 },
  festivalLocationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  festivalLocation: { fontSize: 12, color: C.muted, flex: 1 },
  festivalTicketBadge: {
    backgroundColor: C.accent, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  festivalTicketText: { fontSize: 11, fontWeight: '800', color: '#000' },
});
