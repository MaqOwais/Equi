import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../lib/supabase';
import type { Psychiatrist } from '../../types/database';

// ─── Psychiatrist Card ────────────────────────────────────────────────────────

function PsychiatristCard({
  psych,
  onConnect,
}: { psych: Psychiatrist; onConnect: (psych: Psychiatrist) => void }) {
  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.cardHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{psych.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={s.name}>{psych.name}</Text>
            {psych.is_equi_partner && (
              <View style={s.partnerBadge}>
                <Text style={s.partnerBadgeText}>Equi Partner</Text>
              </View>
            )}
          </View>
          <Text style={s.credentials}>{psych.credentials}</Text>
          <Text style={s.location}>
            {[psych.location_city, psych.location_country].filter(Boolean).join(', ')}
          </Text>
        </View>
      </View>

      {/* Bio */}
      {psych.bio && (
        <Text style={s.bio} numberOfLines={3}>{psych.bio}</Text>
      )}

      {/* Tags */}
      <View style={s.tagRow}>
        {psych.offers_telehealth && (
          <View style={s.tag}><Text style={s.tagText}>📱 Telehealth</Text></View>
        )}
        {psych.offers_in_person && (
          <View style={s.tag}><Text style={s.tagText}>🏥 In-person</Text></View>
        )}
        {psych.insurance_accepted?.slice(0, 2).map((ins) => (
          <View key={ins} style={s.tag}><Text style={s.tagText}>{ins}</Text></View>
        ))}
        {(psych.insurance_accepted?.length ?? 0) > 2 && (
          <Text style={s.moreInsurance}>
            +{(psych.insurance_accepted?.length ?? 0) - 2} more
          </Text>
        )}
      </View>

      {/* CTAs */}
      <View style={s.ctaRow}>
        <TouchableOpacity
          style={s.connectBtn}
          onPress={() => onConnect(psych)}
        >
          <Text style={s.connectBtnText}>Connect</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bookBtn}>
          <Text style={s.bookBtnText}>Book appointment →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PsychiatristsScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [psychiatrists, setPsychiatrists] = useState<Psychiatrist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPartner, setFilterPartner] = useState(false);
  const [filterTelehealth, setFilterTelehealth] = useState(false);

  useEffect(() => {
    loadPsychiatrists();
  }, []);

  async function loadPsychiatrists() {
    setIsLoading(true);
    const { data } = await supabase
      .from('psychiatrists')
      .select('*')
      .order('is_equi_partner', { ascending: false })
      .order('name');
    setPsychiatrists((data ?? []) as Psychiatrist[]);
    setIsLoading(false);
  }

  async function handleConnect(psych: Psychiatrist) {
    if (!userId) return;

    Alert.alert(
      `Connect with ${psych.name}?`,
      'By default, only your activity completion data will be shared. You can adjust this in Support Network at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: async () => {
            const { error } = await supabase.from('companions').upsert({
              patient_id: userId,
              role: 'guardian',
              guardian_level: 'view_only',
              invite_email: psych.name,
              status: 'pending',
              share_mood_summaries: false,
              share_cycle_data: false,
              share_ai_report: false,
              share_medication: false,
            });
            if (!error) {
              Alert.alert(
                'Request sent',
                `${psych.name} will be notified. Manage access in Support Network.`,
              );
            }
          },
        },
      ],
    );
  }

  const filtered = psychiatrists.filter((p) => {
    if (filterPartner && !p.is_equi_partner) return false;
    if (filterTelehealth && !p.offers_telehealth) return false;
    return true;
  });

  return (
    <SafeAreaView style={s.safe}>
      {/* Nav */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←  Back</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Psychiatrists</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        <TouchableOpacity
          style={[s.filterChip, filterPartner && s.filterChipActive]}
          onPress={() => setFilterPartner((v) => !v)}
        >
          <Text style={[s.filterChipText, filterPartner && s.filterChipTextActive]}>
            Equi Partners
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.filterChip, filterTelehealth && s.filterChipActive]}
          onPress={() => setFilterTelehealth((v) => !v)}
        >
          <Text style={[s.filterChipText, filterTelehealth && s.filterChipTextActive]}>
            Telehealth
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color="#A8C5A0" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.resultCount}>{filtered.length} psychiatrists</Text>

          {filtered.map((p) => (
            <PsychiatristCard key={p.id} psych={p} onConnect={handleConnect} />
          ))}

          <View style={s.disclaimerCard}>
            <Text style={s.disclaimerText}>
              Equi Partners understand the app's monitoring approach and can receive structured
              activity compliance data. Connecting shares only activity data by default — you control
              all other sharing from Support Network.
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
  safe: { flex: 1, backgroundColor: '#F7F3EE' },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: { paddingVertical: 6, paddingRight: 16 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#3D3935' },

  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12,
  },
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
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#A8C5A020', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#A8C5A0' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '700', color: '#3D3935' },
  partnerBadge: {
    backgroundColor: '#A8C5A020', borderRadius: 8,
    paddingVertical: 2, paddingHorizontal: 7,
  },
  partnerBadgeText: { fontSize: 10, color: '#A8C5A0', fontWeight: '700', letterSpacing: 0.3 },
  credentials: { fontSize: 12, color: '#3D3935', opacity: 0.5, marginBottom: 2 },
  location: { fontSize: 12, color: '#3D3935', opacity: 0.35 },

  bio: { fontSize: 13, color: '#3D3935', opacity: 0.6, lineHeight: 18, marginBottom: 10 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: {
    backgroundColor: '#F7F3EE', borderRadius: 8,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  tagText: { fontSize: 11, color: '#3D3935', opacity: 0.55 },
  moreInsurance: { fontSize: 11, color: '#3D3935', opacity: 0.35, alignSelf: 'center' },

  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connectBtn: {
    backgroundColor: '#A8C5A0', borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 20,
  },
  connectBtnText: { fontSize: 13, fontWeight: '600', color: '#F7F3EE' },
  bookBtn: { paddingVertical: 9 },
  bookBtnText: { fontSize: 13, color: '#3D3935', opacity: 0.4, fontWeight: '500' },

  disclaimerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 4,
  },
  disclaimerText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },
});
