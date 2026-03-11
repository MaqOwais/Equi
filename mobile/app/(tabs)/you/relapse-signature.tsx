import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import { supabase } from '../../../lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

type EpisodeType = 'manic' | 'depressive';
type NoticedBy = 'me' | 'both' | 'people_around_me';

interface Signature {
  episode_type: EpisodeType;
  warning_signs: string[];
  days_before: number;
  noticed_by: NoticedBy;
}

// ─── Placeholders ────────────────────────────────────────────────────────────

const PLACEHOLDERS: Record<EpisodeType, string[]> = {
  manic: [
    'e.g. I start sleeping less but feel energised',
    'e.g. I make impulsive plans or purchases',
    'e.g. My thoughts start racing at night',
  ],
  depressive: [
    'e.g. I stop replying to messages',
    'e.g. Everything feels heavy and slow',
    'e.g. I lose interest in food',
  ],
};

const NOTICED_BY_OPTIONS: { value: NoticedBy; label: string; sub: string }[] = [
  { value: 'me',                label: 'Me first',              sub: 'I notice before others' },
  { value: 'both',              label: 'Both at the same time', sub: 'We tend to notice together' },
  { value: 'people_around_me', label: 'People around me first', sub: 'Others see it before I do' },
];

// ─── Builder for one episode type ─────────────────────────────────────────────

