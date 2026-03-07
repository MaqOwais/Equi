import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Pressable, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import { supabase } from '../../../lib/supabase';
import type { Companion, CompanionRole, GuardianLevel } from '../../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const GUARDIAN_LEVELS: { value: GuardianLevel; label: string; sub: string }[] = [
  { value: 'view_only',     label: 'View only',         sub: 'Can see what you share — no alerts' },
  { value: 'alert_on_risk', label: 'Alert on high risk', sub: 'Notified when risk triggers fire' },
  { value: 'full_control',  label: 'Full account access',sub: 'Can act on your behalf if needed' },
];

const ALERT_TRIGGERS = [
  'Mood ≤ 2/10 for 2+ consecutive days',
  'SOS button tapped',
  'No journal entry for 3+ days',
  'Manic symptoms logged 2+ consecutive days',
];

// ─── Companion Card ───────────────────────────────────────────────────────────

function CompanionCard({
  companion,
  onToggle,
  onRemove,
  onGuardianLevelChange,
}: {
  companion: Companion;
  onToggle: (id: string, field: keyof Companion, value: boolean) => void;
  onRemove: (id: string) => void;
  onGuardianLevelChange: (id: string, level: GuardianLevel) => void;
}) {
  const isPending = companion.status === 'pending';

  return (
    <View style={[s.companionCard, isPending && s.companionCardPending]}>
      <View style={s.companionHeader}>
        <View style={s.avatarSmall}>
          <Text style={s.avatarSmallText}>
            {(companion.invite_email ?? 'C').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.companionName}>
            {companion.invite_email ?? 'Companion'}
          </Text>
          <Text style={s.companionStatus}>
            {isPending ? '⏳  Invite pending' : '✓  Connected'}
          </Text>
        </View>
        <TouchableOpacity
          style={s.removeBtn}
          onPress={() =>
            Alert.alert('Remove companion?', 'They will lose access immediately.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => onRemove(companion.id) },
            ])
          }
        >
          <Text style={s.removeBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>

      {!isPending && (
        <>
          <Text style={s.toggleSectionLabel}>WHAT THEY CAN SEE</Text>

          <View style={s.toggleRow}>
            <View>
              <Text style={s.toggleLabel}>Mood summary</Text>
              <Text style={s.toggleSub}>"Having a calm day" — not a raw score</Text>
            </View>
            <Switch
              value={companion.share_mood_summaries}
              onValueChange={(v) => onToggle(companion.id, 'share_mood_summaries', v)}
              trackColor={{ true: '#A8C5A0' }}
            />
          </View>

          <View style={s.divider} />
          <View style={s.toggleRow}>
            <View>
              <Text style={s.toggleLabel}>Cycle state</Text>
              <Text style={s.toggleSub}>State name only — no intensity</Text>
            </View>
            <Switch
              value={companion.share_cycle_data}
              onValueChange={(v) => onToggle(companion.id, 'share_cycle_data', v)}
              trackColor={{ true: '#A8C5A0' }}
            />
          </View>

          <View style={s.divider} />
          <View style={s.toggleRow}>
            <View>
              <Text style={s.toggleLabel}>AI Wellness Report</Text>
              <Text style={s.toggleSub}>Full PDF</Text>
            </View>
            <Switch
              value={companion.share_ai_report}
              onValueChange={(v) => onToggle(companion.id, 'share_ai_report', v)}
              trackColor={{ true: '#A8C5A0' }}
            />
          </View>

          {companion.role === 'guardian' && (
            <>
              <View style={s.divider} />
              <View style={s.toggleRow}>
                <View>
                  <Text style={s.toggleLabel}>Medication status</Text>
                  <Text style={s.toggleSub}>Off by default — your choice</Text>
                </View>
                <Switch
                  value={companion.share_medication}
                  onValueChange={(v) => onToggle(companion.id, 'share_medication', v)}
                  trackColor={{ true: '#A8C5A0' }}
                />
              </View>

              {/* Guardian level */}
              <Text style={[s.toggleSectionLabel, { marginTop: 12 }]}>GUARDIAN LEVEL</Text>
              {GUARDIAN_LEVELS.map((gl) => (
                <TouchableOpacity
                  key={gl.value}
                  style={[
                    s.levelOption,
                    companion.guardian_level === gl.value && s.levelOptionActive,
                  ]}
                  onPress={() => onGuardianLevelChange(companion.id, gl.value)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.levelLabel}>{gl.label}</Text>
                    <Text style={s.levelSub}>{gl.sub}</Text>
                  </View>
                  {companion.guardian_level === gl.value && (
                    <Text style={s.levelCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}

              {/* Alert triggers */}
              <Text style={[s.toggleSectionLabel, { marginTop: 12 }]}>ALERT TRIGGERS</Text>
              <View style={s.alertTriggersCard}>
                {ALERT_TRIGGERS.map((t) => (
                  <Text key={t} style={s.alertTrigger}>·  {t}</Text>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Tab = 'well_wishers' | 'guardians';

export default function SupportNetworkScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [companions, setCompanions] = useState<Companion[]>([]);
  const [tab, setTab] = useState<Tab>('well_wishers');
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CompanionRole>('well_wisher');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (userId) loadCompanions();
  }, [userId]);

  async function loadCompanions() {
    if (!userId) return;
    const { data } = await supabase
      .from('companions')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at');
    setCompanions((data ?? []) as Companion[]);
  }

  async function handleToggle(id: string, field: keyof Companion, value: boolean) {
    setCompanions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
    await supabase.from('companions').update({ [field]: value }).eq('id', id);
  }

  async function handleGuardianLevel(id: string, level: GuardianLevel) {
    setCompanions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, guardian_level: level } : c)),
    );
    await supabase.from('companions').update({ guardian_level: level }).eq('id', id);
  }

  async function handleRemove(id: string) {
    setCompanions((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('companions').delete().eq('id', id);
  }

  async function sendInvite() {
    if (!userId || !inviteEmail.trim()) return;
    setSending(true);
    const { data } = await supabase
      .from('companions')
      .insert({
        patient_id: userId,
        role: inviteRole,
        guardian_level: inviteRole === 'guardian' ? 'view_only' : null,
        invite_email: inviteEmail.trim().toLowerCase(),
        status: 'pending',
      })
      .select()
      .single();

    if (data) setCompanions((prev) => [...prev, data as Companion]);
    setInviteEmail('');
    setSending(false);
    setAddSheetVisible(false);
  }

  const roleFilter: CompanionRole = tab === 'well_wishers' ? 'well_wisher' : 'guardian';
  const filtered = companions.filter((c) => c.role === roleFilter);

  return (
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Support Network</Text>
        <Text style={s.subtitle}>
          You control exactly what each person sees. All toggles are off by default.
        </Text>

        {/* Tabs */}
        <View style={s.tabs}>
          {(['well_wishers', 'guardians'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.tab, tab === t && s.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === 'well_wishers' ? 'Well-wishers' : 'Guardians'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        {tab === 'well_wishers' ? (
          <Text style={s.roleDesc}>
            Friends and family who offer support. They see a simplified view — never clinical data.
          </Text>
        ) : (
          <Text style={s.roleDesc}>
            Trusted people (family, partner) with more access. Guardians can receive alerts and,
            if needed, act on your behalf at the level you choose.
          </Text>
        )}

        {/* Companion cards */}
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyText}>
              {tab === 'well_wishers'
                ? 'No well-wishers yet. Add someone who supports you.'
                : 'No guardians yet. Add someone you deeply trust.'}
            </Text>
          </View>
        ) : (
          filtered.map((c) => (
            <CompanionCard
              key={c.id}
              companion={c}
              onToggle={handleToggle}
              onRemove={handleRemove}
              onGuardianLevelChange={handleGuardianLevel}
            />
          ))
        )}

        <TouchableOpacity
          style={s.addBtn}
          onPress={() => {
            setInviteRole(tab === 'well_wishers' ? 'well_wisher' : 'guardian');
            setAddSheetVisible(true);
          }}
        >
          <Text style={s.addBtnText}>
            + Add {tab === 'well_wishers' ? 'well-wisher' : 'guardian'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Invite sheet */}
      <Modal visible={addSheetVisible} transparent animationType="slide">
        <Pressable style={s.backdrop} onPress={() => setAddSheetVisible(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>
              Invite {inviteRole === 'well_wisher' ? 'well-wisher' : 'guardian'}
            </Text>
            <Text style={s.sheetSub}>
              They'll receive an email with a link to accept the connection.
            </Text>
            <TextInput
              style={s.emailInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="their@email.com"
              placeholderTextColor="#3D393540"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity
              style={[s.sendBtn, (!inviteEmail.trim() || sending) && s.sendBtnDisabled]}
              onPress={sendInvite}
              disabled={!inviteEmail.trim() || sending}
            >
              <Text style={s.sendBtnText}>{sending ? 'Sending…' : 'Send invite'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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

  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 19, marginBottom: 16 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0EDE8', marginBottom: 12 },
  tab: { paddingVertical: 10, marginRight: 24 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#A8C5A0' },
  tabText: { fontSize: 14, color: '#3D3935', opacity: 0.4, fontWeight: '500' },
  tabTextActive: { opacity: 1, fontWeight: '700', color: '#3D3935' },

  roleDesc: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 18, marginBottom: 16 },

  emptyState: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#3D3935', opacity: 0.3, textAlign: 'center', lineHeight: 20 },

  companionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F0EDE8',
  },
  companionCardPending: { borderWidth: 1.5, borderColor: '#E8DCC8', borderStyle: 'dashed' },
  companionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarSmall: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#A8C5A020', alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarSmallText: { fontSize: 16, fontWeight: '700', color: '#A8C5A0' },
  companionName: { fontSize: 14, fontWeight: '600', color: '#3D3935' },
  companionStatus: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2 },
  removeBtn: { paddingVertical: 4, paddingHorizontal: 10 },
  removeBtnText: { fontSize: 12, color: '#C4A0B0', fontWeight: '500' },

  toggleSectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#3D3935', opacity: 0.3,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleLabel: { fontSize: 14, color: '#3D3935', fontWeight: '500', marginBottom: 1 },
  toggleSub: { fontSize: 11, color: '#3D3935', opacity: 0.35 },
  divider: { height: 1, backgroundColor: '#F0EDE8', marginVertical: 4 },

  levelOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0DDD8', marginBottom: 6,
  },
  levelOptionActive: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A010' },
  levelLabel: { fontSize: 13, fontWeight: '600', color: '#3D3935', marginBottom: 2 },
  levelSub: { fontSize: 11, color: '#3D3935', opacity: 0.4 },
  levelCheck: { fontSize: 14, color: '#A8C5A0', fontWeight: '700', marginLeft: 8 },

  alertTriggersCard: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12 },
  alertTrigger: { fontSize: 12, color: '#3D3935', opacity: 0.5, marginBottom: 4, lineHeight: 18 },

  addBtn: {
    borderWidth: 1.5, borderColor: '#A8C5A0', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginTop: 8,
  },
  addBtnText: { fontSize: 14, color: '#A8C5A0', fontWeight: '600' },

  backdrop: { flex: 1, backgroundColor: '#00000030', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935', marginBottom: 4 },
  sheetSub: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 18, marginBottom: 16 },
  emailInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#3D3935', marginBottom: 14,
  },
  sendBtn: { backgroundColor: '#A8C5A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
