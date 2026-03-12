import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Modal, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuthStore } from '../../../stores/auth';
import { seedTestConnections, clearTestConnections } from '../../../lib/test-seed';

const IS_DEV = Constants.executionEnvironment === 'storeClient' || __DEV__;
import {
  useAccessStore,
  SECTION_META,
  WELL_WISHER_ALLOWED,
  GUARDIAN_APPROVAL_SECTIONS,
  type DataSection,
} from '../../../stores/access';
import type { Companion, PsychiatristConnection, AccessApprovalRequest } from '../../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_SECTIONS = Object.keys(SECTION_META) as DataSection[];

const ROLE_COLORS = {
  psychiatrist: '#89B4CC',
  guardian:     '#A8C5A0',
  well_wisher:  '#C9A84C',
};

// ─── Pending Banner ───────────────────────────────────────────────────────────

function PendingBanner({
  requests,
  onCancel,
}: {
  requests: AccessApprovalRequest[];
  onCancel: (id: string) => void;
}) {
  if (requests.length === 0) return null;
  return (
    <View style={s.pendingBanner}>
      <View style={s.pendingBannerHeader}>
        <Ionicons name="time-outline" size={15} color="#C9A84C" />
        <Text style={s.pendingBannerTitle}>Awaiting approval ({requests.length})</Text>
      </View>
      {requests.map((r) => (
        <View key={r.id} style={s.pendingItem}>
          <View style={{ flex: 1 }}>
            <Text style={s.pendingItemDesc}>{r.description}</Text>
            <Text style={s.pendingItemRole}>
              Waiting on {r.approver_role === 'guardian' ? 'guardian' : 'psychiatrist'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onCancel(r.id)} style={s.pendingCancelBtn}>
            <Text style={s.pendingCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

// ─── Section Toggle Row ───────────────────────────────────────────────────────

function SectionRow({
  section,
  enabled,
  disabled,
  requiresApproval,
  hasPending,
  onToggle,
}: {
  section: DataSection;
  enabled: boolean;
  disabled?: boolean;
  requiresApproval?: boolean;
  hasPending?: boolean;
  onToggle: (value: boolean) => void;
}) {
  const meta = SECTION_META[section];
  return (
    <View style={[s.sectionRow, disabled && s.sectionRowDisabled]}>
      <Text style={s.sectionIcon}>{meta.icon}</Text>
      <View style={{ flex: 1 }}>
        <View style={s.sectionLabelRow}>
          <Text style={s.sectionLabel}>{meta.label}</Text>
          {requiresApproval && (
            <View style={s.approvalBadge}>
              <Ionicons name="shield-checkmark-outline" size={10} color="#C9A84C" />
              <Text style={s.approvalBadgeText}>Needs approval</Text>
            </View>
          )}
          {hasPending && (
            <View style={[s.approvalBadge, { backgroundColor: '#C9A84C15' }]}>
              <Ionicons name="time-outline" size={10} color="#C9A84C" />
              <Text style={s.approvalBadgeText}>Pending</Text>
            </View>
          )}
        </View>
        <Text style={s.sectionDesc}>{meta.desc}</Text>
      </View>
      {hasPending ? (
        <ActivityIndicator size="small" color="#C9A84C" style={{ marginLeft: 8 }} />
      ) : (
        <Switch
          value={enabled}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ true: '#A8C5A0', false: '#E0DDD8' }}
          thumbColor="#FFFFFF"
        />
      )}
    </View>
  );
}

// ─── Connection Card ──────────────────────────────────────────────────────────

function ConnectionCard({
  title,
  subtitle,
  color,
  connected,
  children,
  onSetup,
}: {
  title: string;
  subtitle: string;
  color: string;
  connected: boolean;
  children?: React.ReactNode;
  onSetup?: () => void;
}) {
  const [expanded, setExpanded] = useState(connected);
  const prevConnected = useRef(connected);
  useEffect(() => {
    // Auto-expand when connection status changes from false → true (e.g. after seeding)
    if (!prevConnected.current && connected) setExpanded(true);
    prevConnected.current = connected;
  }, [connected]);

  return (
    <View style={[s.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <TouchableOpacity
        style={s.cardHeader}
        onPress={() => connected && setExpanded((v) => !v)}
        activeOpacity={connected ? 0.65 : 1}
      >
        <View style={[s.cardDot, { backgroundColor: connected ? color : '#E0DDD8' }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{title}</Text>
          <Text style={s.cardSubtitle}>{connected ? subtitle : 'Not connected'}</Text>
        </View>
        {connected ? (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#3D393560"
          />
        ) : (
          <TouchableOpacity style={[s.setupBtn, { borderColor: color }]} onPress={onSetup}>
            <Text style={[s.setupBtnText, { color }]}>Set up</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {connected && expanded && (
        <View style={s.cardBody}>{children}</View>
      )}
    </View>
  );
}

// ─── Approval Confirm Sheet ───────────────────────────────────────────────────

function ApprovalSheet({
  visible,
  description,
  approverLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  description: string;
  approverLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={s.backdrop} onPress={onCancel}>
        <View style={s.sheet}>
          <View style={s.sheetIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={28} color="#C9A84C" />
          </View>
          <Text style={s.sheetTitle}>Approval required</Text>
          <Text style={s.sheetBody}>
            <Text style={{ fontWeight: '600' }}>{description}</Text>
            {'\n\n'}Your <Text style={{ fontWeight: '600' }}>{approverLabel}</Text> will
            be notified and must approve this change before it takes effect. You can cancel
            the request at any time.
          </Text>
          <TouchableOpacity style={s.sheetConfirm} onPress={onConfirm}>
            <Text style={s.sheetConfirmText}>Send for approval</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.sheetCancel} onPress={onCancel}>
            <Text style={s.sheetCancelText}>Keep current setting</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ManageAccessScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const userId = session?.user.id;
  const store = useAccessStore();

  const [approvalSheet, setApprovalSheet] = useState<{
    section: DataSection;
    companionId: string;
    value: boolean;
    approverLabel: string;
  } | null>(null);

  useEffect(() => {
    if (userId) store.load(userId);
  }, [userId]);

  // Build a set of pending section+companion pairs for quick lookup
  const pendingKeys = new Set(
    store.pendingRequests.map((r) => {
      const section = Object.keys(r.new_value ?? {})[0];
      return `${r.approver_companion_id}:${section}`;
    }),
  );

  function isPendingFor(companionId: string, section: DataSection) {
    return pendingKeys.has(`${companionId}:${section}`);
  }

  async function handleCompanionToggle(companion: Companion, section: DataSection, value: boolean) {
    if (!userId) return;
    const needsApprovalCheck = companion.role === 'guardian' && GUARDIAN_APPROVAL_SECTIONS.includes(section);

    if (needsApprovalCheck) {
      setApprovalSheet({
        section,
        companionId: companion.id,
        value,
        approverLabel: 'guardian',
      });
      return;
    }

    await store.toggleCompanionSection(companion.id, section, value, userId);
  }

  async function handleApprovalConfirm() {
    if (!approvalSheet || !userId) return;
    await store.toggleCompanionSection(
      approvalSheet.companionId,
      approvalSheet.section,
      approvalSheet.value,
      userId,
    );
    setApprovalSheet(null);
  }

  async function handleCancelRequest(requestId: string) {
    Alert.alert('Cancel request?', 'The change will not be applied.', [
      { text: 'Keep waiting', style: 'cancel' },
      { text: 'Cancel request', style: 'destructive', onPress: () => store.cancelRequest(requestId) },
    ]);
  }

  function renderSections(
    conn: Companion | PsychiatristConnection,
    isPsychiatrist: boolean,
    companionObj?: Companion,
  ) {
    const sections = isPsychiatrist
      ? ALL_SECTIONS
      : companionObj?.role === 'well_wisher'
        ? WELL_WISHER_ALLOWED
        : ALL_SECTIONS;

    return sections.map((section, idx) => {
      const isLast = idx === sections.length - 1;
      const enabled = !!(conn as Record<string, unknown>)[section];
      const companionId = (conn as Companion).id;
      const hasPending = !isPsychiatrist && isPendingFor(companionId, section);
      const requiresApproval =
        !isPsychiatrist &&
        companionObj?.role === 'guardian' &&
        GUARDIAN_APPROVAL_SECTIONS.includes(section);

      return (
        <View key={section}>
          <SectionRow
            section={section}
            enabled={enabled}
            requiresApproval={requiresApproval}
            hasPending={hasPending}
            onToggle={(value) => {
              if (isPsychiatrist) {
                store.togglePsychiatristSection((conn as PsychiatristConnection).id, section, value);
              } else if (companionObj) {
                handleCompanionToggle(companionObj, section, value);
              }
            }}
          />
          {!isLast && <View style={s.sectionDivider} />}
        </View>
      );
    });
  }

  if (store.isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['left', 'right']}>
        <ActivityIndicator style={{ marginTop: 80 }} color="#A8C5A0" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#A8C5A0" />
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Manage Access</Text>
        <Text style={s.subtitle}>
          Control exactly what each person in your care network can see. Changes to sensitive
          sections require approval from your guardian or psychiatrist.
        </Text>

        {/* Pending approvals */}
        <PendingBanner requests={store.pendingRequests} onCancel={handleCancelRequest} />

        {/* ── Psychiatrist ─────────────────────────────────────────────────── */}
        <Text style={s.sectionHeading}>PSYCHIATRIST</Text>
        <ConnectionCard
          title="Your psychiatrist"
          subtitle={store.psychiatristConn ? 'Connected via Equi' : ''}
          color={ROLE_COLORS.psychiatrist}
          connected={!!store.psychiatristConn}
          onSetup={() => router.push('/psychiatrists')}
        >
          {store.psychiatristConn && (
            <>
              <Text style={s.roleNote}>
                Your psychiatrist has full clinical access by default. You can restrict sections below.
                Medication changes always notify your psychiatrist regardless of these settings.
              </Text>
              <View style={s.sectionList}>
                {renderSections(store.psychiatristConn, true)}
              </View>
            </>
          )}
        </ConnectionCard>

        {/* ── Guardian ─────────────────────────────────────────────────────── */}
        <Text style={[s.sectionHeading, { marginTop: 24 }]}>GUARDIAN</Text>
        <Text style={s.roleIntro}>
          A trusted person (partner, family) who can receive alerts and act on your behalf.
          Changes to sensitive sections require their approval.
        </Text>
        {store.guardians.length === 0 ? (
          <TouchableOpacity
            style={[s.emptyCard, { borderColor: ROLE_COLORS.guardian + '60' }]}
            onPress={() => router.push('/(tabs)/you/support-network')}
          >
            <Ionicons name="person-add-outline" size={20} color={ROLE_COLORS.guardian} />
            <Text style={[s.emptyCardText, { color: ROLE_COLORS.guardian }]}>
              Add a guardian in Support Network
            </Text>
          </TouchableOpacity>
        ) : (
          store.guardians.map((g) => (
            <ConnectionCard
              key={g.id}
              title={g.invite_email ?? 'Guardian'}
              subtitle={g.status === 'pending' ? 'Invite pending' : 'Connected'}
              color={ROLE_COLORS.guardian}
              connected={g.status === 'accepted'}
              onSetup={() => router.push('/(tabs)/you/support-network')}
            >
              <Text style={s.roleNote}>
                Changing journal, workbook, or medication access requires your guardian's approval.
              </Text>
              <View style={s.sectionList}>
                {renderSections(g, false, g)}
              </View>
            </ConnectionCard>
          ))
        )}

        {/* ── Well-wisher ───────────────────────────────────────────────────── */}
        <Text style={[s.sectionHeading, { marginTop: 24 }]}>WELL-WISHERS</Text>
        <Text style={s.roleIntro}>
          Friends and family who offer support. Limited to a simplified view — never raw clinical data.
        </Text>
        {store.wellWishers.length === 0 ? (
          <TouchableOpacity
            style={[s.emptyCard, { borderColor: ROLE_COLORS.well_wisher + '60' }]}
            onPress={() => router.push('/(tabs)/you/support-network')}
          >
            <Ionicons name="person-add-outline" size={20} color={ROLE_COLORS.well_wisher} />
            <Text style={[s.emptyCardText, { color: ROLE_COLORS.well_wisher }]}>
              Add a well-wisher in Support Network
            </Text>
          </TouchableOpacity>
        ) : (
          store.wellWishers.map((w) => (
            <ConnectionCard
              key={w.id}
              title={w.invite_email ?? 'Well-wisher'}
              subtitle={w.status === 'pending' ? 'Invite pending' : 'Connected'}
              color={ROLE_COLORS.well_wisher}
              connected={w.status === 'accepted'}
              onSetup={() => router.push('/(tabs)/you/support-network')}
            >
              <Text style={s.roleNote}>
                Well-wishers see a simplified view. Cycle tracker is shared by default.
                Journal, workbook, and medications are never accessible to well-wishers.
              </Text>
              <View style={s.sectionList}>
                {renderSections(w, false, w)}
              </View>
            </ConnectionCard>
          ))
        )}

        {/* ── How approvals work ────────────────────────────────────────────── */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color="#89B4CC" />
          <Text style={s.infoText}>
            <Text style={{ fontWeight: '700' }}>How approvals work</Text>{'\n'}
            When you request a change that needs approval, your guardian or psychiatrist receives
            a notification. The change stays pending until they respond. You can cancel a pending
            request at any time — your current setting remains in place until then.
          </Text>
        </View>

        {/* ── Dev seed panel (dev builds only) ──────────────────────────── */}
        {IS_DEV && (
          <View style={s.devPanel}>
            <Text style={s.devPanelTitle}>🛠  DEV — Test Connections</Text>
            <Text style={s.devPanelSub}>
              Seeds 3 pre-accepted test accounts:{'\n'}
              · test.psychiatrist@equi.dev{'\n'}
              · test.guardian@equi.dev{'\n'}
              · test.wellwisher@equi.dev
            </Text>
            <View style={s.devBtnRow}>
              <TouchableOpacity
                style={s.devSeedBtn}
                onPress={async () => {
                  if (!userId) return;
                  const { ok, error } = await seedTestConnections(userId);
                  if (ok) {
                    await store.load(userId);
                    Alert.alert('Seeded ✓', '3 test connections added. Reload to see them.');
                  } else {
                    Alert.alert('Seed failed', error ?? 'Unknown error');
                  }
                }}
              >
                <Text style={s.devSeedBtnText}>Seed test data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.devClearBtn}
                onPress={async () => {
                  if (!userId) return;
                  Alert.alert('Clear test data?', 'Removes all 3 test connections and pending requests.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear', style: 'destructive',
                      onPress: async () => {
                        const { ok, error } = await clearTestConnections(userId);
                        if (ok) {
                          await store.load(userId);
                        } else {
                          Alert.alert('Clear failed', error ?? 'Unknown error');
                        }
                      },
                    },
                  ]);
                }}
              >
                <Text style={s.devClearBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Approval confirmation sheet */}
      <ApprovalSheet
        visible={!!approvalSheet}
        description={
          approvalSheet
            ? `${approvalSheet.value ? 'Enable' : 'Disable'} ${SECTION_META[approvalSheet.section].label} access`
            : ''
        }
        approverLabel={approvalSheet?.approverLabel ?? 'guardian'}
        onConfirm={handleApprovalConfirm}
        onCancel={() => setApprovalSheet(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav:      { paddingVertical: 8 },
  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },

  title:    { fontSize: 24, fontWeight: '800', color: '#3D3935', letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 19, marginBottom: 20 },

  sectionHeading: {
    fontSize: 10, fontWeight: '800', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
  },
  roleIntro: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 17, marginBottom: 10 },

  // ── Pending Banner ──
  pendingBanner: {
    backgroundColor: '#C9A84C10', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#C9A84C30', marginBottom: 20,
  },
  pendingBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  pendingBannerTitle:  { fontSize: 13, fontWeight: '700', color: '#C9A84C' },
  pendingItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#C9A84C20',
  },
  pendingItemDesc: { fontSize: 13, color: '#3D3935', fontWeight: '500', marginBottom: 2 },
  pendingItemRole: { fontSize: 11, color: '#3D3935', opacity: 0.4 },
  pendingCancelBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  pendingCancelText: { fontSize: 12, color: '#C4A0B0', fontWeight: '600' },

  // ── Cards ──
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16,
  },
  cardDot:     { width: 9, height: 9, borderRadius: 5 },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: '#3D3935' },
  cardSubtitle:{ fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 1 },
  cardBody:    { paddingHorizontal: 16, paddingBottom: 16 },

  setupBtn: {
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
  },
  setupBtnText: { fontSize: 12, fontWeight: '600' },

  roleNote: {
    fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 17,
    marginBottom: 12, fontStyle: 'italic',
  },

  // ── Section List ──
  sectionList: {
    backgroundColor: '#F7F3EE', borderRadius: 12, overflow: 'hidden',
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  sectionRowDisabled: { opacity: 0.4 },
  sectionIcon:  { fontSize: 16, width: 22, textAlign: 'center' },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#3D3935' },
  sectionDesc:  { fontSize: 11, color: '#3D3935', opacity: 0.4, marginTop: 1 },
  sectionDivider: { height: 1, backgroundColor: '#FFFFFF', marginHorizontal: 12 },

  approvalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#C9A84C10', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  approvalBadgeText: { fontSize: 9, fontWeight: '700', color: '#C9A84C' },

  // ── Empty state ──
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 14, borderStyle: 'dashed',
    paddingVertical: 16, paddingHorizontal: 16, marginBottom: 10,
  },
  emptyCardText: { fontSize: 13, fontWeight: '600' },

  // ── Info box ──
  infoBox: {
    flexDirection: 'row', gap: 10, marginTop: 24,
    backgroundColor: '#89B4CC10', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#89B4CC25',
  },
  infoText: { flex: 1, fontSize: 12, color: '#3D3935', opacity: 0.6, lineHeight: 18 },

  // ── Approval sheet ──
  backdrop: { flex: 1, backgroundColor: '#00000035', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, alignItems: 'center',
  },
  sheetIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#C9A84C15', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  sheetTitle:  { fontSize: 18, fontWeight: '800', color: '#3D3935', marginBottom: 10 },
  sheetBody:   { fontSize: 14, color: '#3D3935', opacity: 0.6, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  sheetConfirm: {
    backgroundColor: '#A8C5A0', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', width: '100%', marginBottom: 10,
  },
  sheetConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  sheetCancel:  { paddingVertical: 10, alignItems: 'center', width: '100%' },
  sheetCancelText: { fontSize: 14, color: '#3D3935', opacity: 0.4, fontWeight: '500' },

  // ── Dev panel ──
  devPanel: {
    marginTop: 32, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#C9A84C50', borderStyle: 'dashed',
    backgroundColor: '#C9A84C08', padding: 14,
  },
  devPanelTitle: { fontSize: 12, fontWeight: '800', color: '#C9A84C', marginBottom: 6 },
  devPanelSub: { fontSize: 11, color: '#3D3935', opacity: 0.5, lineHeight: 17, marginBottom: 12 },
  devBtnRow:    { flexDirection: 'row', gap: 8 },
  devSeedBtn: {
    flex: 1, backgroundColor: '#C9A84C', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  devSeedBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  devClearBtn: {
    paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#C4A0B0', paddingVertical: 10, alignItems: 'center',
  },
  devClearBtnText: { fontSize: 13, fontWeight: '600', color: '#C4A0B0' },
});
