import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { DEV_MODE } from '../../constants/dev';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);
    if (authError) {
      setError('Incorrect email or password. Please try again.');
    }
    // On success: auth state change in _layout fires → splash routes to (tabs)
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Wave accent bar */}
          <View style={s.waveBar} />

          <View style={s.content}>
            <Text style={s.title}>Welcome back.</Text>
            <Text style={s.subtitle}>Sign in to continue your journey.</Text>

            {error && <Text style={s.error}>{error}</Text>}

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

            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#3D393580"
              secureTextEntry
            />

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={s.link}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.button, loading && s.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#F7F3EE" />
                : <Text style={s.buttonText}>Sign in</Text>
              }
            </TouchableOpacity>

            <View style={s.footer}>
              <Text style={s.footerText}>New to Equi? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
                <Text style={s.footerLink}>Create account</Text>
              </TouchableOpacity>
            </View>

            {DEV_MODE && (
              <TouchableOpacity
                style={s.devSkip}
                onPress={() => router.replace('/(tabs)')}
              >
                <Text style={s.devSkipText}>⚙ Dev: skip to app</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F3EE',
  },
  scroll: {
    flexGrow: 1,
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
    paddingTop: 48,
    paddingBottom: 32,
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
    marginBottom: 28,
  },
  link: {
    fontSize: 14,
    color: '#A8C5A0',
    marginBottom: 36,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#A8C5A0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F7F3EE',
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#3D3935',
    opacity: 0.5,
  },
  footerLink: {
    fontSize: 14,
    color: '#A8C5A0',
    fontWeight: '600',
  },
  devSkip: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  devSkipText: {
    fontSize: 13,
    color: '#3D393550',
  },
});
