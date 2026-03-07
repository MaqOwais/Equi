import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { useAuthStore } from '../../stores/auth';

export default function NetworkScreen() {
  const { session } = useAuthStore();
  const [companionEmail, setCompanionEmail] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (!session) return;
    setSaving(true);

    // Companion invite
    if (companionEmail.trim()) {
      await db.from('companions').insert({
        patient_id: session.user.id,
        role: 'well_wisher',
        status: 'pending',
        invite_email: companionEmail.trim().toLowerCase(),
        share_mood_summaries: false,
        share_cycle_data: false,
        share_ai_report: false,
        share_medication: false,
      });
    }

    // Emergency contact
    if (emergencyName.trim() && emergencyPhone.trim()) {
      await db.from('emergency_contacts').insert({
        user_id: session.user.id,
        name: emergencyName.trim(),
        phone: emergencyPhone.trim(),
        contact_type: 'emergency',
      });
    }

    await db.from('profiles')
      .update({ onboarding_step: 'relapse' })
      .eq('id', session.user.id);

    setSaving(false);
    router.push('/(onboarding)/relapse-prompt');
  }

  async function handleSkip() {
    if (!session) return;
    await db.from('profiles')
      .update({ onboarding_step: 'relapse' })
      .eq('id', session.user.id);
    router.push('/(onboarding)/relapse-prompt');
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Who's in{'\n'}your corner?</Text>
          <Text style={s.sub}>
            Add people who support you — family, friends, or your therapist. They get their own app view. You control exactly what they can see.
          </Text>

          <Text style={s.sectionLabel}>COMPANION (OPTIONAL)</Text>
          <TextInput
            style={s.input}
            value={companionEmail}
            onChangeText={setCompanionEmail}
            placeholder="their@email.com"
            placeholderTextColor="#3D393550"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={s.inputHint}>They'll receive an invite and see only what you share.</Text>

          <View style={s.divider} />

          <Text style={s.sectionLabel}>EMERGENCY CONTACT (OPTIONAL)</Text>
          <Text style={s.sectionSub}>For Crisis Mode — tapped in one place when you need help fast.</Text>

          <TextInput
            style={s.input}
            value={emergencyName}
            onChangeText={setEmergencyName}
            placeholder="Name"
            placeholderTextColor="#3D393550"
          />
          <TextInput
            style={s.input}
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            placeholder="Phone number"
            placeholderTextColor="#3D393550"
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={[s.btn, saving && s.btnDisabled]}
            onPress={handleContinue}
            disabled={saving}
          >
            <Text style={s.btnText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip}>
            <Text style={s.skip}>Skip for now</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 28, paddingTop: 64, paddingBottom: 32 },
  title: { fontSize: 34, fontWeight: '700', color: '#3D3935', letterSpacing: -0.6, lineHeight: 42, marginBottom: 12 },
  sub: { fontSize: 14, color: '#3D3935', opacity: 0.45, lineHeight: 20, marginBottom: 36 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.4,
    letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase',
  },
  sectionSub: { fontSize: 13, color: '#3D3935', opacity: 0.4, marginBottom: 12, lineHeight: 18 },
  input: {
    borderBottomWidth: 1.5, borderBottomColor: '#E0DDD8',
    paddingVertical: 10, fontSize: 15, color: '#3D3935', marginBottom: 14,
  },
  inputHint: { fontSize: 12, color: '#3D3935', opacity: 0.35, marginBottom: 8, lineHeight: 17 },
  divider: { height: 1, backgroundColor: '#E8DCC8', marginVertical: 28 },
  btn: {
    backgroundColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 16,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#F7F3EE' },
  skip: { fontSize: 14, color: '#3D3935', opacity: 0.4, textAlign: 'center', paddingVertical: 8 },
});
