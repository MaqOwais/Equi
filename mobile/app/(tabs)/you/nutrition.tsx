import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import { supabase } from '../../../lib/supabase';
import { saveLocal, getLocal } from '../../../lib/local-day-store';
import type { Diagnosis } from '../../../types/database';

const db = supabase as any;

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { key: string; label: string; icon: string; note?: string }[] = [
  { key: 'anti_inflammatory', label: 'Anti-inflammatory', icon: '🫐', note: 'Berries, leafy greens, fatty fish, turmeric' },
  { key: 'whole_grains',      label: 'Whole Grains',      icon: '🌾', note: 'Oats, brown rice, quinoa' },
  { key: 'lean_protein',      label: 'Lean Protein',      icon: '🥚', note: 'Eggs, legumes, poultry' },
  { key: 'healthy_fats',      label: 'Healthy Fats',      icon: '🥑', note: 'Avocado, nuts, olive oil' },
  { key: 'fermented',         label: 'Fermented / Gut',   icon: '🥛', note: 'Yoghurt, kimchi, kefir' },
  { key: 'caffeine',          label: 'Caffeine',          icon: '☕', note: 'Coffee, tea, energy drinks' },
  { key: 'ultra_processed',   label: 'Ultra-Processed',   icon: '🍟', note: 'Packaged snacks, fast food' },
  { key: 'sugar_heavy',       label: 'Sugar-Heavy',       icon: '🍬', note: 'Sweets, sugary drinks' },
  { key: 'alcohol',           label: 'Alcohol',           icon: '🍷' },
  { key: 'hydration',         label: 'Hydration',         icon: '💧', note: 'Target: 8 glasses' },
  { key: 'lithium_interaction', label: 'Lithium-Watch',   icon: '⚠️', note: 'Grapefruit, excess sodium' },
];

const LITHIUM_DIAGNOSES: Diagnosis[] = ['bipolar_1', 'bipolar_2'];

function isoToday() {
  return new Date().toISOString().split('T')[0];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const { session, profile } = useAuthStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const showLithium = profile?.diagnosis
    ? LITHIUM_DIAGNOSES.includes(profile.diagnosis)
    : false;

  const visibleCategories = showLithium
    ? CATEGORIES
    : CATEGORIES.filter((c) => c.key !== 'lithium_interaction');

  useEffect(() => {
    if (userId) loadLog();
  }, [userId]);

  async function loadLog() {
    if (!userId) return;
    // Local first
    const local = await getLocal(userId, isoToday());
    if (local?.nutritionCategories) {
      setCounts(local.nutritionCategories);
      return;
    }
    // Fall back to Supabase
    const { data } = await db
      .from('nutrition_logs')
      .select('categories')
      .eq('user_id', userId)
      .eq('log_date', isoToday())
      .maybeSingle();
    if (data?.categories) {
      setCounts(data.categories as Record<string, number>);
    }
  }

  function adjust(key: string, delta: 1 | -1) {
    setCounts((prev) => {
      const next = { ...prev, [key]: Math.max(0, (prev[key] ?? 0) + delta) };
      scheduleSave(next);
      return next;
    });
    setSaved(false);
  }

  function scheduleSave(nextCounts: Record<string, number>) {
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(async () => {
      if (!userId) return;
      // Save locally first — Supabase sync deferred
      await saveLocal(userId, isoToday(), { nutritionCategories: nextCounts, nutritionTimestamp: new Date().toISOString() });
      setSaved(true);
    }, 1200);
    setSaveTimer(t);
  }

  // Lithium interaction warning
  const caffeineCount = counts['caffeine'] ?? 0;
  const showLithiumWarning = showLithium && caffeineCount >= 3;

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
          {saved && <Text style={s.savedTag}>Saved</Text>}
        </View>

        <Text style={s.title}>Nutrition</Text>
        <Text style={s.subtitle}>
          Track food quality — no calorie counting. Tap + or − to log servings today.
        </Text>

        {/* Category grid */}
        {visibleCategories.map((cat) => {
          const count = counts[cat.key] ?? 0;
          return (
            <View key={cat.key} style={s.categoryRow}>
              <Text style={s.catIcon}>{cat.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.catLabel}>{cat.label}</Text>
                {cat.note && <Text style={s.catNote}>{cat.note}</Text>}
              </View>
              <View style={s.counter}>
                <TouchableOpacity
                  style={s.counterBtn}
                  onPress={() => adjust(cat.key, -1)}
                  disabled={count === 0}
                >
                  <Text style={[s.counterBtnText, count === 0 && s.counterBtnDisabled]}>−</Text>
                </TouchableOpacity>
                <Text style={s.counterVal}>{count}</Text>
                <TouchableOpacity style={s.counterBtn} onPress={() => adjust(cat.key, 1)}>
                  <Text style={s.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Lithium warning */}
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  savedTag: { fontSize: 12, color: '#A8C5A0', fontWeight: '600' },

  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 19, marginBottom: 20 },

  categoryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  catIcon: { fontSize: 22, marginRight: 12 },
  catLabel: { fontSize: 14, fontWeight: '500', color: '#3D3935' },
  catNote: { fontSize: 11, color: '#3D3935', opacity: 0.35, marginTop: 2 },

  counter: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  counterBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { fontSize: 20, color: '#A8C5A0', fontWeight: '500', lineHeight: 24 },
  counterBtnDisabled: { color: '#3D393525' },
  counterVal: { fontSize: 16, fontWeight: '600', color: '#3D3935', minWidth: 24, textAlign: 'center' },

  warningCard: {
    backgroundColor: '#E8DCC8', borderRadius: 12, padding: 14, marginBottom: 12,
  },
  warningText: { fontSize: 13, color: '#3D3935', opacity: 0.7, lineHeight: 19 },

  privacyNote: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 4,
  },
  privacyText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },
});
