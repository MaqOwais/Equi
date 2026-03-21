import { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { usePsychiatristsStore } from '../../stores/psychiatrists';
import type { Psychiatrist } from '../../types/database';

const IS_DEV = Constants.appOwnership === 'expo' || __DEV__;

// ─── Dev seed ─────────────────────────────────────────────────────────────────

const DEV_PSYCHIATRISTS: Psychiatrist[] = [
  {
    id: 'dev-psych-001',
    npi_number: 'DEV-001',
    name: 'Dr. Sarah Chen',
    credentials: 'MD, Board Certified in Psychiatry',
    bio: 'Specializing in mood disorders for over 12 years. I use a collaborative, evidence-based approach that integrates medication management with psychoeducation. Familiar with Equi\'s monitoring approach.',
    photo_url: null,
    offers_telehealth: true,
    offers_in_person: true,
    location_city: 'San Francisco',
    location_state: 'CA',
    insurance_accepted: ['Aetna', 'Blue Cross', 'Cigna'],
    sliding_scale: false,
    is_equi_partner: true,
    calendly_username: 'sarahchen-md',
    activity_prescribing_enabled: true,
    verified_at: '2024-01-01T00:00:00Z',
    profile_visible: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'dev-psych-002',
    npi_number: 'DEV-002',
    name: 'Dr. Marcus Williams',
    credentials: 'MD, MPH',
    bio: 'Community psychiatrist with a focus on accessible care. I offer sliding-scale fees and have extensive experience treating mood and anxiety disorders across all age groups.',
    photo_url: null,
    offers_telehealth: true,
    offers_in_person: false,
    location_city: 'Chicago',
    location_state: 'IL',
    insurance_accepted: ['Medicaid', 'United Health'],
    sliding_scale: true,
    is_equi_partner: false,
    calendly_username: null,
    activity_prescribing_enabled: false,
    verified_at: '2024-01-01T00:00:00Z',
    profile_visible: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'dev-psych-003',
    npi_number: 'DEV-003',
    name: 'Dr. Priya Patel',
    credentials: 'DO, Psychiatry & Neurology',
    bio: 'I take an integrated mind-body approach to mental health care, combining medication management with lifestyle medicine. Equi Partner — I actively use patient tracking data to inform treatment adjustments.',
    photo_url: null,
    offers_telehealth: true,
    offers_in_person: true,
    location_city: 'New York',
    location_state: 'NY',
    insurance_accepted: ['Aetna', 'Humana', 'Empire BCBS'],
    sliding_scale: false,
    is_equi_partner: true,
    calendly_username: 'drpriyapatel',
    activity_prescribing_enabled: true,
    verified_at: '2024-01-01T00:00:00Z',
    profile_visible: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'dev-psych-004',
    npi_number: 'DEV-004',
    name: 'Dr. James O\'Brien',
    credentials: 'MD, FAPA',
    bio: 'Fellow of the American Psychiatric Association with 20 years in private practice. Subspecialty in treatment-resistant mood disorders and TMS therapy.',
    photo_url: null,
    offers_telehealth: false,
    offers_in_person: true,
    location_city: 'Austin',
    location_state: 'TX',
    insurance_accepted: ['Blue Cross', 'Cigna', 'Out-of-pocket'],
    sliding_scale: false,
    is_equi_partner: false,
    calendly_username: 'drjobrien',
    activity_prescribing_enabled: false,
    verified_at: '2024-01-01T00:00:00Z',
    profile_visible: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

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

      {IS_DEV && store.all.length === 0 && !store.isLoading && (
        <View style={s.devBanner}>
          <Text style={s.devBannerText}>🛠  No data from DB — tap to load test psychiatrists</Text>
          <TouchableOpacity
            style={s.devBannerBtn}
            onPress={() => usePsychiatristsStore.setState({ all: DEV_PSYCHIATRISTS })}
          >
            <Text style={s.devBannerBtnText}>Load dev data</Text>
          </TouchableOpacity>
        </View>
      )}

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

  devBanner: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: '#C9A84C12',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#C9A84C30',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  devBannerText: { flex: 1, fontSize: 12, color: '#C9A84C', lineHeight: 17 },
  devBannerBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  devBannerBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
});
