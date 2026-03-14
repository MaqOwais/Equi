import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth';
import { usePsychiatristsStore } from '../../stores/psychiatrists';
import { supabase } from '../../lib/supabase';
import type { Psychiatrist } from '../../types/database';

type AppointmentType = 'telehealth' | 'in_person';

export default function BookAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const psychiatristsStore = usePsychiatristsStore();

  // Find psychiatrist from store (already loaded by the time we get here)
  const psych = psychiatristsStore.all.find((p) => p.id === id) as Psychiatrist | undefined;

  const [appointmentType, setAppointmentType] = useState<AppointmentType | null>(
    psych?.offers_telehealth ? 'telehealth' : psych?.offers_in_person ? 'in_person' : null,
  );
  const [notes, setNotes] = useState('');
  const [includeSnapshot, setIncludeSnapshot] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!session?.user.id || !psych || !appointmentType) return;
    setSubmitting(true);

    const { error } = await supabase.from('bookings').insert({
      patient_id:          session.user.id,
      psychiatrist_id:     psych.id,
      appointment_type:    appointmentType,
      status:              'requested',
      notes:               notes.trim() || null,
      include_ai_snapshot: includeSnapshot,
    });

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'Could not send request. Please try again.');
      return;
    }

    Alert.alert(
      'Request sent',
      `Your appointment request has been sent to ${psych.name}. You'll be notified when they confirm.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  }

  if (!psych) {
    return (
      <SafeAreaView style={s.safe}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="#A8C5A0" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <View style={s.center}>
          <Text style={s.notFound}>Psychiatrist not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = appointmentType !== null && !submitting;

  return (
    <SafeAreaView style={s.safe}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color="#A8C5A0" />
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ── Psychiatrist mini-header ── */}
        <View style={s.psychRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{psych.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.psychName}>{psych.name}</Text>
            {psych.credentials && <Text style={s.psychCreds}>{psych.credentials}</Text>}
          </View>
          {psych.is_equi_partner && (
            <View style={s.partnerPill}>
              <Text style={s.partnerPillText}>⭐ Partner</Text>
            </View>
          )}
        </View>

        <Text style={s.pageTitle}>Request Appointment</Text>
        <Text style={s.pageSubtitle}>
          Your request is sent to {psych.name}. They'll confirm a time and you'll be notified.
        </Text>

        {/* ── Appointment type ── */}
        <Text style={s.label}>APPOINTMENT TYPE</Text>
        <View style={s.typeRow}>
          {psych.offers_telehealth && (
            <TouchableOpacity
              style={[s.typeChip, appointmentType === 'telehealth' && s.typeChipActive]}
              onPress={() => setAppointmentType('telehealth')}
              activeOpacity={0.8}
            >
              <Text style={[s.typeChipText, appointmentType === 'telehealth' && s.typeChipTextActive]}>
                📱  Telehealth
              </Text>
            </TouchableOpacity>
          )}
          {psych.offers_in_person && (
            <TouchableOpacity
              style={[s.typeChip, appointmentType === 'in_person' && s.typeChipActive]}
              onPress={() => setAppointmentType('in_person')}
              activeOpacity={0.8}
            >
              <Text style={[s.typeChipText, appointmentType === 'in_person' && s.typeChipTextActive]}>
                🏥  In-person
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Notes ── */}
        <Text style={s.label}>NOTES FOR YOUR PSYCHIATRIST</Text>
        <Text style={s.sublabel}>What would you like to discuss? (optional)</Text>
        <TextInput
          style={s.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. My sleep has been disrupted, medication side effects, next steps…"
          placeholderTextColor="#3D393540"
          multiline
          textAlignVertical="top"
          maxLength={600}
        />
        <Text style={s.charCount}>{notes.length}/600</Text>

        {/* ── AI Snapshot toggle ── */}
        <View style={s.snapshotCard}>
          <View style={s.snapshotLeft}>
            <Text style={s.snapshotTitle}>Include AI Wellness Snapshot</Text>
            <Text style={s.snapshotBody}>
              Sends a summary of your recent mood, sleep, and activity trends to {psych.name} with this request.
            </Text>
          </View>
          <Switch
            value={includeSnapshot}
            onValueChange={setIncludeSnapshot}
            trackColor={{ false: '#E0DDD8', true: '#A8C5A060' }}
            thumbColor={includeSnapshot ? '#A8C5A0' : '#BDBAB6'}
          />
        </View>

        {!psych.is_equi_partner && includeSnapshot && (
          <Text style={s.nonPartnerNote}>
            This psychiatrist is not an Equi Partner. Your snapshot will be sent as a PDF summary.
          </Text>
        )}

        {/* ── What happens next ── */}
        <View style={s.nextCard}>
          <Text style={s.nextTitle}>What happens next</Text>
          {[
            { icon: 'send-outline', text: `Your request goes to ${psych.name}` },
            { icon: 'calendar-outline', text: 'They confirm a date and time' },
            { icon: 'notifications-outline', text: 'You get a notification with the confirmed appointment' },
          ].map(({ icon, text }) => (
            <View key={icon} style={s.nextRow}>
              <Ionicons name={icon as never} size={15} color="#A8C5A0" />
              <Text style={s.nextText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <Text style={s.submitBtnText}>
            {submitting ? 'Sending…' : 'Send Request'}
          </Text>
        </TouchableOpacity>

        <Text style={s.footer}>
          Your data is never shared without your explicit consent. You control exactly what {psych.name} can see from Manage Access.
        </Text>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF8' },
  back: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4,
  },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 15, color: '#3D3935', opacity: 0.4 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  psychRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F0EDE8',
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, marginBottom: 20,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#A8C5A020', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#A8C5A0' },
  psychName: { fontSize: 15, fontWeight: '700', color: '#3D3935', marginBottom: 2 },
  psychCreds: { fontSize: 12, color: '#3D3935', opacity: 0.45 },
  partnerPill: {
    backgroundColor: '#C9A84C15', borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  partnerPillText: { fontSize: 10, fontWeight: '700', color: '#C9A84C', letterSpacing: 0.3 },

  pageTitle: { fontSize: 22, fontWeight: '700', color: '#3D3935', marginBottom: 6 },
  pageSubtitle: { fontSize: 14, color: '#3D3935', opacity: 0.5, lineHeight: 20, marginBottom: 24 },

  label: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.4,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
  },
  sublabel: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: -4, marginBottom: 8 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typeChip: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E0DDD8',
    backgroundColor: '#FFFFFF',
  },
  typeChipActive: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A010' },
  typeChipText: { fontSize: 14, color: '#3D3935', opacity: 0.5, fontWeight: '500' },
  typeChipTextActive: { color: '#A8C5A0', opacity: 1, fontWeight: '700' },

  notesInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E0DDD8',
    fontSize: 14, color: '#3D3935', lineHeight: 21,
    minHeight: 100, marginBottom: 4,
  },
  charCount: { fontSize: 11, color: '#3D3935', opacity: 0.3, textAlign: 'right', marginBottom: 24 },

  snapshotCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#F0EDE8',
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8,
  },
  snapshotLeft: { flex: 1 },
  snapshotTitle: { fontSize: 14, fontWeight: '600', color: '#3D3935', marginBottom: 4 },
  snapshotBody: { fontSize: 12, color: '#3D3935', opacity: 0.45, lineHeight: 17 },
  nonPartnerNote: {
    fontSize: 12, color: '#C9A84C', opacity: 0.8, lineHeight: 17, marginBottom: 0, marginTop: 0,
  },

  nextCard: {
    backgroundColor: '#F7F3EE', borderRadius: 14, padding: 16,
    marginTop: 24, marginBottom: 24, gap: 10,
  },
  nextTitle: { fontSize: 12, fontWeight: '700', color: '#3D3935', opacity: 0.5, marginBottom: 2, letterSpacing: 0.4 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nextText: { fontSize: 13, color: '#3D3935', opacity: 0.65, flex: 1 },

  submitBtn: {
    backgroundColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 14,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  footer: {
    fontSize: 11, color: '#3D3935', opacity: 0.3,
    textAlign: 'center', lineHeight: 16, paddingHorizontal: 8,
  },
});
