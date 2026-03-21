import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Modal, Pressable, ActivityIndicator, FlatList, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../../stores/auth';
import { supabase } from '../../../lib/supabase';
import { saveLocal, getLocal } from '../../../lib/local-day-store';
import { NUTRITION_REFS } from '../../../lib/evidence-refs';
import { useBipolarFlag } from '../../../lib/bipolar-flag';
import type { Diagnosis } from '../../../types/database';

const db = supabase as any;

// ─── Category groups ──────────────────────────────────────────────────────────

const BENEFIT_CATEGORIES = [
  { key: 'anti_inflammatory', label: 'Anti-inflammatory', icon: '🫐', note: 'Berries, leafy greens, fatty fish, turmeric' },
  { key: 'whole_grains',      label: 'Whole Grains',      icon: '🌾', note: 'Oats, brown rice, quinoa' },
  { key: 'lean_protein',      label: 'Lean Protein',      icon: '🥚', note: 'Eggs, legumes, poultry' },
  { key: 'healthy_fats',      label: 'Healthy Fats',      icon: '🥑', note: 'Avocado, nuts, olive oil' },
  { key: 'fermented',         label: 'Fermented / Gut',   icon: '🥛', note: 'Yoghurt, kimchi, kefir' },
];

const HARM_CATEGORIES = [
  { key: 'caffeine',        label: 'Caffeine',        icon: '☕', note: 'Coffee, tea, energy drinks' },
  { key: 'ultra_processed', label: 'Ultra-Processed', icon: '🍟', note: 'Packaged snacks, fast food' },
  { key: 'sugar_heavy',     label: 'Sugar-Heavy',     icon: '🍬', note: 'Sweets, sugary drinks' },
  { key: 'alcohol',         label: 'Alcohol',         icon: '🍷' },
];

const OTHER_BASE = [
  { key: 'hydration', label: 'Hydration', icon: '💧', note: 'Target: 8 glasses' },
];
const LITHIUM_WATCH = {
  key: 'lithium_interaction', label: 'Lithium-Watch', icon: '⚠️', note: 'Grapefruit, excess sodium',
};

const LITHIUM_DIAGNOSES: Diagnosis[] = ['bipolar_1', 'bipolar_2'];

// ─── Why-it-matters evidence blurbs ───────────────────────────────────────────

export const CATEGORY_WHY: Record<string, string> = {
  anti_inflammatory:
    'High omega-3 / low omega-6 diet reduced EMA-detected mood variability in a 2022 RCT (Saunders et al.). Berries and leafy greens lower inflammatory cytokines directly linked to depressive episodes.',
  whole_grains:
    'Complex carbs provide steady glucose, preventing the energy crashes that can trigger low mood. Stable blood sugar also supports steady tryptophan availability for serotonin synthesis.',
  lean_protein:
    'Amino acids — especially tryptophan in eggs and legumes — are the building blocks of serotonin and dopamine, key neurotransmitters for mood regulation.',
  healthy_fats:
    'Omega-3s and monounsaturated fats support brain cell membrane fluidity. Walnut and olive oil intake is associated with reduced depression risk in the PREDIMED trial.',
  fermented:
    'The gut microbiome talks to the brain via the vagus nerve (gut-brain axis). Fermented foods increase beneficial bacteria associated with lower anxiety and depression scores.',
  caffeine:
    'Caffeine disrupts deep-sleep architecture — the strongest single predictor of mood episode onset. Three or more cups per day can also lower lithium blood levels.',
  ultra_processed:
    'Ultra-processed foods raise systemic inflammation (IL-6, TNF-α) — the same pathway implicated in bipolar depression. Associated with a 30% higher depression risk (Jacka lab, 2019).',
  sugar_heavy:
    'Rapid blood sugar spikes followed by crashes amplify mood swings and energy instability. High sugar intake is consistently linked to higher anxiety scores.',
  alcohol:
    'Alcohol is a CNS depressant that disrupts sleep cycles, reduces lithium effectiveness, and destabilises mood cycles — the most common substance comorbidity in bipolar disorder (Oslo MinDag, 2025).',
  hydration:
    'Even mild dehydration (1–2%) impairs cognitive function and mood. Especially important for lithium users — dehydration raises lithium blood levels toward the toxic range.',
  lithium_interaction:
    'Grapefruit inhibits enzymes that metabolise some mood stabilisers. Sudden changes in sodium or fluid intake can shift lithium blood levels significantly — mention changes to your doctor.',
};

