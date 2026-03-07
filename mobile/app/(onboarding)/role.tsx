import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/auth';
import type { UserRole } from '../../types/database';

export default function RoleScreen() {
  const { setPendingRole } = useAuthStore();

  function choose(role: UserRole) {
    setPendingRole(role);
    router.push('/(onboarding)/auth');
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.title}>Who are you{'\n'}here for?</Text>

        <TouchableOpacity style={s.card} onPress={() => choose('patient')} activeOpacity={0.85}>
          <Text style={s.cardIcon}>◎</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>I'm tracking my own{'\n'}mental health</Text>
            <Text style={s.cardSub}>Patient · Self</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => choose('companion')} activeOpacity={0.85}>
          <Text style={s.cardIcon}>◎</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>I'm supporting{'\n'}someone I care about</Text>
            <Text style={s.cardSub}>Companion</Text>
          </View>
        </TouchableOpacity>

        <Text style={s.note}>
          Both paths use the same app. Your role can change anytime in Settings.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 72, paddingBottom: 32 },
  title: {
    fontSize: 36, fontWeight: '700', color: '#3D3935',
    letterSpacing: -0.8, lineHeight: 44, marginBottom: 48,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FFFFFF', borderRadius: 18,
    padding: 20, marginBottom: 14,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardIcon: { fontSize: 26, color: '#A8C5A0' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#3D3935', lineHeight: 22, marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#3D3935', opacity: 0.4 },
  note: {
    fontSize: 13, color: '#3D3935', opacity: 0.4, lineHeight: 19,
    textAlign: 'center', marginTop: 32, paddingHorizontal: 8,
  },
});
