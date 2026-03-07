import { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePsychiatristsStore } from '../../stores/psychiatrists';
import type { Psychiatrist } from '../../types/database';

// ─── Card ─────────────────────────────────────────────────────────────────────

function PsychiatristCard({ psych }: { psych: Psychiatrist }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.88}
      onPress={() => router.push(`/psychiatrists/${psych.id}` as never)}
    >
      {psych.is_equi_partner && (
        <View style={s.partnerBanner}>
          <Text style={s.partnerBannerText}>⭐ EQUI PARTNER</Text>
        </View>
      )}

      <View style={s.cardHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{psych.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{psych.name}</Text>
          {psych.credentials && <Text style={s.credentials}>{psych.credentials}</Text>}
          <Text style={s.location}>
            {[psych.location_city, psych.location_state].filter(Boolean).join(', ')}
          </Text>
        </View>
      </View>

      <View style={s.tagRow}>
        {psych.offers_telehealth && <View style={s.tag}><Text style={s.tagText}>📱 Telehealth</Text></View>}
        {psych.offers_in_person && <View style={s.tag}><Text style={s.tagText}>🏥 In-person</Text></View>}
        {psych.sliding_scale && <View style={s.tag}><Text style={s.tagText}>$ Sliding scale</Text></View>}
        {psych.insurance_accepted?.slice(0, 2).map((ins) => (
          <View key={ins} style={s.tag}><Text style={s.tagText}>{ins}</Text></View>
        ))}
        {(psych.insurance_accepted?.length ?? 0) > 2 && (
          <Text style={s.moreText}>+{(psych.insurance_accepted?.length ?? 0) - 2} more</Text>
        )}
      </View>

      <Text style={s.viewProfile}>View profile →</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PsychiatristsScreen() {
  const router = useRouter();
  const store = usePsychiatristsStore();
  const results = store.filtered();

  useEffect(() => {
    store.load();
  }, []);

  const filterDefs = [
    { key: 'telehealth' as const, label: 'Telehealth' },
    { key: 'in_person' as const, label: 'In-person' },
    { key: 'equi_partner' as const, label: 'Equi Partner' },
    { key: 'sliding_scale' as const, label: 'Sliding $' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←  Back</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Find a Psychiatrist</Text>
        <View style={{ width: 64 }} />
      </View>

      {/* Search bar */}
      <View style={s.searchBar}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput
          style={s.searchInput}
          value={store.query}
          onChangeText={store.setQuery}
          placeholder="City or state"
          placeholderTextColor="#3D393550"
          returnKeyType="search"
        />
        {store.query.length > 0 && (
          <TouchableOpacity onPress={() => store.setQuery('')}>
            <Text style={s.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersRow}
      >
        {filterDefs.map(({ key, label }) => {
          const active = store.filters[key];
          return (
            <TouchableOpacity
              key={key}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => store.setFilter(key, !active)}
            >
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {store.isLoading ? (
        <View style={s.center}><ActivityIndicator color="#A8C5A0" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.resultCount}>
            {results.length} {results.length === 1 ? 'psychiatrist' : 'psychiatrists'}
          </Text>

          {results.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No results for that search. Try a different city or remove a filter.</Text>
            </View>
          ) : (
            results.map((p) => <PsychiatristCard key={p.id} psych={p} />)
          )}

          <View style={s.disclaimerCard}>
            <Text style={s.disclaimerText}>
              Insurance information is self-reported. Check your plan directly. Equi Partners understand the app's monitoring approach and can receive your AI report before appointments.
            </Text>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#3D3935' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 12, marginHorizontal: 16,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  searchIcon: { fontSize: 16, color: '#3D3935', opacity: 0.3 },
  searchInput: { flex: 1, fontSize: 15, color: '#3D3935' },
  searchClear: { fontSize: 13, color: '#3D3935', opacity: 0.3, paddingLeft: 4 },
  filtersRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E0DDD8',
  },
  filterChipActive: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A015' },
  filterChipText: { fontSize: 13, color: '#3D3935', opacity: 0.5, fontWeight: '500' },
  filterChipTextActive: { color: '#A8C5A0', opacity: 1, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  resultCount: { fontSize: 12, color: '#3D3935', opacity: 0.35, marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F0EDE8',
  },
  partnerBanner: {
    backgroundColor: '#C9A84C15', borderRadius: 8, paddingVertical: 4,
    paddingHorizontal: 10, alignSelf: 'flex-start', marginBottom: 10,
  },
  partnerBannerText: { fontSize: 10, fontWeight: '700', color: '#C9A84C', letterSpacing: 0.4 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#A8C5A020', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#A8C5A0' },
  name: { fontSize: 15, fontWeight: '700', color: '#3D3935', marginBottom: 2 },
  credentials: { fontSize: 12, color: '#3D3935', opacity: 0.5, marginBottom: 2 },
  location: { fontSize: 12, color: '#3D3935', opacity: 0.35 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  tagText: { fontSize: 11, color: '#3D3935', opacity: 0.55 },
  moreText: { fontSize: 11, color: '#3D3935', opacity: 0.35, alignSelf: 'center' },
  viewProfile: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#3D3935', opacity: 0.45, textAlign: 'center', lineHeight: 20 },
  disclaimerCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 4 },
  disclaimerText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },
});
