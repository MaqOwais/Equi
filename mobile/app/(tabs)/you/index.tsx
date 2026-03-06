import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import type { Diagnosis } from '../../../types/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIAGNOSIS_LABELS: Record<Diagnosis, string> = {
  bipolar_1: 'Bipolar I',
  bipolar_2: 'Bipolar II',
  cyclothymia: 'Cyclothymia',
  unsure: 'Unsure / Exploring',
};

function MenuItem({
  icon, label, sub, onPress,
}: { icon: string; label: string; sub?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.menuIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.menuLabel}>{label}</Text>
        {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
      </View>
      <Text style={s.menuChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function YouScreen() {
  const { session, profile, signOut } = useAuthStore();
  const router = useRouter();

  const displayName = profile?.display_name ?? session?.user.email?.split('@')[0] ?? 'You';
  const diagnosisLabel = profile?.diagnosis ? DIAGNOSIS_LABELS[profile.diagnosis] : null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={s.avatar}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitial}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={s.name}>{displayName}</Text>
          {diagnosisLabel && (
            <Text style={s.diagnosis}>{diagnosisLabel}</Text>
          )}
        </View>

        {/* Wellbeing tools */}
        <Text style={s.sectionLabel}>WELLBEING TOOLS</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon="🗓"
            label="Daily Routine"
            sub="IPSRT social rhythm anchors"
            onPress={() => router.push('/(tabs)/you/routine')}
          />
          <View style={s.divider} />
          <MenuItem
            icon="🥗"
            label="Nutrition"
            sub="Food quality — no calorie tracking"
            onPress={() => router.push('/(tabs)/you/nutrition')}
          />
        </View>

        {/* Settings */}
        <Text style={s.sectionLabel}>SETTINGS</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon="💊"
            label="Medication tracking"
            sub={profile?.track_medication ? 'Enabled' : 'Disabled'}
            onPress={() => {}}
          />
          <View style={s.divider} />
          <MenuItem
            icon="🔒"
            label="Privacy & data"
            sub="Export or delete your data"
            onPress={() => {}}
          />
          <View style={s.divider} />
          <MenuItem
            icon="🔔"
            label="Notifications"
            onPress={() => {}}
          />
        </View>

        {/* Upcoming */}
        <Text style={s.sectionLabel}>COMING SOON</Text>
        <View style={s.menuCard}>
          <MenuItem icon="⌚" label="Wearable sync" sub="Apple Health · Google Fit" onPress={() => {}} />
          <View style={s.divider} />
          <MenuItem icon="🤝" label="Support network" sub="Well-wishers & guardians" onPress={() => {}} />
          <View style={s.divider} />
          <MenuItem icon="🧠" label="Relapse signatures" sub="Early warning pattern builder" onPress={() => {}} />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 18, paddingTop: 20 },

  avatar: { alignItems: 'center', marginBottom: 28 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#A8C5A030', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  avatarInitial: { fontSize: 28, fontWeight: '700', color: '#A8C5A0' },
  name: { fontSize: 20, fontWeight: '700', color: '#3D3935', marginBottom: 4 },
  diagnosis: { fontSize: 13, color: '#3D3935', opacity: 0.4 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },

  menuCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: '#3D3935' },
  menuSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 1 },
  menuChevron: { fontSize: 20, color: '#3D3935', opacity: 0.2 },
  divider: { height: 1, backgroundColor: '#F0EDE8', marginLeft: 48 },

  signOutBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  signOutText: { fontSize: 14, color: '#3D3935', opacity: 0.35, fontWeight: '500' },
});
