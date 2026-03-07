import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

        {/* Logo mark */}
        <View style={s.logoMark}>
          <View style={s.logoOuter}>
            <View style={s.logoInner} />
          </View>
        </View>

        <Text style={s.title}>Who are you{'\n'}here for?</Text>
        <Text style={s.subtitle}>Equi adapts to your role — you can change this anytime.</Text>

        {/* Patient card */}
        <TouchableOpacity
          style={[s.card, s.cardPatient]}
          onPress={() => choose('patient')}
          activeOpacity={0.82}
        >
          <View style={[s.iconWrap, s.iconWrapPatient]}>
            <Ionicons name="person" size={24} color="#A8C5A0" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>I'm managing my{'\n'}own mental health</Text>
            <Text style={s.cardSub}>Track moods · log cycles · get AI insights</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A8C5A0" style={{ opacity: 0.7 }} />
        </TouchableOpacity>

        {/* Companion card */}
        <TouchableOpacity
          style={[s.card, s.cardCompanion]}
          onPress={() => choose('companion')}
          activeOpacity={0.82}
        >
          <View style={[s.iconWrap, s.iconWrapCompanion]}>
            <Ionicons name="heart" size={24} color="#89B4CC" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>I'm supporting{'\n'}someone I care about</Text>
            <Text style={s.cardSub}>Stay connected · receive check-in updates</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#89B4CC" style={{ opacity: 0.7 }} />
        </TouchableOpacity>

        <Text style={s.note}>
          Your privacy is protected. Companions only see what you choose to share.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 52, paddingBottom: 32 },

  logoMark: { alignItems: 'center', marginBottom: 36 },
  logoOuter: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#A8C5A020',
    alignItems: 'center', justifyContent: 'center',
  },
  logoInner: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#A8C5A0',
  },

  title: {
    fontSize: 34, fontWeight: '700', color: '#3D3935',
    letterSpacing: -0.8, lineHeight: 42, marginBottom: 10,
  },
  subtitle: {
    fontSize: 15, color: '#3D3935', opacity: 0.45,
    lineHeight: 21, marginBottom: 36,
  },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 20, padding: 20, marginBottom: 14,
    borderWidth: 1.5,
  },
  cardPatient: {
    backgroundColor: '#A8C5A008',
    borderColor: '#A8C5A040',
  },
  cardCompanion: {
    backgroundColor: '#89B4CC08',
    borderColor: '#89B4CC40',
  },

  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapPatient: { backgroundColor: '#A8C5A018' },
  iconWrapCompanion: { backgroundColor: '#89B4CC18' },

  cardTitle: { fontSize: 16, fontWeight: '600', color: '#3D3935', lineHeight: 22, marginBottom: 5 },
  cardSub: { fontSize: 12, color: '#3D3935', opacity: 0.45, lineHeight: 17 },

  note: {
    fontSize: 13, color: '#3D3935', opacity: 0.38, lineHeight: 19,
    textAlign: 'center', marginTop: 'auto', paddingHorizontal: 8, paddingTop: 24,
  },
});
