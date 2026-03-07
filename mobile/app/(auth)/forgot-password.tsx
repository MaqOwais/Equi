import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
    );

    setLoading(false);
    if (resetError) {
      setError('Something went wrong. Please try again.');
    } else {
      setSent(true);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={s.waveBar} />

        <View style={s.content}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={s.title}>Reset password.</Text>
          <Text style={s.subtitle}>
            Enter your email and we'll send you a reset link.
          </Text>

          {error && <Text style={s.error}>{error}</Text>}

          {sent ? (
            <View style={s.sentBox}>
              <Text style={s.sentTitle}>Check your inbox.</Text>
              <Text style={s.sentBody}>
                We've sent a password reset link to {email.trim()}.
              </Text>
              <TouchableOpacity
                style={s.button}
                onPress={() => router.replace('/(auth)/sign-in')}
              >
                <Text style={s.buttonText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#3D393580"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[s.button, loading && s.buttonDisabled]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={s.buttonText}>Send reset link</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  waveBar: {
    height: 6,
    backgroundColor: '#A8C5A0',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
  },
  back: {
    marginBottom: 28,
  },
  backText: {
    fontSize: 15,
    color: '#A8C5A0',
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3D3935',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#3D3935',
    opacity: 0.5,
    marginBottom: 40,
  },
  error: {
    fontSize: 14,
    color: '#C4A0B0',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3935',
    opacity: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#A8C5A0',
    paddingVertical: 10,
    fontSize: 16,
    color: '#3D3935',
    marginBottom: 36,
  },
  button: {
    backgroundColor: '#A8C5A0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  sentBox: {
    flex: 1,
    justifyContent: 'center',
  },
  sentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3D3935',
    marginBottom: 10,
  },
  sentBody: {
    fontSize: 15,
    color: '#3D3935',
    opacity: 0.6,
    lineHeight: 22,
    marginBottom: 36,
  },
});
