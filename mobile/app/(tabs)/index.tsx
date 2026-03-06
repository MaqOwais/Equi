import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useCrisisStore } from '../../stores/crisis';
import { useSleepStore } from '../../stores/sleep';
import { useSocialRhythmStore } from '../../stores/socialRhythm';
import { useRouter } from 'expo-router';
import type { CycleState, MedicationStatus } from '../../types/database';

const MOOD_EMOJIS = ['😔', '😟', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩', '✨'];

const CYCLE_COLORS: Record<CycleState, string> = {
  stable: '#A8C5A0', manic: '#89B4CC', depressive: '#C4A0B0', mixed: '#E8DCC8',
};
const CYCLE_LABELS: Record<CycleState, string> = {
  stable: 'Stable', manic: 'Elevated', depressive: 'Low', mixed: 'Mixed',
};
const SKIP_REASONS = ['Forgot', 'Side effects', 'Felt fine', 'Ran out', 'Other'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

const SLEEP_OPTIONS = [
  { label: 'Poorly', sub: '< 5h', score: 1 },
  { label: 'Light',  sub: '5–6h', score: 2 },
  { label: 'OK',     sub: '6–7h', score: 3 },
  { label: 'Good',   sub: '7–8h', score: 4 },
  { label: 'Great',  sub: '8h+',  score: 5 },
];

export default function TodayScreen() {
  const { session, profile } = useAuthStore();
  const today = useTodayStore();
  const crisis = useCrisisStore();
  const sleep = useSleepStore();
  const rhythm = useSocialRhythmStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [skipSheetVisible, setSkipSheetVisible] = useState(false);
  const [pendingMedStatus, setPendingMedStatus] = useState<MedicationStatus | null>(null);
  const [selectedSkipReason, setSelectedSkipReason] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      today.load(userId);
      sleep.load(userId);
      rhythm.load(userId);
    }
  }, [userId]);

  function handleMoodTap(score: number) {
    if (today.moodScore !== null || !userId) return;
    today.logMood(userId, score);
  }

  function handleMedTap(status: MedicationStatus) {
    if (!userId) return;
    if (status === 'taken') {
      today.logMedication(userId, 'taken');
    } else {
      setPendingMedStatus(status);
      setSkipSheetVisible(true);
    }
  }

  function confirmSkip() {
    if (!userId || !pendingMedStatus) return;
    today.logMedication(userId, pendingMedStatus, selectedSkipReason ?? undefined);
    setSkipSheetVisible(false);
    setPendingMedStatus(null);
    setSelectedSkipReason(null);
  }

  function toggleSubstance(type: 'alcohol' | 'cannabis') {
    if (!userId) return;
    const alcohol = type === 'alcohol' ? !(today.alcohol ?? false) : (today.alcohol ?? false);
    const cannabis = type === 'cannabis' ? !(today.cannabis ?? false) : (today.cannabis ?? false);
    today.logCheckin(userId, alcohol, cannabis);
  }

  const cycleState: CycleState = today.cycleState ?? profile?.current_cycle_state ?? 'stable';
  const cycleColor = CYCLE_COLORS[cycleState];
  const trackMedication = profile?.track_medication ?? false;
  const showRuminationPrompt = today.moodScore !== null && today.moodScore <= 3;
  // Show sleep prompt in the morning (before noon) if not yet logged
  const showSleepPrompt = sleep.todayLog === null && new Date().getHours() < 14;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerDate}>{formatDate(new Date())}</Text>
          <Text style={s.headerGreeting}>
            {greeting()}{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}.
          </Text>
        </View>

        {/* Today card */}
        <SectionHeader label="TODAY" />
        <Card>
          <View style={s.cycleRow}>
            <View style={[s.cycleDot, { backgroundColor: cycleColor }]} />
            <Text style={s.cycleLabel}>{CYCLE_LABELS[cycleState]}</Text>
            <Text style={s.cycleHint}>  ·  log on Tracker tab</Text>
          </View>
          <Text style={s.cardSubLabel}>
            {today.moodScore !== null ? `Mood logged  ·  ${today.moodScore}/10` : 'How are you feeling?'}
          </Text>
          <View style={s.moodRow}>
            {MOOD_EMOJIS.map((emoji, i) => {
              const score = i + 1;
              const isSelected = today.moodScore === score;
              const isLogged = today.moodScore !== null;
              return (
                <TouchableOpacity
                  key={score}
                  onPress={() => handleMoodTap(score)}
                  disabled={isLogged}
                  style={[s.moodItem, isSelected && s.moodItemSelected]}
                  activeOpacity={isLogged ? 1 : 0.65}
                >
                  <Text style={[s.moodEmoji, !isSelected && isLogged && s.moodEmojiDimmed]}>
                    {emoji}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {today.moodScore === null && (
            <Text style={s.tapHint}>Tap once — saved instantly.</Text>
          )}
        </Card>

        {/* Rumination prompt */}
        {showRuminationPrompt && (
          <Card>
            <Text style={s.ruminationTitle}>A few hard days?</Text>
            <Text style={s.ruminationBody}>
              It looks like you're going through a difficult stretch.
              Would you like some grounding activities?
            </Text>
            <TouchableOpacity style={s.ruminationBtn}>
              <Text style={s.ruminationBtnText}>Show grounding activities</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Sleep prompt — morning only, until logged */}
        {showSleepPrompt && (
          <Card>
            <Text style={s.sleepTitle}>🌙  How did you sleep?</Text>
            <View style={s.sleepRow}>
              {SLEEP_OPTIONS.map((opt) => {
                const logged = sleep.todayLog?.quality_score === opt.score;
                return (
                  <TouchableOpacity
                    key={opt.score}
                    style={[s.sleepBtn, logged && s.sleepBtnActive]}
                    onPress={() => userId && sleep.logManual(userId, opt.score)}
                    disabled={sleep.todayLog !== null}
                  >
                    <Text style={[s.sleepBtnLabel, logged && s.sleepBtnLabelActive]}>{opt.label}</Text>
                    <Text style={[s.sleepBtnSub, logged && s.sleepBtnSubActive]}>{opt.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Sleep logged chip — shown after logging */}
        {sleep.todayLog !== null && (
          <Card>
            <View style={s.sleepLoggedRow}>
              <Text style={s.sleepLoggedIcon}>🌙</Text>
              <View>
                <Text style={s.sleepLoggedLabel}>Sleep logged</Text>
                <Text style={s.sleepLoggedSub}>
                  {['', 'Poorly', 'Light', 'OK', 'Good', 'Great'][sleep.todayLog.quality_score ?? 0]}
                  {sleep.todayLog.duration_minutes
                    ? `  ·  ${Math.floor(sleep.todayLog.duration_minutes / 60)}h ${sleep.todayLog.duration_minutes % 60}m`
                    : ''}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Check-ins */}
        <SectionHeader label="DAILY CHECK-INS" />
        <Card>
          {trackMedication && (
            <View style={s.checkinRow}>
              <Text style={s.checkinLabel}>💊  Medication</Text>
              <View style={s.medButtons}>
                {(['taken', 'skipped', 'partial'] as MedicationStatus[]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[s.medBtn, today.medicationStatus === status && s.medBtnActive]}
                    onPress={() => handleMedTap(status)}
                  >
                    <Text style={[s.medBtnText, today.medicationStatus === status && s.medBtnTextActive]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View style={[s.checkinRow, trackMedication && s.checkinRowBorder]}>
            <Text style={s.checkinLabel}>🍃  Substances</Text>
            <View style={s.substanceRow}>
              {(['alcohol', 'cannabis'] as const).map((sub) => {
                const active = today[sub] === true;
                return (
                  <TouchableOpacity
                    key={sub}
                    style={[s.subBtn, active && s.subBtnActive]}
                    onPress={() => toggleSubstance(sub)}
                  >
                    <Text style={[s.subBtnText, active && s.subBtnTextActive]}>
                      {sub.charAt(0).toUpperCase() + sub.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Rhythm chip — only when anchors are configured */}
          {rhythm.todayAnchorsTotal > 0 && (
            <TouchableOpacity
              style={[s.checkinRow, s.checkinRowBorder, s.rhythmRow]}
              onPress={() => router.push('/(tabs)/you/routine')}
              activeOpacity={0.7}
            >
              <Text style={s.checkinLabel}>🗓  Daily Routine</Text>
              <View style={s.rhythmRight}>
                <Text style={s.rhythmCount}>
                  {rhythm.todayAnchorsHit} / {rhythm.todayAnchorsTotal}
                </Text>
                {rhythm.todayScore !== null && (
                  <View style={s.rhythmBar}>
                    <View style={[s.rhythmFill, { width: `${rhythm.todayScore}%` as unknown as number }]} />
                  </View>
                )}
                <Text style={s.rhythmChevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </Card>

        {/* Activity suggestions placeholder */}
        <SectionHeader label="SUGGESTED ACTIVITIES" />
        <Card>
          <Text style={s.placeholderText}>
            Personalised activities matched to your cycle state — arriving in Phase 3C.
          </Text>
        </Card>

        <View style={{ height: 88 }} />
      </ScrollView>

      {/* Floating SOS */}
      <View style={s.sosContainer}>
        <TouchableOpacity style={s.sosBtn} onPress={crisis.open}>
          <Text style={s.sosBtnText}>SOS  ·  Crisis support</Text>
        </TouchableOpacity>
      </View>

      {/* Medication skip sheet */}
      <Modal visible={skipSheetVisible} transparent animationType="slide">
        <Pressable style={s.sheetBackdrop} onPress={() => setSkipSheetVisible(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>Why did you skip?</Text>
            {SKIP_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.sheetOption, selectedSkipReason === r && s.sheetOptionActive]}
                onPress={() => setSelectedSkipReason(r)}
              >
                <Text style={[s.sheetOptionText, selectedSkipReason === r && s.sheetOptionTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.sheetConfirm, !selectedSkipReason && s.sheetConfirmDisabled]}
              onPress={confirmSkip}
              disabled={!selectedSkipReason}
            >
              <Text style={s.sheetConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20 },

  header: { marginBottom: 20 },
  headerDate: { fontSize: 13, color: '#3D3935', opacity: 0.45, fontWeight: '500', letterSpacing: 0.4 },
  headerGreeting: { fontSize: 26, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginTop: 2 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },

  cycleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cycleDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  cycleLabel: { fontSize: 14, fontWeight: '600', color: '#3D3935' },
  cycleHint: { fontSize: 12, color: '#3D3935', opacity: 0.35 },

  cardSubLabel: { fontSize: 12, color: '#3D3935', opacity: 0.45, marginBottom: 10 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodItem: { alignItems: 'center', padding: 4, borderRadius: 8 },
  moodItemSelected: { backgroundColor: '#A8C5A015' },
  moodEmoji: { fontSize: 22 },
  moodEmojiDimmed: { opacity: 0.25 },
  tapHint: { fontSize: 11, color: '#3D3935', opacity: 0.3, textAlign: 'center', marginTop: 8 },

  ruminationTitle: { fontSize: 15, fontWeight: '600', color: '#3D3935', marginBottom: 6 },
  ruminationBody: { fontSize: 13, color: '#3D3935', opacity: 0.6, lineHeight: 19, marginBottom: 12 },
  ruminationBtn: { borderWidth: 1, borderColor: '#A8C5A0', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  ruminationBtnText: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },

  checkinRow: { paddingVertical: 12 },
  checkinRowBorder: { borderTopWidth: 1, borderTopColor: '#F0EDE8' },
  checkinLabel: { fontSize: 14, fontWeight: '500', color: '#3D3935', marginBottom: 10 },

  medButtons: { flexDirection: 'row', gap: 8 },
  medBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0DDD8', alignItems: 'center' },
  medBtnActive: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A015' },
  medBtnText: { fontSize: 13, color: '#3D3935', opacity: 0.5, fontWeight: '500' },
  medBtnTextActive: { color: '#A8C5A0', opacity: 1, fontWeight: '600' },

  substanceRow: { flexDirection: 'row', gap: 10 },
  subBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0DDD8' },
  subBtnActive: { borderColor: '#C4A0B0', backgroundColor: '#C4A0B015' },
  subBtnText: { fontSize: 13, color: '#3D3935', opacity: 0.45, fontWeight: '500' },
  subBtnTextActive: { color: '#C4A0B0', opacity: 1, fontWeight: '600' },

  placeholderText: { fontSize: 13, color: '#3D3935', opacity: 0.4, lineHeight: 18 },

  rhythmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rhythmRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rhythmCount: { fontSize: 13, color: '#3D3935', opacity: 0.5, fontWeight: '500' },
  rhythmBar: {
    width: 48, height: 5, borderRadius: 3,
    backgroundColor: '#E0DDD8', overflow: 'hidden',
  },
  rhythmFill: { height: 5, backgroundColor: '#A8C5A0', borderRadius: 3 },
  rhythmChevron: { fontSize: 18, color: '#3D3935', opacity: 0.2 },

  sleepTitle: { fontSize: 14, fontWeight: '600', color: '#3D3935', marginBottom: 12 },
  sleepRow: { flexDirection: 'row', gap: 6 },
  sleepBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0DDD8',
    paddingVertical: 9, alignItems: 'center',
  },
  sleepBtnActive: { borderColor: '#89B4CC', backgroundColor: '#89B4CC15' },
  sleepBtnLabel: { fontSize: 12, fontWeight: '500', color: '#3D3935', opacity: 0.55 },
  sleepBtnLabelActive: { color: '#89B4CC', opacity: 1, fontWeight: '700' },
  sleepBtnSub: { fontSize: 10, color: '#3D3935', opacity: 0.3, marginTop: 2 },
  sleepBtnSubActive: { color: '#89B4CC', opacity: 0.7 },

  sleepLoggedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sleepLoggedIcon: { fontSize: 22 },
  sleepLoggedLabel: { fontSize: 14, fontWeight: '600', color: '#3D3935' },
  sleepLoggedSub: { fontSize: 12, color: '#3D3935', opacity: 0.45, marginTop: 2 },

  sosContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8, backgroundColor: '#F7F3EE',
  },
  sosBtn: { backgroundColor: '#3D3935', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  sosBtnText: { fontSize: 15, fontWeight: '600', color: '#F7F3EE', letterSpacing: 0.3 },

  sheetBackdrop: { flex: 1, backgroundColor: '#00000030', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#F7F3EE', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935', marginBottom: 16 },
  sheetOption: { paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0DDD8', marginBottom: 8 },
  sheetOptionActive: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A015' },
  sheetOptionText: { fontSize: 15, color: '#3D3935', opacity: 0.5 },
  sheetOptionTextActive: { color: '#3D3935', opacity: 1, fontWeight: '500' },
  sheetConfirm: { backgroundColor: '#A8C5A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  sheetConfirmDisabled: { opacity: 0.4 },
  sheetConfirmText: { fontSize: 15, fontWeight: '600', color: '#F7F3EE' },
});
