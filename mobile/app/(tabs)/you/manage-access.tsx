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
import { useCompanionStore } from '../../../stores/companion';
import {
  useAccessStore,
  SECTION_META,
  ALL_SECTIONS,
  AI_SECTIONS,
  requiresApproval,
  type DataSection,
} from '../../../stores/access';
import type { Companion, PsychiatristConnection, AccessApprovalRequest } from '../../../types/database';

const IS_DEV = Constants.executionEnvironment === 'storeClient' || __DEV__;

const ROLE_COLORS = {
  psychiatrist: '#89B4CC',
  guardian:     '#A8C5A0',
  well_wisher:  '#C9A84C',
  ai:           '#C4A0B0',
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
  badgeLabel,
  hasPending,
  onToggle,
}: {
  section: DataSection;
  enabled: boolean;
  badgeLabel?: string;
  hasPending?: boolean;
  onToggle: (value: boolean) => void;
}) {
  const meta = SECTION_META[section];
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionIcon}>{meta.icon}</Text>
      <View style={{ flex: 1 }}>
        <View style={s.sectionLabelRow}>
          <Text style={s.sectionLabel}>{meta.label}</Text>
          {!!badgeLabel && !hasPending && (
            <View style={s.approvalBadge}>
              <Ionicons name="shield-checkmark-outline" size={9} color="#C9A84C" />
              <Text style={s.approvalBadgeText}>{badgeLabel}</Text>
            </View>
          )}
          {hasPending && (
            <View style={[s.approvalBadge, { backgroundColor: '#C9A84C20' }]}>
              <Ionicons name="time-outline" size={9} color="#C9A84C" />
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
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#3D393560" />
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

// ─── Confirm Sheet ────────────────────────────────────────────────────────────

function ConfirmSheet({
  visible,
  section,
  newValue,
  roleLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  section: DataSection | null;
  newValue: boolean;
  roleLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!section) return null;
  const meta = SECTION_META[section];
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={s.backdrop} onPress={onCancel}>
        <View style={s.sheet}>
          <View style={[s.sheetIconWrap, { backgroundColor: newValue ? '#A8C5A015' : '#C4A0B015' }]}>
            <Ionicons
              name={newValue ? 'eye-outline' : 'eye-off-outline'}
              size={26}
              color={newValue ? '#A8C5A0' : '#C4A0B0'}
            />
          </View>
          <Text style={s.sheetTitle}>
            {newValue ? 'Enable' : 'Disable'} {meta.label}?
          </Text>
          <Text style={s.sheetBody}>
            {newValue
              ? `${roleLabel} will be able to see your ${meta.label.toLowerCase()} data.`
              : `${roleLabel} will no longer see your ${meta.label.toLowerCase()} data.`}
          </Text>
          <TouchableOpacity style={s.sheetConfirm} onPress={onConfirm}>
            <Text style={s.sheetConfirmText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.sheetCancel} onPress={onCancel}>
            <Text style={s.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Approval Sheet ───────────────────────────────────────────────────────────

function ApprovalSheet({
  visible,
  description,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={s.backdrop} onPress={onCancel}>
        <View style={s.sheet}>
          <View style={s.sheetIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={26} color="#C9A84C" />
          </View>
          <Text style={s.sheetTitle}>Guardian approval required</Text>
          <Text style={s.sheetBody}>
            <Text style={{ fontWeight: '600' }}>{description}</Text>
            {'\n\n'}Your guardian will be notified and must approve this before it takes effect.
            You can cancel the request at any time.
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

type ConfirmPending = {
  section: DataSection;
  newValue: boolean;
  role: 'guardian' | 'well_wisher' | 'psychiatrist' | 'ai';
  companionId?: string;
  roleLabel: string;
};

type ApprovalPending = {
  section: DataSection;
  value: boolean;
  role: 'guardian' | 'well_wisher' | 'psychiatrist';
  companionId?: string;
};

export default function ManageAccessScreen() {
  const router    = useRouter();
  const { session } = useAuthStore();
  const userId    = session?.user.id;
  const store     = useAccessStore();

  const [confirmPending, setConfirmPending] = useState<ConfirmPending | null>(null);
  const [approvalPending, setApprovalPending] = useState<ApprovalPending | null>(null);

  useEffect(() => {
    if (userId) store.load(userId);
  }, [userId]);

  // Pending keys for quick lookup
  const pendingKeys = new Set(
    store.pendingRequests.map((r) => {
      const section = Object.keys(r.new_value ?? {})[0];
      return `${r.approver_companion_id}:${section}`;
    }),
  );
  function isPendingFor(companionId: string | undefined, section: DataSection) {
    return companionId ? pendingKeys.has(`${companionId}:${section}`) : false;
  }

  // ── Toggle entry point (opens confirm sheet) ──
  function handleToggle(
    section: DataSection,
    newValue: boolean,
    role: 'guardian' | 'well_wisher' | 'psychiatrist' | 'ai',
    roleLabel: string,
    companionId?: string,
  ) {
    setConfirmPending({ section, newValue, role, companionId, roleLabel });
  }

  // ── After confirm ──
  async function handleConfirmed() {
    if (!confirmPending || !userId) { setConfirmPending(null); return; }
    const { section, newValue, role, companionId } = confirmPending;
    setConfirmPending(null);

    if (role === 'ai') {
      await store.toggleAiSection(section, newValue, userId);
      return;
    }

    const activeGuardian = store.guardians.find((g) => g.status === 'accepted');
    const needsApproval  = requiresApproval(role, newValue) && !!activeGuardian;

    if (needsApproval) {
      setApprovalPending({ section, value: newValue, role, companionId });
      return;
    }

    // Apply immediately
    if (role === 'psychiatrist' && store.psychiatristConn) {
      await store.togglePsychiatristSection(store.psychiatristConn.id, section, newValue);
    } else if (companionId) {
      await store.toggleCompanionSection(companionId, section, newValue, userId);
    }
  }

  // ── After approval confirmed ──
  async function handleApprovalConfirmed() {
    if (!approvalPending || !userId) { setApprovalPending(null); return; }
    const { section, value, role, companionId } = approvalPending;
    const activeGuardians = store.guardians.filter((g) => g.status === 'accepted');
    setApprovalPending(null);

    if (role === 'psychiatrist' && store.psychiatristConn) {
      if (activeGuardians.length === 0) {
        // No guardian — apply immediately
        await store.togglePsychiatristSection(store.psychiatristConn.id, section, value);
      } else {
        // Notify ALL active guardians
        await Promise.all(activeGuardians.map((g) =>
          store.submitApprovalRequest({
            userId,
            requestType: 'access_change',
            approverRole: 'guardian',
            approverCompanionId: g.id,
            description: `${value ? 'Enable' : 'Disable'} ${SECTION_META[section].label} access for your psychiatrist`,
            oldValue: { [section]: !value },
            newValue:  { [section]: value },
          }),
        ));
      }
    } else if (companionId) {
      await store.toggleCompanionSection(companionId, section, value, userId);
    }
  }

  function handleCancelRequest(requestId: string) {
    Alert.alert('Cancel request?', 'The change will not be applied.', [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: 'Cancel request', style: 'destructive',
        onPress: () => store.cancelRequest(requestId),
      },
    ]);
  }

  // ── Render section list ──
  function renderSections(
    conn: Companion | PsychiatristConnection,
    role: 'guardian' | 'well_wisher' | 'psychiatrist',
    roleLabel: string,
  ) {
    const companionId = role !== 'psychiatrist' ? (conn as Companion).id : undefined;
    return ALL_SECTIONS.map((section, idx) => {
      const isLast     = idx === ALL_SECTIONS.length - 1;
      const enabled    = !!(conn as Record<string, unknown>)[section];
      const hasPending = isPendingFor(companionId, section);

      // Show approval badge on the section that WOULD trigger approval on next toggle
      const nextValueWouldNeedApproval = requiresApproval(role, !enabled);
      let badgeLabel: string | undefined;
      if (nextValueWouldNeedApproval) {
        badgeLabel = role === 'psychiatrist' ? 'Guardian approval' : 'Needs approval';
      }

      return (
        <View key={section}>
          <SectionRow
            section={section}
            enabled={enabled}
            badgeLabel={badgeLabel}
            hasPending={hasPending}
            onToggle={(value) =>
              handleToggle(section, value, role, roleLabel, companionId)
            }
          />
          {!isLast && <View style={s.sectionDivider} />}
        </View>
      );
    });
  }

  // ── AI section list ──
  function renderAiSections() {
    return AI_SECTIONS.map((section, idx) => {
      const isLast  = idx === AI_SECTIONS.length - 1;
      const enabled = store.aiAccess[section];
      return (
        <View key={section}>
          <SectionRow
            section={section}
            enabled={enabled}
            onToggle={(value) => handleToggle(section, value, 'ai', 'AI report')}
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

        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#A8C5A0" />
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Manage Access</Text>
        <Text style={s.subtitle}>
          Control exactly what each person — and the AI — can see. All changes ask
          for confirmation. Sensitive changes go through guardian approval.
        </Text>

        <PendingBanner requests={store.pendingRequests} onCancel={handleCancelRequest} />

        {/* ── Psychiatrist ─────────────────────────────────────────────────── */}
        <Text style={s.sectionHeading}>PSYCHIATRIST</Text>
        <Text style={s.roleIntro}>All changes require your guardian's approval.</Text>
        <ConnectionCard
          title="Your psychiatrist"
          subtitle="Connected via Equi"
          color={ROLE_COLORS.psychiatrist}
          connected={!!store.psychiatristConn}
          onSetup={() => router.push('/psychiatrists')}
        >
          {store.psychiatristConn && (
            <View style={s.sectionList}>
              {renderSections(store.psychiatristConn, 'psychiatrist', 'Psychiatrist')}
            </View>
          )}
        </ConnectionCard>

        {/* ── Guardian ─────────────────────────────────────────────────────── */}
        <Text style={[s.sectionHeading, { marginTop: 24 }]}>GUARDIAN</Text>
        <Text style={s.roleIntro}>
          Turning access OFF requires your guardian's approval.
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
              subtitle={g.status === 'accepted' ? 'Connected' : 'Invite pending'}
              color={ROLE_COLORS.guardian}
              connected={g.status === 'accepted'}
              onSetup={() => router.push('/(tabs)/you/support-network')}
            >
              <View style={s.sectionList}>
                {renderSections(g, 'guardian', g.invite_email ?? 'Guardian')}
              </View>
            </ConnectionCard>
          ))
        )}

        {/* ── Well-wishers ──────────────────────────────────────────────────── */}
        <Text style={[s.sectionHeading, { marginTop: 24 }]}>WELL-WISHERS</Text>
        <Text style={s.roleIntro}>
          Turning access ON requires your guardian's approval.
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
              subtitle={w.status === 'accepted' ? 'Connected' : 'Invite pending'}
              color={ROLE_COLORS.well_wisher}
              connected={w.status === 'accepted'}
              onSetup={() => router.push('/(tabs)/you/support-network')}
            >
              <View style={s.sectionList}>
                {renderSections(w, 'well_wisher', w.invite_email ?? 'Well-wisher')}
              </View>
            </ConnectionCard>
          ))
        )}

        {/* ── AI Access ─────────────────────────────────────────────────────── */}
        <Text style={[s.sectionHeading, { marginTop: 24 }]}>AI REPORT ACCESS</Text>
        <Text style={s.roleIntro}>
          Choose which data the AI uses when generating your weekly wellness report.
        </Text>
        <View style={[s.card, { borderLeftColor: ROLE_COLORS.ai, borderLeftWidth: 3 }]}>
          <View style={s.cardHeader}>
            <View style={[s.cardDot, { backgroundColor: ROLE_COLORS.ai }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>AI Wellness Report</Text>
              <Text style={s.cardSubtitle}>Zero data retention · Groq API</Text>
            </View>
            <Ionicons name="sparkles-outline" size={18} color={ROLE_COLORS.ai} />
          </View>
          <View style={s.cardBody}>
            <View style={s.sectionList}>
              {renderAiSections()}
            </View>
          </View>
        </View>

        {/* ── Info box ──────────────────────────────────────────────────────── */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color="#89B4CC" />
          <Text style={s.infoText}>
            <Text style={{ fontWeight: '700' }}>How approvals work{'\n'}</Text>
            When a change needs approval, your guardian gets a notification. The setting
            stays unchanged until they respond. You can cancel a pending request at any time.
          </Text>
        </View>

        {/* ── Dev seed ──────────────────────────────────────────────────────── */}
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
                  if (!ok) {
                    Alert.alert('Seed failed', error ?? 'Unknown error');
                    return;
                  }
                  // Reload companions + requests from DB
                  await store.load(userId);
                  // Inject "watching over" connection so You tab shows the section immediately
                  useCompanionStore.setState({
                    watching: [{
                      companion: {
                        id:           '00000000-0000-4000-a000-000000000006',
                        patient_id:   '00000000-0000-4000-a000-000000000005',
                        companion_id: userId,
                        role:         'guardian',
                        status:       'accepted',
                        share_cycle_data: true,
                      } as never,
                      patientId:   '00000000-0000-4000-a000-000000000005',
                      patientName: 'Alex (test patient)',
                      cycleState:  'stable',
                    }],
                  });
                  // Inject psychiatrist connection directly into store state
                  // (bypasses psychiatrists FK / RLS for dev testing)
                  useAccessStore.setState({
                    psychiatristConn: {
                      id:               '00000000-0000-4000-a000-000000000002',
                      patient_id:       userId,
                      psychiatrist_id:  '00000000-0000-4000-a000-000000000001',
                      status:           'accepted',
                      connected_at:     new Date().toISOString(),
                      share_cycle_data: true,
                      share_journal:    true,
                      share_activities: true,
                      share_ai_report:  true,
                      share_medication: true,
                      share_sleep:      true,
                      share_nutrition:  false,
                      share_workbook:   false,
                    } as never,
                  });
                  Alert.alert('Seeded ✓', '3 test connections added.');
                }}
              >
                <Text style={s.devSeedBtnText}>Seed test data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.devClearBtn}
                onPress={async () => {
                  if (!userId) return;
                  Alert.alert('Clear test data?', '', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear', style: 'destructive',
                      onPress: async () => {
                        const { ok, error } = await clearTestConnections(userId);
                        if (ok) {
                          await store.load(userId);
                          useAccessStore.setState({ psychiatristConn: null });
                          useCompanionStore.setState({ watching: [] });
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

      {/* Confirm sheet — step 1 */}
      <ConfirmSheet
        visible={!!confirmPending}
        section={confirmPending?.section ?? null}
        newValue={confirmPending?.newValue ?? false}
        roleLabel={confirmPending?.roleLabel ?? ''}
        onConfirm={handleConfirmed}
        onCancel={() => setConfirmPending(null)}
      />

      {/* Approval sheet — step 2 (only when guardian approval needed) */}
      <ApprovalSheet
        visible={!!approvalPending}
        description={
          approvalPending
            ? `${approvalPending.value ? 'Enable' : 'Disable'} ${SECTION_META[approvalPending.section].label} access`
            : ''
        }
        onConfirm={handleApprovalConfirmed}
        onCancel={() => setApprovalPending(null)}
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
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
  },
  roleIntro: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 17, marginBottom: 8 },

  // Pending banner
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

  // Cards
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  cardDot:      { width: 9, height: 9, borderRadius: 5 },
  cardTitle:    { fontSize: 14, fontWeight: '700', color: '#3D3935' },
  cardSubtitle: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 1 },
  cardBody:     { paddingHorizontal: 16, paddingBottom: 16 },

  setupBtn:     { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  setupBtnText: { fontSize: 12, fontWeight: '600' },

  // Section list
  sectionList:  { backgroundColor: '#F7F3EE', borderRadius: 12, overflow: 'hidden' },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
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

  // Empty state
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 14, borderStyle: 'dashed',
    paddingVertical: 16, paddingHorizontal: 16, marginBottom: 10,
  },
  emptyCardText: { fontSize: 13, fontWeight: '600' },

  // Info box
  infoBox: {
    flexDirection: 'row', gap: 10, marginTop: 24,
    backgroundColor: '#89B4CC10', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#89B4CC25',
  },
  infoText: { flex: 1, fontSize: 12, color: '#3D3935', opacity: 0.6, lineHeight: 18 },

  // Sheets (shared by Confirm + Approval)
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
  sheetTitle:       { fontSize: 18, fontWeight: '800', color: '#3D3935', marginBottom: 10 },
  sheetBody:        { fontSize: 14, color: '#3D3935', opacity: 0.6, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  sheetConfirm:     { backgroundColor: '#A8C5A0', borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%', marginBottom: 10 },
  sheetConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  sheetCancel:      { paddingVertical: 10, alignItems: 'center', width: '100%' },
  sheetCancelText:  { fontSize: 14, color: '#3D3935', opacity: 0.4, fontWeight: '500' },

  // Dev panel
  devPanel: {
    marginTop: 32, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#C9A84C50', borderStyle: 'dashed',
    backgroundColor: '#C9A84C08', padding: 14,
  },
  devPanelTitle:   { fontSize: 12, fontWeight: '800', color: '#C9A84C', marginBottom: 6 },
  devPanelSub:     { fontSize: 11, color: '#3D3935', opacity: 0.5, lineHeight: 17, marginBottom: 12 },
  devBtnRow:       { flexDirection: 'row', gap: 8 },
  devSeedBtn:      { flex: 1, backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  devSeedBtnText:  { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  devClearBtn:     { paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: '#C4A0B0', paddingVertical: 10, alignItems: 'center' },
  devClearBtnText: { fontSize: 13, fontWeight: '600', color: '#C4A0B0' },
});
