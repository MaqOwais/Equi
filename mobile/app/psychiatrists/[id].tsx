import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth';
import { useAccessStore, SECTION_META, type DataSection } from '../../stores/access';
import { usePsychiatristsStore } from '../../stores/psychiatrists';
import { supabase } from '../../lib/supabase';
import type { Psychiatrist, PsychiatristConnection } from '../../types/database';

// Sections the psychiatrist can potentially see (matches manage-access)
const PSYCH_SECTIONS: DataSection[] = [
  'share_cycle_data', 'share_journal', 'share_activities',
  'share_medication', 'share_sleep', 'share_nutrition',
  'share_workbook', 'share_ai_report',
];

export default function PsychiatristProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const accessStore = useAccessStore();
  const psychiatristsStore = usePsychiatristsStore();
  const userId = session?.user.id;

  const [psych, setPsych] = useState<Psychiatrist | null>(null);
  const [connection, setConnection] = useState<PsychiatristConnection | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<import('../../types/database').Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!id) return;
    // Check dev-injected store first (instant, no DB call)
    const devPsych = psychiatristsStore.all.find((p) => p.id === id);
    if (devPsych) {
      setPsych(devPsych);
      setIsLoading(false);
    }
    Promise.all([loadPsychiatrist(devPsych), loadConnection(), loadBookings()]).finally(() =>
      setIsLoading(false),
    );
  }, [id]);

  async function loadPsychiatrist(alreadyLoaded?: Psychiatrist) {
    if (alreadyLoaded) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('psychiatrists_public')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (data) setPsych(data as Psychiatrist);
  }

  async function loadConnection() {
    if (!userId) return;
    const { data } = await supabase
      .from('psychiatrist_connections')
      .select('*')
      .eq('patient_id', userId)
      .eq('psychiatrist_id', id)
      .maybeSingle();
    if (data) setConnection(data as PsychiatristConnection);

    // Also sync into the access store if accepted
    if (data && (data as PsychiatristConnection).status === 'accepted') {
      await accessStore.load(userId!);
    }
  }

  async function loadBookings() {
    if (!userId) return;
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('patient_id', userId)
      .eq('psychiatrist_id', id)
      .eq('status', 'requested')
      .order('created_at', { ascending: false });
    if (data) setUpcomingBookings(data as import('../../types/database').Booking[]);
  }

  async function handleConnect() {
    if (!userId || !psych) return;
    setConnecting(true);
    const { data } = await supabase
      .from('psychiatrist_connections')
      .insert({
        patient_id:       userId,
        psychiatrist_id:  psych.id,
        status:           'requested',
        share_ai_report:  false,
        share_medication: false,
        share_cycle_data: false,
        share_journal:    false,
        share_activities: false,
        share_sleep:      false,
        share_nutrition:  false,
        share_workbook:   false,
      })
      .select()
      .maybeSingle();
    if (data) setConnection(data as PsychiatristConnection);
    setConnecting(false);
  }

  function handleBook() {
    if (!isConnected) {
      Alert.alert(
        'Connection required',
        'Connect with this psychiatrist first so they can accept your appointment request.',
      );
      return;
    }
    router.push(`/psychiatrists/book?id=${psych!.id}` as never);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator color="#A8C5A0" size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!psych) {
    return (
      <SafeAreaView style={s.safe}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.center}><Text style={s.notFound}>Psychiatrist not found.</Text></View>
      </SafeAreaView>
    );
  }

  const isConnected = connection?.status === 'accepted';
  const isPending   = connection?.status === 'requested';
  const psychiatristConn = accessStore.psychiatristConn;

  // Which sections is the patient currently sharing with THIS psychiatrist?
  const sharedSections = isConnected && psychiatristConn
    ? PSYCH_SECTIONS.filter((sec) => !!(psychiatristConn as unknown as Record<string, unknown>)[sec])
    : [];
  const notSharedSections = isConnected && psychiatristConn
    ? PSYCH_SECTIONS.filter((sec) => !(psychiatristConn as unknown as Record<string, unknown>)[sec])
    : [];

  return (
    <SafeAreaView style={s.safe}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color="#A8C5A0" />
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={s.header}>
          {psych.is_equi_partner && (
            <View style={s.partnerBadge}>
              <Text style={s.partnerBadgeText}>⭐ Equi Partner</Text>
            </View>
          )}
          <View style={s.avatar}>
            <Text style={s.avatarText}>{psych.name.charAt(0)}</Text>
          </View>
          <Text style={s.name}>{psych.name}</Text>
          {psych.credentials && <Text style={s.credentials}>{psych.credentials}</Text>}
          {(psych.location_city || psych.location_state) && (
            <Text style={s.location}>
              📍 {[psych.location_city, psych.location_state].filter(Boolean).join(', ')}
            </Text>
          )}
          <View style={s.modeRow}>
            {psych.offers_telehealth && (
              <View style={s.modeChip}><Text style={s.modeText}>📱 Telehealth</Text></View>
            )}
            {psych.offers_in_person && (
              <View style={s.modeChip}><Text style={s.modeText}>🏥 In-person</Text></View>
            )}
          </View>
        </View>

        {/* ── Connection status banner ── */}
        {isConnected && (
          <View style={s.connectedBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#A8C5A0" />
            <Text style={s.connectedBannerText}>Connected · You are sharing data with this psychiatrist</Text>
          </View>
        )}
        {isPending && (
          <View style={s.pendingBanner}>
            <Ionicons name="time-outline" size={16} color="#C9A84C" />
            <Text style={s.pendingBannerText}>Request sent · Waiting for the psychiatrist to accept</Text>
          </View>
        )}

        {/* ── About ── */}
        {psych.bio && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ABOUT</Text>
            <Text style={s.body}>{psych.bio}</Text>
          </View>
        )}

        {/* ── Insurance ── */}
        {((psych.insurance_accepted?.length ?? 0) > 0 || psych.sliding_scale) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>INSURANCE & FEES</Text>
            <View style={s.tagWrap}>
              {(psych.insurance_accepted ?? []).map((ins) => (
                <View key={ins} style={s.insTag}>
                  <Text style={s.insTagText}>{ins}</Text>
                </View>
              ))}
              {psych.sliding_scale && (
                <View style={[s.insTag, { backgroundColor: '#A8C5A015', borderColor: '#A8C5A040' }]}>
                  <Text style={[s.insTagText, { color: '#A8C5A0' }]}>$ Sliding scale</Text>
                </View>
              )}
            </View>
            <Text style={s.disclaimer}>Insurance info is self-reported — verify with your plan.</Text>
          </View>
        )}

        {/* ── Equi Partner section ── */}
        {psych.is_equi_partner && (
          <View style={s.partnerSection}>
            <Text style={s.sectionTitle}>EQUI PARTNER</Text>
            <Text style={s.body}>
              Understands Equi's monitoring approach and can receive your AI Wellness Report before appointments.
            </Text>
            {psych.activity_prescribing_enabled && (
              <Text style={s.body}>Can prescribe therapeutic activities directly to your Activities tab.</Text>
            )}
          </View>
        )}

        {/* ── Data sharing (only when connected) ── */}
        {isConnected && psychiatristConn && (
          <View style={s.section}>
            <View style={s.sectionTitleRow}>
              <Text style={s.sectionTitle}>DATA SHARING</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/you/manage-access')}>
                <Text style={s.manageLink}>Manage →</Text>
              </TouchableOpacity>
            </View>

            {sharedSections.length > 0 ? (
              <>
                <Text style={s.sharingSubtitle}>Currently sharing:</Text>
                <View style={s.sharingList}>
                  {sharedSections.map((sec) => (
                    <View key={sec} style={s.sharingRow}>
                      <Text style={s.sharingIcon}>{SECTION_META[sec].icon}</Text>
                      <Text style={s.sharingLabel}>{SECTION_META[sec].label}</Text>
                      <Ionicons name="checkmark" size={14} color="#A8C5A0" />
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={s.noSharingText}>Nothing shared yet. Tap "Manage" to choose what this psychiatrist can see.</Text>
            )}

            {notSharedSections.length > 0 && sharedSections.length > 0 && (
              <Text style={s.notSharedNote}>
                {notSharedSections.length} section{notSharedSections.length !== 1 ? 's' : ''} not shared — tap Manage to update.
              </Text>
            )}
          </View>
        )}

        {/* ── Pending appointment requests ── */}
        {upcomingBookings.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>PENDING REQUESTS</Text>
            {upcomingBookings.map((b) => (
              <View key={b.id} style={s.bookingCard}>
                <Ionicons name="calendar-outline" size={15} color="#C9A84C" />
                <View style={{ flex: 1 }}>
                  <Text style={s.bookingType}>
                    {b.appointment_type === 'telehealth' ? '📱 Telehealth' : '🏥 In-person'} · Awaiting confirmation
                  </Text>
                  {b.notes ? <Text style={s.bookingNotes} numberOfLines={2}>{b.notes}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── CTAs ── */}
        <View style={s.ctaSection}>
          {/* Book — only shown when connected */}
          {isConnected && (
            <TouchableOpacity style={s.bookBtn} onPress={handleBook} activeOpacity={0.85}>
              <Text style={s.bookBtnText}>Request Appointment</Text>
            </TouchableOpacity>
          )}

          {/* Connect / Connected / Pending */}
          {isConnected ? null : isPending ? (
            <View style={s.pendingBadge}>
              <Ionicons name="time-outline" size={15} color="#C9A84C" />
              <Text style={s.pendingText}>Request pending</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.connectBtn, connecting && s.connectBtnDisabled]}
              onPress={handleConnect}
              disabled={connecting}
              activeOpacity={0.85}
            >
              <Text style={s.connectBtnText}>
                {connecting ? 'Sending request…' : 'Request connection'}
              </Text>
            </TouchableOpacity>
          )}

          {!isConnected && !isPending && (
            <Text style={s.connectNote}>
              A connection request lets this psychiatrist see data you choose to share. They must accept before any data is visible to them.
            </Text>
          )}

          {isPending && (
            <Text style={s.connectNote}>
              Once the psychiatrist accepts, you can manage exactly what they see from Manage Access.
            </Text>
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF8' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 15, color: '#3D3935', opacity: 0.4 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  header: { alignItems: 'center', paddingVertical: 20 },
  partnerBadge: {
    backgroundColor: '#C9A84C15', borderRadius: 8, paddingVertical: 4,
    paddingHorizontal: 12, marginBottom: 14,
  },
  partnerBadgeText: { fontSize: 11, fontWeight: '700', color: '#C9A84C', letterSpacing: 0.4 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#A8C5A020', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#A8C5A0' },
  name: { fontSize: 22, fontWeight: '700', color: '#3D3935', marginBottom: 4, textAlign: 'center' },
  credentials: { fontSize: 13, color: '#3D3935', opacity: 0.5, marginBottom: 4, textAlign: 'center' },
  location: { fontSize: 13, color: '#3D3935', opacity: 0.4, marginBottom: 12 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 4,
    paddingHorizontal: 10, borderWidth: 1, borderColor: '#F0EDE8',
  },
  modeText: { fontSize: 12, color: '#3D3935', opacity: 0.6 },

  connectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#A8C5A012', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#A8C5A030', marginBottom: 16,
  },
  connectedBannerText: { flex: 1, fontSize: 13, color: '#A8C5A0', fontWeight: '500' },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#C9A84C0C', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#C9A84C25', marginBottom: 16,
  },
  pendingBannerText: { flex: 1, fontSize: 13, color: '#C9A84C', fontWeight: '500' },

  section: { marginBottom: 20 },
  partnerSection: {
    backgroundColor: '#C9A84C0C', borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#C9A84C20',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.4,
    letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  manageLink: { fontSize: 13, color: '#A8C5A0', fontWeight: '700' },
  body: { fontSize: 14, color: '#3D3935', opacity: 0.65, lineHeight: 21, marginBottom: 6 },
  disclaimer: { fontSize: 11, color: '#3D3935', opacity: 0.3, marginTop: 6 },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  insTag: {
    backgroundColor: '#F7F3EE', borderRadius: 8, paddingVertical: 3,
    paddingHorizontal: 10, borderWidth: 1, borderColor: '#E0DDD8',
  },
  insTagText: { fontSize: 12, color: '#3D3935', opacity: 0.6 },

  sharingSubtitle: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginBottom: 8 },
  sharingList: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#F0EDE8', overflow: 'hidden',
  },
  sharingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F7F3EE',
  },
  sharingIcon: { fontSize: 14, width: 20 },
  sharingLabel: { flex: 1, fontSize: 13, color: '#3D3935', fontWeight: '500' },
  noSharingText: { fontSize: 13, color: '#3D3935', opacity: 0.4, lineHeight: 19 },
  notSharedNote: { fontSize: 12, color: '#3D3935', opacity: 0.35, marginTop: 8, lineHeight: 17 },

  ctaSection: { gap: 10, marginTop: 4 },
  bookBtn: {
    backgroundColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  bookBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  connectBtn: {
    borderWidth: 1.5, borderColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  connectBtnDisabled: { opacity: 0.45 },
  connectBtnText: { fontSize: 15, fontWeight: '600', color: '#A8C5A0' },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  pendingText: { fontSize: 14, color: '#C9A84C', fontWeight: '500' },
  connectNote: {
    fontSize: 12, color: '#3D3935', opacity: 0.4,
    textAlign: 'center', lineHeight: 18, paddingHorizontal: 4,
  },
  bookingCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#C9A84C08', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#C9A84C20', marginBottom: 8,
  },
  bookingType: { fontSize: 13, fontWeight: '600', color: '#C9A84C', marginBottom: 2 },
  bookingNotes: { fontSize: 12, color: '#3D3935', opacity: 0.5, lineHeight: 16 },
});
