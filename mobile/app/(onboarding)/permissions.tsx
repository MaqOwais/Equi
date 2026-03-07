import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { useAuthStore } from '../../stores/auth';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

async function requestNotificationPermission(): Promise<boolean> {
  if (IS_EXPO_GO) return false;  // expo-notifications unavailable in Expo Go

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    if (Platform.OS === 'android' && (Platform.Version as number) < 33) return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export default function PermissionsScreen() {
  const { session } = useAuthStore();
  const [notifDone, setNotifDone] = useState(false);
  const [healthDone, setHealthDone] = useState(false);

  async function handleAllowNotifications() {
    await requestNotificationPermission();
    setNotifDone(true);
  }

  function handleAllowHealth() {
    // Apple Health permission is requested the first time the user opens Sleep screen
    // Triggering it here would show a native prompt without context — better deferred
    setHealthDone(true);
  }

  async function handleFinish() {
    if (!session) return;
    await db.from('profiles')
      .update({
        onboarding_step: 'complete',
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.title}>A few quick{'\n'}permissions</Text>
        <Text style={s.sub}>Both are optional — the app works fully without them.</Text>

        {/* Notifications */}
        <View style={s.card}>
          <Text style={s.cardIcon}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Notifications</Text>
            <Text style={s.cardDesc}>
              Daily check-in reminders and early warning alerts. Sent only at your preferred times, never if you've already logged.
            </Text>
          </View>
          <TouchableOpacity
            style={[s.permBtn, notifDone && s.permBtnDone]}
            onPress={handleAllowNotifications}
            disabled={notifDone}
          >
            <Text style={[s.permBtnText, notifDone && s.permBtnTextDone]}>
              {notifDone ? 'Done' : 'Allow'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Apple Health / Google Fit */}
        <View style={s.card}>
          <Text style={s.cardIcon}>{Platform.OS === 'ios' ? '🍎' : '💚'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit'}</Text>
            <Text style={s.cardDesc}>
              Auto-import your sleep data. Manual entry always works — this just saves the step.
            </Text>
          </View>
          <TouchableOpacity
            style={[s.permBtn, healthDone && s.permBtnDone]}
            onPress={handleAllowHealth}
            disabled={healthDone}
          >
            <Text style={[s.permBtnText, healthDone && s.permBtnTextDone]}>
              {healthDone ? 'Done' : 'Allow'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={s.finishBtn} onPress={handleFinish} activeOpacity={0.85}>
          <Text style={s.finishBtnText}>Go to Equi</Text>
        </TouchableOpacity>

        <Text style={s.note}>
          You can update these anytime in Settings → Notifications.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 64, paddingBottom: 40 },
  title: { fontSize: 34, fontWeight: '700', color: '#3D3935', letterSpacing: -0.6, lineHeight: 42, marginBottom: 8 },
  sub: { fontSize: 14, color: '#3D3935', opacity: 0.45, marginBottom: 40, lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F0EDE8',
  },
  cardIcon: { fontSize: 24, marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#3D3935', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 18 },
  permBtn: {
    backgroundColor: '#A8C5A0', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'center',
  },
  permBtnDone: { backgroundColor: '#A8C5A015' },
  permBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  permBtnTextDone: { color: '#A8C5A0' },
  finishBtn: {
    backgroundColor: '#3D3935', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 16,
  },
  finishBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  note: { fontSize: 12, color: '#3D3935', opacity: 0.35, textAlign: 'center', lineHeight: 17 },
});
