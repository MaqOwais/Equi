/**
 * ExportSheet
 *
 * Bottom sheet modal for exporting or sharing the AI Wellness Report PDF.
 *
 * Options:
 *   1. Save to device — downloads PDF → opens native share sheet (Files, AirDrop, etc.)
 *   2. Share with companion — generates 7-day signed URL + records in report_shares
 *   3. Copy link — generates 7-day signed URL → copies to clipboard
 *
 * Usage:
 *   <ExportSheet
 *     visible={showExport}
 *     onClose={() => setShowExport(false)}
 *     userId={userId}
 *     reportId={reportId}
 *     period="24 Feb – 1 Mar 2026"
 *   />
 */

import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Pressable, ActivityIndicator, Clipboard,
} from 'react-native';
import { useAIStore } from '../../stores/ai';
import { supabase } from '../../lib/supabase';
import type { Companion } from '../../types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  reportId: string;
  period: string;
}

interface CompanionRow {
  id: string;
  invite_email: string | null;
  role: Companion['role'];
  share_ai_report: boolean;
  status: Companion['status'];
}

export function ExportSheet({ visible, onClose, userId, reportId, period }: Props) {
  const store = useAIStore();
  const [companions, setCompanions] = useState<CompanionRow[]>([]);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Load companions who have share_ai_report = true
  useEffect(() => {
    if (!visible) return;
    supabase
      .from('companions')
      .select('id, invite_email, role, share_ai_report, status')
      .eq('patient_id', userId)
      .eq('status', 'accepted')
      .eq('share_ai_report', true)
      .then(({ data }) => setCompanions((data ?? []) as CompanionRow[]));
  }, [visible, userId]);

  async function handleSaveToDevice() {
    const url = await store.exportPdf(userId, reportId);
    if (url) setShareUrl(url);
  }

  async function handleShareWith(companionId: string) {
    setSharingId(companionId);
    await store.shareWithCompanion(userId, reportId, companionId);
    setSharingId(null);
  }

  async function handleCopyLink() {
    // Reuse a previously generated URL or generate a fresh 7-day one
    let url = shareUrl;
    if (!url) {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const fnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-report-pdf`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ report_id: reportId, share_ttl_seconds: 604800 }),
      });
      if (res.ok) {
        const json = await res.json() as { url: string };
        url = json.url;
        setShareUrl(url);
      }
    }
    if (url) {
      Clipboard.setString(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  }

  const roleLabel = (role: Companion['role']) =>
    role === 'guardian' ? 'Guardian' : 'Well-wisher';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose} />

      <View style={s.sheet}>
        {/* Header */}
        <View style={s.handle} />
        <Text style={s.title}>Export Report</Text>
        <Text style={s.period}>{period}</Text>

        {/* Preview card */}
        <View style={s.previewCard}>
          <Text style={s.previewEmoji}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.previewTitle}>AI Wellness Report PDF</Text>
            <Text style={s.previewSub}>4-page clinical summary · Generated now</Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={s.sectionLabel}>SHARE WITH</Text>

        {/* Save to device */}
        <TouchableOpacity
          style={s.optionRow}
          onPress={handleSaveToDevice}
          disabled={store.isExporting}
          activeOpacity={0.7}
        >
          <Text style={s.optionIcon}>👤</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.optionLabel}>Save to device</Text>
            <Text style={s.optionSub}>Opens share sheet — Files, AirDrop, email</Text>
          </View>
          {store.isExporting ? (
            <ActivityIndicator color="#A8C5A0" size="small" />
          ) : (
            <Text style={s.optionChevron}>›</Text>
          )}
        </TouchableOpacity>

        {/* Companions with share_ai_report = true */}
        {companions.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={s.optionRow}
            onPress={() => handleShareWith(c.id)}
            disabled={sharingId === c.id}
            activeOpacity={0.7}
          >
            <Text style={s.optionIcon}>{c.role === 'guardian' ? '🛡️' : '🤝'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.optionLabel}>{c.invite_email ?? 'Companion'}</Text>
              <Text style={s.optionSub}>{roleLabel(c.role)} · Sends secure link (7 days)</Text>
            </View>
            {sharingId === c.id ? (
              <ActivityIndicator color="#A8C5A0" size="small" />
            ) : (
              <Text style={s.optionChevron}>›</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Copy link */}
        <TouchableOpacity
          style={s.optionRow}
          onPress={handleCopyLink}
          activeOpacity={0.7}
        >
          <Text style={s.optionIcon}>🔗</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.optionLabel, linkCopied && { color: '#A8C5A0' }]}>
              {linkCopied ? 'Link copied!' : 'Copy link'}
            </Text>
            <Text style={s.optionSub}>Expires in 7 days</Text>
          </View>
          <Text style={s.optionChevron}>{linkCopied ? '✓' : '›'}</Text>
        </TouchableOpacity>

        {/* Privacy note */}
        <Text style={s.privacyNote}>
          🔒  Links are read-only and expire automatically. Raw journal entries are never included.
        </Text>

        {/* Cancel */}
        <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: '#3D393540',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#3D393520',
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#3D3935', marginBottom: 2 },
  period: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginBottom: 16 },

  previewCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 14, marginBottom: 20, gap: 12,
  },
  previewEmoji: { fontSize: 28 },
  previewTitle: { fontSize: 14, fontWeight: '600', color: '#3D3935' },
  previewSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2 },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },

  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0EDE8', gap: 12,
  },
  optionIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  optionLabel: { fontSize: 14, fontWeight: '500', color: '#3D3935' },
  optionSub: { fontSize: 11, color: '#3D3935', opacity: 0.4, marginTop: 1 },
  optionChevron: { fontSize: 18, color: '#3D3935', opacity: 0.25 },

  privacyNote: {
    fontSize: 11, color: '#3D3935', opacity: 0.35, lineHeight: 16,
    marginTop: 16, marginBottom: 8,
  },

  cancelBtn: {
    alignItems: 'center', paddingVertical: 13,
    borderRadius: 12, backgroundColor: '#FFFFFF', marginTop: 4,
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#3D3935', opacity: 0.5 },
});
