import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth';

export default function OnboardingAuthScreen() {
  const { pendingEmail, setPendingEmail } = useAuthStore();
  const [email, setEmail] = useState(pendingEmail ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (otpError) {
      setError('Something went wrong. Please try again.');
      return;
    }

    setPendingEmail(trimmed);
    router.push('/(onboarding)/verify');
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>

        <View style={s.content}>
          <Text style={s.title}>Your email</Text>
          <Text style={s.sub}>We'll send a 6-digit code. No password needed.</Text>

          {error && <Text style={s.error}>{error}</Text>}

          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#3D393550"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          <TouchableOpacity
            style={[s.btn, (!email.trim() || loading) && s.btnDisabled]}
            onPress={handleContinue}
            disabled={!email.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={s.btnText}>Continue</Text>}
          </TouchableOpacity>

          <Text style={s.legal}>
            By continuing you agree to our{' '}
            <Text style={s.link}>Terms</Text> and{' '}
            <Text style={s.link}>Privacy Policy</Text>.
          </Text>

          <Text style={s.note}>
            Your data stays private. Your raw journal text is never shared or sent to AI.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  back: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  backText: { fontSize: 22, color: '#A8C5A0' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 36, paddingBottom: 32 },
  title: { fontSize: 34, fontWeight: '700', color: '#3D3935', letterSpacing: -0.6, marginBottom: 8 },
  sub: { fontSize: 15, color: '#3D3935', opacity: 0.5, marginBottom: 36, lineHeight: 22 },
  error: { fontSize: 14, color: '#C4A0B0', marginBottom: 12 },
  input: {
    borderBottomWidth: 1.5, borderBottomColor: '#A8C5A0',
    paddingVertical: 12, fontSize: 18, color: '#3D3935', marginBottom: 36,
  },
  btn: {
    backgroundColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 20,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  legal: { fontSize: 12, color: '#3D3935', opacity: 0.4, textAlign: 'center', lineHeight: 18 },
  link: { color: '#3D3935', opacity: 0.7, textDecorationLine: 'underline' },
  note: {
    fontSize: 12, color: '#3D3935', opacity: 0.35, textAlign: 'center',
    lineHeight: 18, marginTop: 16, paddingHorizontal: 12,
  },
});
