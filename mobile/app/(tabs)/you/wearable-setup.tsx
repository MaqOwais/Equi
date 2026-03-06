import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import { useSleepStore } from '../../../stores/sleep';
import { isHealthKitAvailable, requestSleepPermissions } from '../../../lib/healthkit';

const QUALITY_LABELS = ['', 'Poorly', 'Light', 'OK', 'Good', 'Great'];
const QUALITY_COLORS = ['', '#C4A0B0', '#C4A0B0', '#E8DCC8', '#A8C5A0', '#A8C5A0'];

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatSyncTime(ts: string | null | undefined): string {
  if (!ts) return 'Never';
  const d = new Date(ts);
  const now = new Date();
  const diffH = Math.round((now.getTime() - d.getTime()) / 3_600_000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function WearableSetupScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const sleep = useSleepStore();
  const userId = session?.user.id;

  const [hkAvailable, setHkAvailable] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (userId) sleep.load(userId);
    isHealthKitAvailable().then(setHkAvailable);
  }, [userId]);

  const hkConnection = sleep.wearableConnections.find((c) => c.provider === 'healthkit');
  const hkConnected = !!hkConnection;

  const last7 = sleep.history.slice(0, 7);

  async function handleConnectHealthKit() {
    if (!userId) return;
    const granted = await requestSleepPermissions();
    if (!granted) {
      Alert.alert(
        'Permission required',
        'Please allow Equi to read sleep data in your iPhone Settings → Privacy & Security → Health.',
      );
      return;
    }
    await sleep.setWearableConnection(userId, 'healthkit', true);
    handleSyncNow();
  }

  async function handleDisconnectHealthKit() {
    if (!userId) return;
    Alert.alert(
      'Disconnect Apple Health?',
      'Your existing sleep logs will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => sleep.setWearableConnection(userId!, 'healthkit', false),
        },
      ],
    );
  }

  async function handleSyncNow() {
    if (!userId) return;
    setIsSyncing(true);
    const result = await sleep.syncFromHealthKit(userId);
    setIsSyncing(false);
    if (!result.synced && result.message !== 'Already synced for this date.') {
      Alert.alert('Sync result', result.message);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Wearable Sync</Text>
        <Text style={s.subtitle}>
          Connect a health platform to auto-import nightly sleep data.
        </Text>

        {/* Apple Health */}
        <View style={s.providerCard}>
          <View style={s.providerHeader}>
            <Text style={s.providerIcon}>🍎</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.providerName}>Apple Health</Text>
              <Text style={s.providerSub}>Sleep · HRV · Stages</Text>
            </View>
            {hkConnected && (
              <View style={s.connectedBadge}>
                <Text style={s.connectedBadgeText}>Connected</Text>
              </View>
            )}
          </View>

          {!hkAvailable && Platform.OS !== 'ios' && (
            <Text style={s.platformNote}>Available on iPhone only.</Text>
          )}
          {!hkAvailable && Platform.OS === 'ios' && (
            <Text style={s.platformNote}>
              Requires a native build. Run{' '}
              <Text style={s.platformNoteCode}>pod install</Text>
              {' '}and rebuild the app.
            </Text>
          )}

          {hkConnected && hkConnection && (
            <Text style={s.lastSync}>Last sync: {formatSyncTime(hkConnection.last_synced_at)}</Text>
          )}

          <View style={s.providerActions}>
            {hkConnected ? (
              <>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnPrimary, isSyncing && s.actionBtnDisabled]}
                  onPress={handleSyncNow}
                  disabled={isSyncing}
                >
                  {isSyncing
                    ? <ActivityIndicator color="#F7F3EE" size="small" />
                    : <Text style={s.actionBtnPrimaryText}>Sync now</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, s.actionBtnOutline]} onPress={handleDisconnectHealthKit}>
                  <Text style={s.actionBtnOutlineText}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnPrimary, !hkAvailable && s.actionBtnDisabled]}
                onPress={handleConnectHealthKit}
                disabled={!hkAvailable}
              >
                <Text style={s.actionBtnPrimaryText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Google Fit */}
        <View style={s.providerCard}>
          <View style={s.providerHeader}>
            <Text style={s.providerIcon}>🔵</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.providerName}>Google Fit</Text>
              <Text style={s.providerSub}>Sleep · Steps</Text>
            </View>
            <View style={s.comingSoonBadge}>
              <Text style={s.comingSoonText}>Coming soon</Text>
            </View>
          </View>
        </View>

        {/* Last 7 nights */}
        {last7.length > 0 && (
          <>
            <Text style={s.sectionLabel}>LAST 7 NIGHTS</Text>
            <View style={s.nightsCard}>
              {last7.map((log) => {
                const q = log.quality_score ?? 0;
                return (
                  <View key={log.date} style={s.nightRow}>
                    <Text style={s.nightDate}>
                      {new Date(log.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                    </Text>
                    <View style={s.nightBar}>
                      <View style={[s.nightBarFill, { width: `${(q / 5) * 100}%`, backgroundColor: QUALITY_COLORS[q] }]} />
                    </View>
                    <Text style={s.nightDuration}>{formatDuration(log.duration_minutes)}</Text>
                    <Text style={[s.nightQuality, { color: QUALITY_COLORS[q] }]}>{QUALITY_LABELS[q]}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* What we read */}
        <Text style={s.sectionLabel}>WHAT WE READ</Text>
        <View style={s.accessCard}>
          {[
            { icon: '✓', label: 'Sleep duration' },
            { icon: '✓', label: 'Sleep stages (if available)' },
            { icon: '✓', label: 'Resting heart rate' },
            { icon: '✗', label: 'Location  (never)' },
            { icon: '✗', label: 'Call or message logs  (never)' },
          ].map((item) => (
            <View key={item.label} style={s.accessRow}>
              <Text style={[s.accessIcon, item.icon === '✓' ? s.accessYes : s.accessNo]}>
                {item.icon}
              </Text>
              <Text style={[s.accessLabel, item.icon === '✗' && s.accessLabelNo]}>
                {item.label}
              </Text>
            </View>
          ))}
          <Text style={s.accessNote}>
            All data stays in your private Supabase account. Nothing is sent to the AI — only derived signals (duration, quality score) are used in reports.
          </Text>
        </View>

        {/* Manual fallback note */}
        <View style={s.manualNote}>
          <Text style={s.manualNoteText}>
            No wearable? Equi shows a quick sleep prompt each morning until you log manually.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav: { paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },

  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#3D3935', opacity: 0.45, lineHeight: 20, marginBottom: 20 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },

  providerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  providerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  providerIcon: { fontSize: 24, marginRight: 12 },
  providerName: { fontSize: 15, fontWeight: '600', color: '#3D3935' },
  providerSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2 },

  connectedBadge: {
    backgroundColor: '#A8C5A020', borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  connectedBadgeText: { fontSize: 12, color: '#A8C5A0', fontWeight: '600' },

  comingSoonBadge: {
    backgroundColor: '#E8DCC830', borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  comingSoonText: { fontSize: 12, color: '#3D3935', opacity: 0.35, fontWeight: '500' },

  lastSync: { fontSize: 12, color: '#3D3935', opacity: 0.35, marginBottom: 12 },
  platformNote: { fontSize: 12, color: '#C4A0B0', opacity: 0.8, lineHeight: 18, marginBottom: 12 },
  platformNoteCode: { fontFamily: 'monospace', backgroundColor: '#F0EDE8' },

  providerActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnPrimary: { backgroundColor: '#A8C5A0' },
  actionBtnPrimaryText: { fontSize: 14, fontWeight: '600', color: '#F7F3EE' },
  actionBtnOutline: { borderWidth: 1.5, borderColor: '#E0DDD8' },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '500', color: '#3D3935', opacity: 0.6 },
  actionBtnDisabled: { opacity: 0.4 },

  nightsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    gap: 12,
  },
  nightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nightDate: { fontSize: 12, color: '#3D3935', opacity: 0.5, width: 52 },
  nightBar: {
    flex: 1, height: 6, backgroundColor: '#F0EDE8', borderRadius: 3, overflow: 'hidden',
  },
  nightBarFill: { height: 6, borderRadius: 3 },
  nightDuration: { fontSize: 12, color: '#3D3935', opacity: 0.5, width: 40, textAlign: 'right' },
  nightQuality: { fontSize: 12, fontWeight: '500', width: 44 },

  accessCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  accessIcon: { fontSize: 13, fontWeight: '700', width: 14 },
  accessYes: { color: '#A8C5A0' },
  accessNo: { color: '#C4A0B0' },
  accessLabel: { fontSize: 13, color: '#3D3935', opacity: 0.65 },
  accessLabelNo: { opacity: 0.35 },
  accessNote: {
    fontSize: 12, color: '#3D3935', opacity: 0.35,
    lineHeight: 18, marginTop: 8, borderTopWidth: 1,
    borderTopColor: '#F0EDE8', paddingTop: 10,
  },

  manualNote: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 16,
  },
  manualNoteText: { fontSize: 13, color: '#3D3935', opacity: 0.4, lineHeight: 18 },
});