function SignatureBuilder({
  episodeType,
  existing,
  onSaved,
}: {
  episodeType: EpisodeType;
  existing: Signature | null;
  onSaved: (sig: Signature) => void;
}) {
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [warningSigns, setWarningSigns] = useState<string[]>(existing?.warning_signs ?? ['', '', '']);
  const [daysBefore, setDaysBefore] = useState(existing?.days_before ?? 7);
  const [noticedBy, setNoticedBy] = useState<NoticedBy>(existing?.noticed_by as NoticedBy ?? 'me');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setSign(i: number, text: string) {
    const next = [...warningSigns];
    next[i] = text;
    setWarningSigns(next);
    setSaved(false);
  }

  const filledSigns = warningSigns.filter((s) => s.trim().length > 0);
  const canSave = filledSigns.length >= 1;

  async function handleSave() {
    if (!userId || !canSave) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      episode_type: episodeType,
      warning_signs: filledSigns,
      days_before: daysBefore,
      noticed_by: noticedBy,
    };

    const { data } = await supabase
      .from('relapse_signatures')
      .upsert(payload, { onConflict: 'user_id,episode_type' })
      .select()
      .single();

    setSaving(false);
    setSaved(true);
    if (data) onSaved(data as Signature);
  }

  const accentColor = episodeType === 'manic' ? '#89B4CC' : '#C4A0B0';
  const placeholders = PLACEHOLDERS[episodeType];

  return (
    <View style={b.container}>
      {/* Step 1 — Warning signs */}
      <Text style={b.stepLabel}>STEP 1 — EARLY WARNING SIGNS</Text>
      <Text style={b.stepDesc}>
        What are your personal early warning signs for a{' '}
        {episodeType === 'manic' ? 'high/manic' : 'low/depressive'} episode?
        At least 1 required.
      </Text>
      {[0, 1, 2].map((i) => (
        <TextInput
          key={i}
          style={b.signInput}
          value={warningSigns[i]}
          onChangeText={(t) => setSign(i, t)}
          placeholder={placeholders[i]}
          placeholderTextColor="#3D393540"
          multiline={false}
        />
      ))}

      {/* Step 2 — Timing */}
      <Text style={[b.stepLabel, { marginTop: 20 }]}>STEP 2 — TIMING</Text>
      <Text style={b.stepDesc}>
        How many days before a full episode do you typically notice these signs?
      </Text>
      <Text style={[b.daysLabel, { color: accentColor }]}>About {daysBefore} days before</Text>
      <View style={b.sliderRow}>
        <Text style={b.sliderEnd}>1</Text>
        <View style={b.sliderTrack}>
          {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
            <TouchableOpacity
              key={n}
              style={[b.sliderTick, n <= daysBefore && { backgroundColor: accentColor }]}
              onPress={() => { setDaysBefore(n); setSaved(false); }}
            />
          ))}
        </View>
        <Text style={b.sliderEnd}>14</Text>
      </View>

      {/* Step 3 — Who notices */}
      <Text style={[b.stepLabel, { marginTop: 20 }]}>STEP 3 — WHO NOTICES FIRST</Text>
      {NOTICED_BY_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[b.optionRow, noticedBy === opt.value && [b.optionRowActive, { borderColor: accentColor }]]}
          onPress={() => { setNoticedBy(opt.value); setSaved(false); }}
        >
          <View style={{ flex: 1 }}>
            <Text style={b.optionLabel}>{opt.label}</Text>
            <Text style={b.optionSub}>{opt.sub}</Text>
          </View>
          {noticedBy === opt.value && (
            <Text style={[b.optionCheck, { color: accentColor }]}>✓</Text>
          )}
        </TouchableOpacity>
      ))}

      {/* Save */}
      <TouchableOpacity
        style={[b.saveBtn, { backgroundColor: saved ? '#A8C5A0' : accentColor }, (!canSave || saving) && b.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!canSave || saving}
      >
        <Text style={b.saveBtnText}>
          {saving ? 'Saving…' : saved ? '✓  Saved' : 'Save signature'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const b = StyleSheet.create({
  container: { marginBottom: 16 },
  stepLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
  },
  stepDesc: { fontSize: 13, color: '#3D3935', opacity: 0.55, lineHeight: 18, marginBottom: 12 },
  signInput: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#3D3935', marginBottom: 8,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  daysLabel: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sliderEnd: { fontSize: 12, color: '#3D3935', opacity: 0.4, width: 14, textAlign: 'center' },
  sliderTrack: { flex: 1, flexDirection: 'row', gap: 4 },
  sliderTick: {
    flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E0DDD8',
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12,
    borderWidth: 1.5, borderColor: '#E0DDD8', marginBottom: 6,
  },
  optionRowActive: { backgroundColor: '#FFFFFF' },
  optionLabel: { fontSize: 14, fontWeight: '600', color: '#3D3935', marginBottom: 2 },
  optionSub: { fontSize: 12, color: '#3D3935', opacity: 0.4 },
  optionCheck: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  saveBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RelapseSignatureScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [activeEpisode, setActiveEpisode] = useState<EpisodeType>('manic');
  const [signatures, setSignatures] = useState<Partial<Record<EpisodeType, Signature>>>({});

  useEffect(() => {
    if (userId) loadSignatures();
  }, [userId]);

  async function loadSignatures() {
    if (!userId) return;
    const { data } = await supabase
      .from('relapse_signatures')
      .select('*')
      .eq('user_id', userId);
    const map: Partial<Record<EpisodeType, Signature>> = {};
    (data ?? []).forEach((s) => { map[s.episode_type as EpisodeType] = s as Signature; });
    setSignatures(map);
  }

  function handleSaved(sig: Signature) {
    setSignatures((prev) => ({ ...prev, [sig.episode_type]: sig }));
  }

  const EPISODE_TABS: { value: EpisodeType; label: string; color: string }[] = [
    { value: 'manic',      label: 'Elevated / Manic', color: '#89B4CC' },
    { value: 'depressive', label: 'Low / Depressive',  color: '#C4A0B0' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Relapse Signatures</Text>
        <Text style={s.subtitle}>
          Your personal early warning patterns — used by the AI report to flag matches in real time.
          Private to you only.
        </Text>

        {/* Episode type tabs */}
        <View style={s.tabs}>
          {EPISODE_TABS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[
                s.tab,
                activeEpisode === t.value && { borderBottomColor: t.color, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveEpisode(t.value)}
            >
              <Text style={[
                s.tabText,
                activeEpisode === t.value && { color: t.color, opacity: 1, fontWeight: '700' },
              ]}>
                {t.label}
              </Text>
              {signatures[t.value] && (
                <Text style={[s.savedBadge, { color: t.color }]}> ✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <SignatureBuilder
          key={activeEpisode}
          episodeType={activeEpisode}
          existing={signatures[activeEpisode] ?? null}
          onSaved={handleSaved}
        />

        <View style={s.privacyNote}>
          <Text style={s.privacyText}>
            🔒  Relapse signatures are used only within the AI wellness report to flag personal
            patterns. They are never shared with companions or psychiatrists.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav: { paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },

  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 19, marginBottom: 16 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0EDE8', marginBottom: 16 },
  tab: { paddingVertical: 10, marginRight: 20, flexDirection: 'row', alignItems: 'center' },
  tabText: { fontSize: 14, color: '#3D3935', opacity: 0.4, fontWeight: '500' },
  savedBadge: { fontSize: 12, fontWeight: '700' },

  privacyNote: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 4 },
  privacyText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },
});
