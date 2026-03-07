import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../lib/supabase';
import type { Psychiatrist, PsychiatristConnection } from '../../types/database';

export default function PsychiatristProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [psych, setPsych] = useState<Psychiatrist | null>(null);
  const [connection, setConnection] = useState<PsychiatristConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([loadPsychiatrist(), loadConnection()]).finally(() =>
      setIsLoading(false),
    );
  }, [id]);

  async function loadPsychiatrist() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('psychiatrists_public')
      .select('*')
      .eq('id', id)
      .single();
    if (data) setPsych(data as Psychiatrist);
  }

  async function loadConnection() {
    if (!userId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('psychiatrist_connections')
      .select('*')
      .eq('patient_id', userId)
      .eq('psychiatrist_id', id)
      .maybeSingle();
    if (data) setConnection(data as PsychiatristConnection);
  }

  async function handleConnect() {
    if (!userId || !psych) return;
    setConnecting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('psychiatrist_connections').insert({
      patient_id: userId,
      psychiatrist_id: psych.id,
      status: 'requested',
      share_ai_report: false,
      share_medication: false,
      share_cycle_data: false,
    });
    await loadConnection();
    setConnecting(false);
  }

  function handleBook() {
    if (!psych?.calendly_username) {
      Alert.alert('Booking unavailable', 'This psychiatrist has not set up online booking. Contact them directly.');
      return;
    }
    const name = session?.user.user_metadata?.full_name ?? '';
    const email = session?.user.email ?? '';
    const url = `https://calendly.com/${psych.calendly_username}?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
    Linking.openURL(url);
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
        <View style={s.center}><Text style={s.notFound}>Psychiatrist not found.</Text></View>
      </SafeAreaView>
    );
  }

  const isConnected = connection?.status === 'accepted';
  const isPending = connection?.status === 'requested';

  return (
    <SafeAreaView style={s.safe}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Text style={s.backText}>←  Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
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
          <Text style={s.location}>
            {[psych.location_city, psych.location_state].filter(Boolean).join(', ')}
          </Text>

          <View style={s.modeRow}>
            {psych.offers_telehealth && <View style={s.modeChip}><Text style={s.modeText}>📱 Telehealth</Text></View>}
            {psych.offers_in_person && <View style={s.modeChip}><Text style={s.modeText}>🏥 In-person</Text></View>}
          </View>
        </View>

        {/* About */}
        {psych.bio && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ABOUT</Text>
            <Text style={s.body}>{psych.bio}</Text>
          </View>
        )}

        {/* Insurance */}
        {(psych.insurance_accepted?.length || psych.sliding_scale) ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>INSURANCE</Text>
            <Text style={s.body}>
              {[...(psych.insurance_accepted ?? []), psych.sliding_scale ? 'Sliding scale ✓' : '']
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text style={s.disclaimer}>Self-reported — check your plan directly.</Text>
          </View>
        ) : null}

        {/* Equi Partner section */}
        {psych.is_equi_partner && (
          <View style={s.partnerSection}>
            <Text style={s.sectionTitle}>EQUI PARTNER</Text>
            <Text style={s.body}>
              Understands Equi's monitoring approach and can receive your AI Wellness Report before appointments.
            </Text>
            {psych.activity_prescribing_enabled && (
              <Text style={s.body}>
                Can prescribe activities directly to your Activities tab.
              </Text>
            )}
          </View>
        )}

        {/* CTAs */}
        <View style={s.ctaSection}>
          <TouchableOpacity style={s.bookBtn} onPress={handleBook} activeOpacity={0.85}>
            <Text style={s.bookBtnText}>Book Appointment</Text>
          </TouchableOpacity>

          {isConnected ? (
            <View style={s.connectedBadge}>
              <Text style={s.connectedText}>✓ Connected</Text>
            </View>
          ) : isPending ? (
            <View style={s.pendingBadge}>
              <Text style={s.pendingText}>Connection pending</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.connectBtn, connecting && s.connectBtnDisabled]}
              onPress={handleConnect}
              disabled={connecting}
            >
              <Text style={s.connectBtnText}>Connect</Text>
            </TouchableOpacity>
          )}

          {isConnected && (
            <Text style={s.shareNote}>
              Share your AI report with this psychiatrist from the AI Wellness Report screen.
            </Text>
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  back: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 15, color: '#3D3935', opacity: 0.4 },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },

  header: { alignItems: 'center', paddingVertical: 24 },
  partnerBadge: {
    backgroundColor: '#C9A84C15', borderRadius: 8, paddingVertical: 4,
    paddingHorizontal: 12, marginBottom: 16,
  },
  partnerBadgeText: { fontSize: 11, fontWeight: '700', color: '#C9A84C', letterSpacing: 0.4 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#A8C5A020', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#A8C5A0' },
  name: { fontSize: 22, fontWeight: '700', color: '#3D3935', marginBottom: 4, textAlign: 'center' },
  credentials: { fontSize: 13, color: '#3D3935', opacity: 0.5, marginBottom: 4, textAlign: 'center' },
  location: { fontSize: 13, color: '#3D3935', opacity: 0.4, marginBottom: 14 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: { backgroundColor: '#F7F3EE', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  modeText: { fontSize: 12, color: '#3D3935', opacity: 0.6 },

  section: { marginBottom: 24 },
  partnerSection: {
    backgroundColor: '#C9A84C0C', borderRadius: 14, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#C9A84C20',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.4,
    letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase',
  },
  body: { fontSize: 14, color: '#3D3935', opacity: 0.65, lineHeight: 21, marginBottom: 6 },
  disclaimer: { fontSize: 11, color: '#3D3935', opacity: 0.3, marginTop: 4 },

  ctaSection: { gap: 12 },
  bookBtn: {
    backgroundColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  bookBtnText: { fontSize: 16, fontWeight: '600', color: '#F7F3EE' },
  connectBtn: {
    borderWidth: 1.5, borderColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  connectBtnDisabled: { opacity: 0.45 },
  connectBtnText: { fontSize: 15, fontWeight: '600', color: '#A8C5A0' },
  connectedBadge: { alignItems: 'center', paddingVertical: 10 },
  connectedText: { fontSize: 14, color: '#A8C5A0', fontWeight: '600' },
  pendingBadge: { alignItems: 'center', paddingVertical: 10 },
  pendingText: { fontSize: 14, color: '#3D3935', opacity: 0.4 },
  shareNote: {
    fontSize: 13, color: '#3D3935', opacity: 0.4, textAlign: 'center',
    lineHeight: 18, paddingHorizontal: 8,
  },
});