export const CATEGORY_WHY_GENERAL: Record<string, string> = {
  anti_inflammatory:
    'High omega-3 / low omega-6 diets are linked to reduced mood variability and lower depression risk. Berries and leafy greens lower inflammatory cytokines associated with low mood and fatigue.',
  whole_grains:
    'Complex carbs provide steady glucose, preventing the energy crashes that can trigger low mood. Stable blood sugar also supports steady tryptophan availability for serotonin synthesis.',
  lean_protein:
    'Amino acids — especially tryptophan in eggs and legumes — are the building blocks of serotonin and dopamine, key neurotransmitters for mood regulation and motivation.',
  healthy_fats:
    'Omega-3s and monounsaturated fats support brain cell membrane fluidity. Walnut and olive oil intake is associated with reduced depression risk in the PREDIMED trial.',
  fermented:
    'The gut microbiome communicates with the brain via the vagus nerve. Fermented foods increase beneficial bacteria associated with lower anxiety and depression scores.',
  caffeine:
    'Caffeine disrupts deep-sleep architecture, which is one of the strongest predictors of mood deterioration. More than 3 cups per day is linked to increased anxiety and poorer sleep quality.',
  ultra_processed:
    'Ultra-processed foods raise systemic inflammation (IL-6, TNF-α) — associated with a 30% higher depression risk (Jacka lab, 2019). They also displace nutrient-dense foods that support brain health.',
  sugar_heavy:
    'Rapid blood sugar spikes followed by crashes amplify mood instability and energy dips. High sugar intake is consistently linked to higher anxiety scores and poorer mental wellbeing.',
  alcohol:
    'Alcohol is a CNS depressant that disrupts sleep cycles and destabilises mood — even moderate use is associated with next-day anxiety, reduced motivation, and poorer emotional regulation.',
  hydration:
    'Even mild dehydration (1–2%) impairs cognitive function, concentration, and mood. Consistent hydration supports energy levels and emotional resilience throughout the day.',
  lithium_interaction:
    'Grapefruit inhibits enzymes that metabolise some medications. If you take regular medication, check with your doctor before making significant dietary changes.',
};

/** Pick the right why-blurb for a given category and user type. */
export function getCategoryWhy(key: string, bipolar: boolean): string {
  return (bipolar ? CATEGORY_WHY : CATEGORY_WHY_GENERAL)[key] ?? '';
}

// ─── Score ────────────────────────────────────────────────────────────────────

const BENEFIT_KEYS = BENEFIT_CATEGORIES.map((c) => c.key);
const HARM_KEYS    = ['ultra_processed', 'sugar_heavy', 'alcohol'];

export function calcNutritionScore(counts: Record<string, number>): number {
  const benefits = BENEFIT_KEYS.filter((k) => (counts[k] ?? 0) > 0).length;
  const harms    = HARM_KEYS.filter((k) => (counts[k] ?? 0) > 0).length
                 + ((counts['caffeine'] ?? 0) >= 3 ? 1 : 0);
  return Math.max(0, Math.min(10, benefits * 2 - harms));
}

function scoreInfo(score: number, hasAnyLog: boolean): { label: string; color: string; sub: string } {
  if (!hasAnyLog) return { label: 'Nothing logged yet', color: '#3D393540', sub: 'Tap + to start logging' };
  if (score >= 7)  return { label: 'Anti-inflammatory', color: '#A8C5A0', sub: 'Great food choices today' };
  if (score >= 4)  return { label: 'Mixed day',         color: '#C9A84C', sub: 'Room to add more nutrients' };
  return              { label: 'Needs attention',    color: '#C4A0B0', sub: 'Try adding one beneficial food' };
}

