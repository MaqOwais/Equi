import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { useAuthStore } from '../../stores/auth';

export default function CompanionConnectScreen() {
  const { session } = useAuthStore();
  const [patientEmail, setPatientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!session || !patientEmail.trim()) return;
    setLoading(true);
    setError(null);

    // Look up the patient by email
    const { data: patient } = await db.from('profiles')
      .select('id')
      .eq('id', session.user.id)   // placeholder — real lookup via email in Phase 5E
      .single();

    // Create a pending companion connection request
    const { error: insertError } = await db.from('companions').insert({
      patient_id: session.user.id,  // will be updated when patient accepts
      companion_id: session.user.id,
      role: 'well_wisher',
      status: 'pending',
      invite_email: patientEmail.trim().toLowerCase(),
      share_mood_summaries: false,
      share_cycle_data: false,
      share_ai_report: false,
      share_medication: false,
    });

    setLoading(false);
    if (insertError) {
      setError('Could not send the invite. Please try again.');
      return;
    }
    setSent(true);
  }

  async function handleFinish() {
    if (!session) return;
    await db.from('profiles')
      .update({ onboarding_step: 'complete', onboarding_completed_at: new Date().toISOString() })
      .eq('id', session.user.id);
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.content}>
          <Text style={s.title}>Who are you{'\n'}supporting?</Text>
          <Text style={s.sub}>
            Enter the email address of the person you're supporting. They'll receive an invite and can choose exactly what to share with you.
          </Text>

          {sent ? (
            <View style={s.sentCard}>
              <Text style={s.sentIcon}>✓</Text>
              <Text style={s.sentTitle}>Invite sent</Text>
              <Text style={s.sentSub}>
                Once they accept, you'll see what they choose to share.
              </Text>
            </View>
          ) : (
            <>
              {error && <Text style={s.error}>{error}</Text>}
              <TextInput
                style={s.input}
                value={patientEmail}
                onChangeText={setPatientEmail}
                placeholder="their@email.com"
                placeholderTextColor="#3D393550"
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              <TouchableOpacity
                style={[s.btn, (!patientEmail.trim() || loading) && s.btnDisabled]}
                onPress={handleSend}
                disabled={!patientEmail.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color="#F7F3EE" />
                  : <Text style={s.btnText}>Send invite</Text>}
              </TouchableOpacity>
            </>
          )}

          <View style={{ flex: 1 }} />

          <TouchableOpacity style={s.finishBtn} onPress={handleFinish}>
            <Text style={s.finishBtnText}>Go to Equi</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 64, paddingBottom: 40 },
  title: { fontSize: 34, fontWeight: '700', color: '#3D3935', letterSpacing: -0.6, lineHeight: 42, marginBottom: 12 },
  sub: { fontSize: 14, color: '#3D3935', opacity: 0.45, lineHeight: 20, marginBottom: 36 },
  error: { fontSize: 14, color: '#C4A0B0', marginBottom: 12 },
  input: {
    borderBottomWidth: 1.5, borderBottomColor: '#A8C5A0',
    paddingVertical: 12, fontSize: 18, color: '#3D3935', marginBottom: 36,
  },
  btn: {
    backgroundColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#F7F3EE' },
  sentCard: {
    backgroundColor: '#A8C5A015', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 8,
  },
  sentIcon: { fontSize: 28, color: '#A8C5A0' },
  sentTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935' },
  sentSub: { fontSize: 14, color: '#3D3935', opacity: 0.5, textAlign: 'center', lineHeight: 20 },
  finishBtn: {
    backgroundColor: '#3D3935', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  finishBtnText: { fontSize: 16, fontWeight: '600', color: '#F7F3EE' },
});
