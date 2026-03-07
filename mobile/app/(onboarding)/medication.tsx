import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { useAuthStore } from '../../stores/auth';

const OPTIONS = [
  { value: true,  label: 'Yes — I take medication regularly' },
  { value: false, label: 'No — not currently' },
  { value: null,  label: "I'd rather not say" },
] as const;

export default function MedicationScreen() {
  const { session } = useAuthStore();

  async function choose(trackMedication: boolean | null) {
    if (!session) return;
    await db.from('profiles')
      .update({
        track_medication: trackMedication ?? false,
        onboarding_step: 'network',
      })
      .eq('id', session.user.id);
    router.push('/(onboarding)/network');
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.title}>Are you currently on medication for your diagnosis?</Text>
        <Text style={s.sub}>
          This controls whether the medication check-in appears on your Home screen. You can change this anytime in Settings.
        </Text>

        {OPTIONS.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={s.option}
            onPress={() => choose(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={s.optionText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 64, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '700', color: '#3D3935', letterSpacing: -0.5, lineHeight: 38, marginBottom: 12 },
  sub: { fontSize: 14, color: '#3D3935', opacity: 0.45, lineHeight: 20, marginBottom: 40 },
  option: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  optionText: { fontSize: 15, fontWeight: '500', color: '#3D3935' },
});