// ─── Custom item storage ──────────────────────────────────────────────────────

const customKey = (userId: string) => `equi_nutrition_custom_${userId}`;
export interface CustomItem { key: string; label: string; emoji: string }

async function loadCustomDefs(userId: string): Promise<CustomItem[]> {
  const raw = await AsyncStorage.getItem(customKey(userId));
  if (!raw) return [];
  // Migrate old items that lack emoji
  return (JSON.parse(raw) as { key: string; label: string; emoji?: string }[])
    .map((c) => ({ ...c, emoji: c.emoji ?? '🍽️' }));
}
async function saveCustomDefs(userId: string, items: CustomItem[]): Promise<void> {
  await AsyncStorage.setItem(customKey(userId), JSON.stringify(items));
}

// ─── Emoji & suggestion palette ───────────────────────────────────────────────

export const CUSTOM_EMOJIS = [
  '🍽️','🐟','🥩','🍳','🥚','🥛','🧀','🫙','💊','🌿',
  '🍎','🍊','🍋','🍇','🍓','🥝','🫐','🍅','🥑','🥦',
  '🥬','🌽','🥕','🥜','🌰','🍄','🫚','🍵','🍫','🌾',
];

export const CUSTOM_SUGGESTIONS: { label: string; emoji: string }[] = [
  { label: 'Omega-3 supplement', emoji: '💊' },
  { label: 'Magnesium',          emoji: '💊' },
  { label: 'Vitamin D',          emoji: '💊' },
  { label: 'B12 supplement',     emoji: '💊' },
  { label: 'Probiotics',         emoji: '🫙' },
  { label: 'Zinc',               emoji: '💊' },
  { label: 'Folate / B9',        emoji: '💊' },
  { label: 'Grapefruit',         emoji: '🍊' },
  { label: 'Oily fish',          emoji: '🐟' },
  { label: 'Dark chocolate',     emoji: '🍫' },
  { label: 'Green tea',          emoji: '🍵' },
  { label: 'Turmeric',           emoji: '🌿' },
  { label: 'Walnuts',            emoji: '🌰' },
  { label: 'Berries',            emoji: '🫐' },
  { label: 'Avocado',            emoji: '🥑' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToday() {
  return new Date().toISOString().split('T')[0];
}

// ─── Row component ────────────────────────────────────────────────────────────

function CategoryRow({
  catKey, icon, label, note, why, count, openTip, onTipToggle, onInc, onDec,
}: {
  catKey: string; icon: string; label: string; note?: string; why?: string;
  count: number; openTip: string | null;
  onTipToggle: (key: string | null) => void;
  onInc: () => void; onDec: () => void;
}) {
  const tipOpen = openTip === catKey;
  const ref = NUTRITION_REFS[catKey];
  return (
    <View style={s.categoryRow}>
      {/* Main row */}
      <View style={s.catMainRow}>
        <Text style={s.catIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.catLabel}>{label}</Text>
          {note && <Text style={s.catNote}>{note}</Text>}
        </View>
        {why && (
          <TouchableOpacity
            style={s.infoBtn}
            onPress={() => onTipToggle(tipOpen ? null : catKey)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[s.infoBtnText, tipOpen && s.infoBtnOpen]}>ⓘ</Text>
          </TouchableOpacity>
        )}
        <View style={s.counter}>
          <TouchableOpacity style={s.counterBtn} onPress={onDec} disabled={count === 0}>
            <Text style={[s.counterBtnText, count === 0 && s.counterBtnDisabled]}>−</Text>
          </TouchableOpacity>
          <Text style={s.counterVal}>{count}</Text>
          <TouchableOpacity style={s.counterBtn} onPress={onInc}>
            <Text style={s.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Evidence tip panel */}
      {tipOpen && why && (
        <View style={s.tipPanel}>
          <Text style={s.tipText}>{why}</Text>
          {ref && (
            <View style={s.refRow}>
              <Text style={s.refCitation} numberOfLines={2}>{ref.citation}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(ref.url)} activeOpacity={0.7}>
                <Text style={s.learnMore}>Learn more →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const { session, profile } = useAuthStore();
  const router = useRouter();
  const bipolar = useBipolarFlag();
  const userId = session?.user.id;

  const [counts, setCounts]               = useState<Record<string, number>>({});
  const [customItems, setCustomItems]     = useState<CustomItem[]>([]);
  const [nutritionNote, setNutritionNote] = useState('');
  const [logging, setLogging]             = useState(false);
  const [lastLogged, setLastLogged]       = useState<string | null>(null);
  const [saveTimer, setSaveTimer]         = useState<ReturnType<typeof setTimeout> | null>(null);
  const [modalVisible, setModalVisible]   = useState(false);
  const [newLabel, setNewLabel]           = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🍽️');
  const [openTip, setOpenTip]             = useState<string | null>(null);

  const showLithium = profile?.diagnosis
    ? LITHIUM_DIAGNOSES.includes(profile.diagnosis)
    : false;

  const otherCategories = showLithium ? [...OTHER_BASE, LITHIUM_WATCH] : OTHER_BASE;

  useEffect(() => {
    if (userId) {
      loadLog();
      loadCustomDefs(userId).then(setCustomItems);
    }
  }, [userId]);

  async function loadLog() {
    if (!userId) return;
    const local = await getLocal(userId, isoToday());
    if (local?.nutritionCategories) {
      setCounts(local.nutritionCategories);
      if (local.nutritionTimestamp) {
        setLastLogged(new Date(local.nutritionTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      }
      if (local.nutritionNotes) setNutritionNote(local.nutritionNotes);
      return;
    }
    const { data } = await db
      .from('nutrition_logs').select('categories')
      .eq('user_id', userId).eq('log_date', isoToday()).maybeSingle();
    if (data?.categories) setCounts(data.categories as Record<string, number>);
  }

  function adjust(key: string, delta: 1 | -1) {
    setCounts((prev) => {
      const next = { ...prev, [key]: Math.max(0, (prev[key] ?? 0) + delta) };
      scheduleSave(next, nutritionNote);
      return next;
    });
  }

  function scheduleSave(nextCounts: Record<string, number>, note: string) {
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(async () => {
      if (!userId) return;
      await saveLocal(userId, isoToday(), {
        nutritionCategories: nextCounts,
        nutritionTimestamp: new Date().toISOString(),
        nutritionNotes: note || null,
      });
    }, 1200);
    setSaveTimer(t);
  }

  async function handleLog() {
    if (!userId || logging) return;
    if (saveTimer) clearTimeout(saveTimer);
    setLogging(true);
    const ts = new Date().toISOString();
    await saveLocal(userId, isoToday(), {
      nutritionCategories: counts,
      nutritionTimestamp: ts,
      nutritionNotes: nutritionNote || null,
    });
    await db.from('nutrition_logs').upsert(
      { user_id: userId, log_date: isoToday(), categories: counts },
      { onConflict: 'user_id,log_date' },
    );
    setLastLogged(new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    setLogging(false);
  }

  function openModal() {
    setNewLabel('');
    setSelectedEmoji('🍽️');
    setModalVisible(true);
  }

  function addCustomItem() {
    const label = newLabel.trim();
    if (!label || !userId) return;
    const key = `custom_${label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
    if (customItems.some((c) => c.key === key)) {
      setNewLabel(''); setSelectedEmoji('🍽️'); setModalVisible(false); return;
    }
    const updated = [...customItems, { key, label, emoji: selectedEmoji }];
    setCustomItems(updated);
    saveCustomDefs(userId, updated);
    setNewLabel(''); setSelectedEmoji('🍽️'); setModalVisible(false);
  }

  function removeCustomItem(key: string) {
    if (!userId) return;
    const updated = customItems.filter((c) => c.key !== key);
    setCustomItems(updated);
    saveCustomDefs(userId, updated);
    setCounts((prev) => {
      const next = { ...prev };
      delete next[key];
      scheduleSave(next, nutritionNote);
      return next;
    });
  }

  const totalLogged = Object.values(counts).reduce((a, b) => a + b, 0);
  const score = calcNutritionScore(counts);
  const { label: scoreLabel, color: scoreColor, sub: scoreSub } = scoreInfo(score, totalLogged > 0);

  // Caffeine warning (clinically relevant — caffeine is a diuretic that lowers lithium levels)
  const showLithiumWarning = showLithium && (counts['caffeine'] ?? 0) >= 3;

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Nutrition</Text>
        <Text style={s.subtitle}>
          Track food quality — no calorie counting. Tap + or − to log servings today.
        </Text>

        {/* Score card */}
        <View style={[s.scoreCard, { borderLeftColor: scoreColor }]}>
          <View style={s.scoreLeft}>
            <Text style={[s.scoreNum, { color: scoreColor }]}>
              {totalLogged > 0 ? score : '–'}
            </Text>
            <Text style={s.scoreDenom}>/10</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
            <Text style={s.scoreSub}>{scoreSub}</Text>
          </View>
        </View>

        {/* Anti-inflammatory section */}
        <Text style={s.sectionHeader}>ANTI-INFLAMMATORY</Text>
        {BENEFIT_CATEGORIES.map((cat) => (
          <CategoryRow
            key={cat.key} catKey={cat.key}
            icon={cat.icon} label={cat.label} note={cat.note}
            why={getCategoryWhy(cat.key, bipolar)}
            count={counts[cat.key] ?? 0}
            openTip={openTip} onTipToggle={setOpenTip}
            onInc={() => adjust(cat.key, 1)}
            onDec={() => adjust(cat.key, -1)}
          />
        ))}

        {/* May destabilize / limit section */}
        <Text style={s.sectionHeader}>{bipolar ? 'MAY DESTABILIZE' : 'LIMIT OR WATCH'}</Text>
        {HARM_CATEGORIES.map((cat) => (
          <CategoryRow
            key={cat.key} catKey={cat.key}
            icon={cat.icon} label={cat.label} note={cat.note}
            why={getCategoryWhy(cat.key, bipolar)}
            count={counts[cat.key] ?? 0}
            openTip={openTip} onTipToggle={setOpenTip}
            onInc={() => adjust(cat.key, 1)}
            onDec={() => adjust(cat.key, -1)}
          />
        ))}

        {/* Other section */}
        <Text style={s.sectionHeader}>OTHER</Text>
        {otherCategories.map((cat) => (
          <CategoryRow
            key={cat.key} catKey={cat.key}
            icon={cat.icon} label={cat.label} note={cat.note}
            why={getCategoryWhy(cat.key, bipolar)}
            count={counts[cat.key] ?? 0}
            openTip={openTip} onTipToggle={setOpenTip}
            onInc={() => adjust(cat.key, 1)}
            onDec={() => adjust(cat.key, -1)}
          />
        ))}

        {/* Custom items */}
        {customItems.map((cat) => (
          <View key={cat.key} style={s.categoryRow}>
            <Text style={s.catIcon}>{cat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.catLabel}>{cat.label}</Text>
              <TouchableOpacity onPress={() => removeCustomItem(cat.key)}>
                <Text style={s.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <View style={s.counter}>
              <TouchableOpacity
                style={s.counterBtn}
                onPress={() => adjust(cat.key, -1)}
                disabled={(counts[cat.key] ?? 0) === 0}
              >
                <Text style={[s.counterBtnText, (counts[cat.key] ?? 0) === 0 && s.counterBtnDisabled]}>
                  −
                </Text>
              </TouchableOpacity>
              <Text style={s.counterVal}>{counts[cat.key] ?? 0}</Text>
              <TouchableOpacity style={s.counterBtn} onPress={() => adjust(cat.key, 1)}>
                <Text style={s.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add custom food */}
        <TouchableOpacity
          style={s.addCustomBtn}
          onPress={openModal}
          activeOpacity={0.7}
        >
          <Text style={s.addCustomText}>+ Add food to track</Text>
        </TouchableOpacity>

        {/* Caffeine / lithium warning */}
        {showLithiumWarning && (
          <View style={s.warningCard}>
            <Text style={s.warningText}>
              High caffeine intake can affect lithium levels. If your intake has changed recently,
              mention it to your doctor.
            </Text>
          </View>
        )}

        <View style={s.privacyNote}>
          <Text style={s.privacyText}>
            Nutrition data is not shared with anyone. If you log 3+ days, it will appear
            in your personal AI wellness report.
          </Text>
        </View>

        {/* Diet note */}
        <View style={s.noteCard}>
          <Text style={s.noteLabel}>Diet note  (optional)</Text>
          <TextInput
            style={s.noteInput}
            placeholder="Anything notable about today's food — meals, cravings, skipped eating..."
            placeholderTextColor="#3D393540"
            value={nutritionNote}
            onChangeText={(t) => {
              setNutritionNote(t);
              scheduleSave(counts, t);
            }}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={300}
          />
        </View>

        {/* Log button */}
        <View style={s.logRow}>
          {lastLogged && (
            <Text style={s.loggedAt}>Logged at {lastLogged}</Text>
          )}
          <TouchableOpacity
            style={[s.logBtn, { backgroundColor: totalLogged > 0 ? '#A8C5A0' : '#E0DDD8' }]}
            onPress={handleLog}
            disabled={logging || totalLogged === 0}
            activeOpacity={0.8}
          >
            {logging
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={s.logBtnText}>
                  {lastLogged ? '↺  Update Log' : 'Save Nutrition Log'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add custom modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setModalVisible(false); setNewLabel(''); setSelectedEmoji('🍽️'); }}
      >
        <Pressable style={s.overlay} onPress={() => { setModalVisible(false); setNewLabel(''); setSelectedEmoji('🍽️'); }}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <Text style={s.modalTitle}>Add food to track</Text>

            {/* Quick suggestions */}
            <Text style={s.modalSectionLabel}>QUICK ADD</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestScroll} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
              {CUSTOM_SUGGESTIONS.map((sg) => (
                <TouchableOpacity
                  key={sg.label}
                  style={[s.suggestChip, newLabel === sg.label && { backgroundColor: '#A8C5A022', borderColor: '#A8C5A0' }]}
                  onPress={() => { setNewLabel(sg.label); setSelectedEmoji(sg.emoji); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.suggestChipText}>{sg.emoji}  {sg.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Name input */}
            <Text style={[s.modalSectionLabel, { marginTop: 14 }]}>NAME</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Or type your own..."
              placeholderTextColor="#3D393550"
              value={newLabel}
              onChangeText={setNewLabel}
              maxLength={40}
              onSubmitEditing={addCustomItem}
              returnKeyType="done"
            />

            {/* Emoji picker */}
            <Text style={s.modalSectionLabel}>EMOJI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.emojiScroll} contentContainerStyle={{ gap: 4, paddingRight: 4 }}>
              {CUSTOM_EMOJIS.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[s.emojiBtn, selectedEmoji === em && s.emojiBtnSelected]}
                  onPress={() => setSelectedEmoji(em)}
                  activeOpacity={0.7}
                >
                  <Text style={s.emojiChar}>{em}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => { setModalVisible(false); setNewLabel(''); setSelectedEmoji('🍽️'); }}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalAdd, { backgroundColor: newLabel.trim() ? '#A8C5A0' : '#E0DDD8' }]}
                onPress={addCustomItem}
                disabled={!newLabel.trim()}
              >
                <Text style={s.modalAddText}>{selectedEmoji}  Add</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  backBtn:  { paddingVertical: 8, paddingRight: 16 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },

  title:    { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 19, marginBottom: 16 },

  // Score card
  scoreCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 20,
    borderLeftWidth: 4,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  scoreLeft:  { flexDirection: 'row', alignItems: 'baseline', marginRight: 16 },
  scoreNum:   { fontSize: 36, fontWeight: '700', lineHeight: 40 },
  scoreDenom: { fontSize: 16, color: '#3D393560', fontWeight: '500', marginLeft: 2, marginBottom: 2 },
  scoreLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  scoreSub:   { fontSize: 12, color: '#3D3935', opacity: 0.45 },

  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 0.8, marginTop: 12, marginBottom: 6, marginLeft: 2,
  },

  categoryRow: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  catMainRow:  { flexDirection: 'row', alignItems: 'center' },
  catIcon:  { fontSize: 22, marginRight: 12 },
  catLabel: { fontSize: 14, fontWeight: '500', color: '#3D3935' },
  catNote:  { fontSize: 11, color: '#3D3935', opacity: 0.35, marginTop: 2 },
  removeText: { fontSize: 11, color: '#C4A0B0', marginTop: 3, fontWeight: '500' },
  infoBtn:      { paddingHorizontal: 6, paddingVertical: 2, marginRight: 4 },
  infoBtnText:  { fontSize: 14, color: '#3D393540', fontWeight: '500' },
  infoBtnOpen:  { color: '#A8C5A0' },
  tipPanel: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
  },
  tipText: { fontSize: 12, color: '#3D393599', lineHeight: 18, marginBottom: 8 },
  refRow: { gap: 2 },
  refCitation: { fontSize: 11, color: '#3D393555', lineHeight: 16, fontStyle: 'italic' },
  learnMore: { fontSize: 12, color: '#89B4CC', fontWeight: '600', marginTop: 4 },

  counter:            { flexDirection: 'row', alignItems: 'center', gap: 2 },
  counterBtn:         { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  counterBtnText:     { fontSize: 20, color: '#A8C5A0', fontWeight: '500', lineHeight: 24 },
  counterBtnDisabled: { color: '#3D393525' },
  counterVal:         { fontSize: 16, fontWeight: '600', color: '#3D3935', minWidth: 24, textAlign: 'center' },

  addCustomBtn: {
    borderWidth: 1.5, borderColor: '#A8C5A040', borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 16,
  },
  addCustomText: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },

  warningCard: { backgroundColor: '#E8DCC8', borderRadius: 12, padding: 14, marginBottom: 12 },
  warningText: { fontSize: 13, color: '#3D3935', opacity: 0.7, lineHeight: 19 },

  privacyNote: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 4 },
  privacyText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },

  // Diet note
  noteCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  noteLabel: { fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35, letterSpacing: 0.8, marginBottom: 8 },
  noteInput: {
    fontSize: 13, color: '#3D3935', lineHeight: 20, minHeight: 64,
    padding: 0,
  },

  // Log button
  logRow:   { marginTop: 16, alignItems: 'center' },
  loggedAt: { fontSize: 12, color: '#3D393560', marginBottom: 8, fontStyle: 'italic' },
  logBtn: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', minWidth: 200,
  },
  logBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.1 },

  // Modal
  overlay: {
    flex: 1, backgroundColor: '#00000040',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 10,
  },
  modalTitle:        { fontSize: 17, fontWeight: '700', color: '#3D3935', marginBottom: 10 },
  modalSectionLabel: { fontSize: 10, fontWeight: '700', color: '#3D3935', opacity: 0.35, letterSpacing: 0.8, marginBottom: 6 },
  // Quick suggestions
  suggestScroll: { marginBottom: 4 },
  suggestChip: {
    borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  suggestChipText: { fontSize: 13, color: '#3D3935', fontWeight: '500' },
  // Name input
  modalInput: {
    borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#3D3935', marginBottom: 12,
  },
  // Emoji picker
  emojiScroll: { marginBottom: 16 },
  emojiBtn: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F7F3EE',
  },
  emojiBtnSelected: { backgroundColor: '#A8C5A030', borderWidth: 1.5, borderColor: '#A8C5A0' },
  emojiChar: { fontSize: 20 },
  modalBtns:       { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel:     { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#F7F3EE' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#3D393580' },
  modalAdd:        { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalAddText:    { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
