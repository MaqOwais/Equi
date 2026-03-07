import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { useAuthStore } from '../../stores/auth';

export default function RelapsePromptScreen() {
  const { session } = useAuthStore();

  async function goToBuilder() {
    if (!session) return;
    await db.from('profiles')
      .update({ onboarding_step: 'permissions' })
      .eq('id', session.user.id);
    // Go to the relapse signature builder, then return to permissions
    router.push('/(tabs)/you/relapse-signature');
  }

  async function handleSkip() {
    if (!session) return;
    await db.from('profiles')
      .update({ onboarding_step: 'permissions' })
      .eq('id', session.user.id);
    router.push('/(onboarding)/permissions');
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <View style={s.iconContainer}>
          <Text style={s.icon}>◈</Text>
        </View>

        <Text style={s.title}>Your personal warning signs</Text>
        <Text style={s.body}>
          Most people with bipolar disorder experience the same 1–3 warning signs before each episode — unique to them.
        </Text>
        <Text style={s.body}>
          Setting these up now means Equi can flag them early.
        </Text>

        <TouchableOpacity style={s.primaryBtn} onPress={goToBuilder} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>Set up now (5 min)</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip}>
          <Text style={s.skip}>Set up later in You → Relapse Signatures</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48 },
  iconContainer: { marginBottom: 32 },
  icon: { fontSize: 40, color: '#C9A84C' },
  title: { fontSize: 30, fontWeight: '700', color: '#3D3935', letterSpacing: -0.5, lineHeight: 38, marginBottom: 20 },
  body: { fontSize: 15, color: '#3D3935', opacity: 0.55, lineHeight: 23, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginTop: 40, marginBottom: 18,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#F7F3EE' },
  skip: {
    fontSize: 14, color: '#3D3935', opacity: 0.4,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: 16,
  },
});
