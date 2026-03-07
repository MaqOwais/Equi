/**
 * Privacy & Data Screen
 *
 * Two sections:
 *   1. Export my data — triggers export-user-data Edge Function, shows download link
 *   2. Delete my account — 30-day soft-delete with warning + confirmation
 *
 * GDPR / CCPA: user can always export or delete their full data set.
 */

import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import { supabase } from '../../../lib/supabase';

// ─── Export block ─────────────────────────────────────────────────────────────

function ExportBlock({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const fnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/export-user-data`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Export failed — try again later');
      const { url } = await res.json() as { url: string };
      setExportUrl(url);
      setLastExportAt(new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.block}>
      <Text style={s.blockTitle}>Export my data</Text>
      <Text style={s.blockBody}>
        Download everything Equi holds about you: mood logs, journal entries, cycle data,
        medications, sleep, activities, AI reports, and relapse signatures.
        Raw journal text is included in full — nothing is redacted.
      </Text>

      {lastExportAt && (
        <Text style={s.exportNote}>Last exported: {lastExportAt}</Text>
      )}

      {exportUrl ? (
        <View style={s.downloadRow}>
          <TouchableOpacity
            style={[s.actionBtn, { flex: 1 }]}
            onPress={() => Linking.openURL(exportUrl)}
          >
            <Text style={s.actionBtnText}>Open download link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.reExportBtn} onPress={handleExport}>
            <Text style={s.reExportText}>↺</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[s.actionBtn, loading && s.actionBtnDisabled]}
          onPress={handleExport}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
              <Text style={s.actionBtnText}>Preparing your export…</Text>
            </>
          ) : (
            <Text style={s.actionBtnText}>Export my data</Text>
          )}
        </TouchableOpacity>
      )}

      {error && <Text style={s.errorText}>{error}</Text>}

      <Text style={s.finePrint}>
        Download link expires in 24 hours. Your data will be packaged as a JSON file
        containing CSV and JSON sub-files, with a README explaining each section.
      </Text>
    </View>
  );
}

// ─── Deletion block ───────────────────────────────────────────────────────────

function DeletionBlock({ userId }: { userId: string }) {
  const { signOut } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  async function handleRequestDeletion() {
    Alert.alert(
      'Delete your account?',
      'Your account and all data will be permanently deleted in 30 days. ' +
      'You can cancel by signing back in before then.\n\n' +
      'This cannot be undone after the 30-day period.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Schedule deletion',
          style: 'destructive',
          onPress: confirmDeletion,
        },
      ],
    );
  }

  async function confirmDeletion() {
    setLoading(true);
    try {
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      await supabase
        .from('profiles')
        .update({ deletion_scheduled_at: deletionDate.toISOString() })
        .eq('id', userId);

      setScheduled(true);
      Alert.alert(
        'Deletion scheduled',
        'Your account will be deleted on ' +
        deletionDate.toLocaleDateString('en-GB', { dateStyle: 'long' }) +
        '. Sign in before then to cancel.',
        [{ text: 'OK' }],
      );
    } catch {
      Alert.alert('Error', 'Could not schedule deletion. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelDeletion() {
    setLoading(true);
    await supabase
      .from('profiles')
      .update({ deletion_scheduled_at: null })
      .eq('id', userId);
    setScheduled(false);
    setLoading(false);
  }

  return (
    <View style={[s.block, s.dangerBlock]}>
      <Text style={[s.blockTitle, s.dangerTitle]}>Delete my account</Text>
      <Text style={s.blockBody}>
        Permanently deletes your account and all associated data: mood logs, journal entries,
        cycle data, community posts, AI reports, sleep logs, and wearable connections.
        {'\n\n'}
        A 30-day grace period applies — you can cancel by signing back in.
        After 30 days, deletion is irreversible.
      </Text>

      {scheduled ? (
        <>
          <View style={s.scheduledBadge}>
            <Text style={s.scheduledText}>Deletion scheduled — 30 days remaining</Text>
          </View>
          <TouchableOpacity
            style={[s.actionBtn, s.cancelDeletionBtn, loading && s.actionBtnDisabled]}
            onPress={handleCancelDeletion}
            disabled={loading}
          >
            <Text style={[s.actionBtnText, { color: '#C4A0B0' }]}>Cancel scheduled deletion</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[s.deleteBtn, loading && s.actionBtnDisabled]}
          onPress={handleRequestDeletion}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#C4A0B0" size="small" />
          ) : (
            <Text style={s.deleteBtnText}>Request account deletion</Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={s.finePrint}>
        We comply with GDPR Art. 17 (Right to Erasure) and CCPA deletion rights.
        Questions? Contact privacy@equiapp.com
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PrivacyScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const userId = session?.user.id;

  if (!userId) return null;

  return (
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Privacy & Data</Text>
        <Text style={s.subtitle}>
          Your data belongs to you. Export or delete it at any time.
        </Text>

        {/* Privacy principles */}
        <View style={s.principlesCard}>
          {[
            ['🔒', 'Zero AI data retention — Groq does not store your data'],
            ['📵', 'Raw journal text is never sent to AI'],
            ['🤝', 'Psychiatrist data never shared without explicit consent'],
            ['📤', 'Data always exportable in full'],
            ['🗑️', 'Full deletion on request (30-day grace period)'],
          ].map(([icon, text]) => (
            <View key={text} style={s.principleRow}>
              <Text style={s.principleIcon}>{icon}</Text>
              <Text style={s.principleText}>{text}</Text>
            </View>
          ))}
        </View>

        <ExportBlock userId={userId} />

        <DeletionBlock userId={userId} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav: { paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },

  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#3D3935', opacity: 0.5, lineHeight: 20, marginBottom: 18 },

  principlesCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  principleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  principleIcon: { fontSize: 16, lineHeight: 22 },
  principleText: { fontSize: 13, color: '#3D3935', opacity: 0.65, flex: 1, lineHeight: 20 },

  block: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, marginBottom: 14,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  dangerBlock: { borderWidth: 1.5, borderColor: '#C4A0B020' },

  blockTitle: { fontSize: 16, fontWeight: '700', color: '#3D3935', marginBottom: 8 },
  dangerTitle: { color: '#C4A0B0' },
  blockBody: { fontSize: 13, color: '#3D3935', opacity: 0.6, lineHeight: 20, marginBottom: 16 },

  exportNote: {
    fontSize: 11, color: '#A8C5A0', opacity: 0.8, marginBottom: 10, fontStyle: 'italic',
  },

  downloadRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  reExportBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  reExportText: { fontSize: 20, color: '#3D3935', opacity: 0.4 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#A8C5A0', borderRadius: 12, paddingVertical: 13,
    marginBottom: 12,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  cancelDeletionBtn: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#C4A0B030',
  },

  deleteBtn: {
    borderWidth: 1.5, borderColor: '#C4A0B050', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginBottom: 12,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#C4A0B0' },

  scheduledBadge: {
    backgroundColor: '#C4A0B010', borderRadius: 8, padding: 10, marginBottom: 12,
  },
  scheduledText: { fontSize: 12, color: '#C4A0B0', fontWeight: '600', textAlign: 'center' },

  finePrint: {
    fontSize: 11, color: '#3D3935', opacity: 0.3, lineHeight: 16, marginTop: 4,
  },

  errorText: { fontSize: 13, color: '#C4A0B0', textAlign: 'center', marginTop: 4 },
});
