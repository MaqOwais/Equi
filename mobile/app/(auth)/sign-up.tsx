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

export default function SignUp() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    if (!displayName.trim() || !email.trim() || !password) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    // Update display_name in profiles row (created by DB trigger)
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', data.user.id);
    }

    setLoading(false);
    router.replace('/(auth)/onboarding');
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.waveBar} />

          <View style={s.content}>
            <TouchableOpacity style={s.back} onPress={() => router.back()}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>

            <Text style={s.title}>Create account.</Text>
            <Text style={s.subtitle}>Start finding your equilibrium.</Text>

            {error && <Text style={s.error}>{error}</Text>}

            <Text style={s.label}>Your name</Text>
            <TextInput
              style={s.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="What should we call you?"
              placeholderTextColor="#3D393580"
              autoCapitalize="words"
            />

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
              placeholder="At least 8 characters"
              placeholderTextColor="#3D393580"
              secureTextEntry
            />

            <TouchableOpacity
              style={[s.button, loading && s.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#F7F3EE" />
                : <Text style={s.buttonText}>Create account</Text>
              }
            </TouchableOpacity>

            <View style={s.footer}>
              <Text style={s.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
                <Text style={s.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#A8C5A0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
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
});
