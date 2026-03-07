import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, NativeSyntheticEvent, TextInputKeyPressEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { pendingEmail, pendingRole } = useAuthStore();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(45);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setResendCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function handleDigitChange(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (next.every(Boolean)) {
      verifyCode(next.join(''));
    }
  }

  function handleKeyPress(index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function verifyCode(code: string) {
    if (!pendingEmail) { router.replace('/(onboarding)/auth'); return; }
    setLoading(true);
    setError(null);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: code,
      type: 'email',
    });

    if (verifyError || !data.session) {
      setLoading(false);
      setError('Incorrect code. Check your email and try again.');
      setDigits(Array(CODE_LENGTH).fill(''));
      inputs.current[0]?.focus();
      return;
    }

    // Set user_role immediately after successful auth
    if (pendingRole) {
      await db
        .from('profiles')
        .update({ user_role: pendingRole, onboarding_step: 'diagnosis' })
        .eq('id', data.session.user.id);
    }

    setLoading(false);
    // Companion skips to a shorter flow
    if (pendingRole === 'companion') {
      router.replace('/(onboarding)/companion-connect');
    } else {
      router.replace('/(onboarding)/diagnosis');
    }
  }

  async function handleResend() {
    if (!pendingEmail || resendCountdown > 0) return;
    await supabase.auth.signInWithOtp({ email: pendingEmail });
    setResendCountdown(45);
  }

  return (
    <SafeAreaView style={s.safe}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Text style={s.backText}>←</Text>
      </TouchableOpacity>

      <View style={s.content}>
        <Text style={s.title}>Check your email</Text>
        <Text style={s.sub}>We sent a code to{'\n'}<Text style={s.email}>{pendingEmail}</Text></Text>

        {error && <Text style={s.error}>{error}</Text>}

        <View style={s.codeRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={[s.codeInput, d ? s.codeInputFilled : null]}
              value={d}
              onChangeText={(v) => handleDigitChange(i, v)}
              onKeyPress={(e) => handleKeyPress(i, e)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </View>

        {loading && (
          <View style={s.center}>
            <ActivityIndicator color="#A8C5A0" size="large" />
          </View>
        )}

        <TouchableOpacity onPress={handleResend} disabled={resendCountdown > 0}>
          <Text style={[s.resend, resendCountdown > 0 && s.resendDisabled]}>
            {resendCountdown > 0
              ? `Resend code in 0:${String(resendCountdown).padStart(2, '0')}`
              : "Didn't get it? Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  back: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  backText: { fontSize: 22, color: '#A8C5A0' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 36, paddingBottom: 32 },
  title: { fontSize: 34, fontWeight: '700', color: '#3D3935', letterSpacing: -0.6, marginBottom: 8 },
  sub: { fontSize: 15, color: '#3D3935', opacity: 0.5, marginBottom: 40, lineHeight: 22 },
  email: { fontWeight: '600', opacity: 1 },
  error: { fontSize: 14, color: '#C4A0B0', marginBottom: 16 },
  codeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 40 },
  codeInput: {
    width: 46, height: 58, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0DDD8',
    backgroundColor: '#FFFFFF', textAlign: 'center',
    fontSize: 22, fontWeight: '700', color: '#3D3935',
  },
  codeInputFilled: { borderColor: '#A8C5A0' },
  center: { alignItems: 'center', marginBottom: 20 },
  resend: { fontSize: 14, color: '#A8C5A0', fontWeight: '600', textAlign: 'center' },
  resendDisabled: { color: '#3D3935', opacity: 0.3, fontWeight: '400' },
});
