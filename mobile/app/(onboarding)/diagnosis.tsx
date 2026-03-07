import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { useAuthStore } from '../../stores/auth';
import type { Diagnosis } from '../../types/database';

const OPTIONS: { value: Diagnosis; label: string; desc: string }[] = [
  { value: 'bipolar_1', label: 'Bipolar I', desc: 'Distinct manic episodes' },
  { value: 'bipolar_2', label: 'Bipolar II', desc: 'Hypomanic + depressive' },
  { value: 'cyclothymia', label: 'Cyclothymia', desc: 'Milder mood cycling' },
  { value: 'unsure', label: 'Still figuring it out', desc: 'Exploring or recently diagnosed' },
];

export default function DiagnosisScreen() {
  const { session } = useAuthStore();
  const [selected, setSelected] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(false);

  async function advance(diagnosis: Diagnosis | null) {
    if (!session) return;
    setLoading(true);
    await db.from('profiles')
      .update({ diagnosis, onboarding_step: 'medication' })
      .eq('id', session.user.id);
    setLoading(false);
    router.push('/(onboarding)/medication');
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.title}>Which best{'\n'}describes you?</Text>
        <Text style={s.sub}>
          This helps us personalise your experience. Your diagnosis is private and never shared automatically.
        </Text>

        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.option, selected === opt.value && s.optionSelected]}
            onPress={() => setSelected(opt.value)}
            activeOpacity={0.8}
          >
            <View style={[s.radio, selected === opt.value && s.radioSelected]}>
              {selected === opt.value && <View style={s.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.optionLabel}>{opt.label}</Text>
              <Text style={s.optionDesc}>{opt.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[s.btn, (!selected || loading) && s.btnDisabled]}
          onPress={() => selected && advance(selected)}
          disabled={!selected || loading}
        >
          <Text style={s.btnText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => advance(null)}>
          <Text style={s.skip}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 64, paddingBottom: 32 },
  title: { fontSize: 34, fontWeight: '700', color: '#3D3935', letterSpacing: -0.6, lineHeight: 42, marginBottom: 12 },
  sub: { fontSize: 14, color: '#3D3935', opacity: 0.45, lineHeight: 20, marginBottom: 36 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  optionSelected: { borderColor: '#A8C5A0', backgroundColor: '#FFFFFF' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#D0CCC8',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#A8C5A0' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#A8C5A0' },
  optionLabel: { fontSize: 15, fontWeight: '600', color: '#3D3935', marginBottom: 2 },
  optionDesc: { fontSize: 13, color: '#3D3935', opacity: 0.4 },
  btn: {
    backgroundColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 28, marginBottom: 16,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  skip: { fontSize: 14, color: '#3D3935', opacity: 0.4, textAlign: 'center', paddingVertical: 8 },
});
