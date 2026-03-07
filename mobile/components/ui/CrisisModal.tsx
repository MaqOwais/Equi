import { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCrisisStore } from '../../stores/crisis';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  name: string;
  phone: string;
}

// ─── Breathing constants ──────────────────────────────────────────────────────

const BREATH_PHASES = ['Breathe in', 'Hold', 'Breathe out', 'Hold'];
const BREATH_SECONDS = [4, 4, 4, 4];

// ─── 54321 Grounding steps ────────────────────────────────────────────────────

const GROUNDING_STEPS = [
  { num: 5, instruction: 'Name 5 things you can see right now.' },
  { num: 4, instruction: 'Notice 4 things you can physically touch.' },
  { num: 3, instruction: 'Listen for 3 sounds around you.' },
  { num: 2, instruction: 'Find 2 things you can smell.' },
  { num: 1, instruction: 'Notice 1 thing you can taste.' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CrisisModal() {
  const { visible, close } = useCrisisStore();
  const { session } = useAuthStore();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showGrounding, setShowGrounding] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [groundStep, setGroundStep] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0);
  const [breathCount, setBreathCount] = useState(BREATH_SECONDS[0]);

  // Refs so the interval closure always has current values
  const breathPhaseRef = useRef(0);
  const breathCountRef = useRef(BREATH_SECONDS[0]);

  // Load emergency contacts when modal opens
  useEffect(() => {
    if (!visible || !session?.user.id) return;
    supabase
      .from('emergency_contacts')
      .select('name, phone')
      .eq('user_id', session.user.id)
      .order('created_at')
      .then(({ data }) => setContacts((data as Contact[]) ?? []));
  }, [visible, session?.user.id]);

  // Box breathing ticker
  useEffect(() => {
    if (!showBreathing) {
      breathPhaseRef.current = 0;
      breathCountRef.current = BREATH_SECONDS[0];
      return;
    }
    breathPhaseRef.current = 0;
    breathCountRef.current = BREATH_SECONDS[0];
    setBreathPhase(0);
    setBreathCount(BREATH_SECONDS[0]);

    const interval = setInterval(() => {
      breathCountRef.current -= 1;
      if (breathCountRef.current <= 0) {
        breathPhaseRef.current = (breathPhaseRef.current + 1) % 4;
        breathCountRef.current = BREATH_SECONDS[breathPhaseRef.current];
        setBreathPhase(breathPhaseRef.current);
      }
      setBreathCount(breathCountRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [showBreathing]);

  function handleClose() {
    setShowGrounding(false);
    setShowBreathing(false);
    setGroundStep(0);
    close();
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={s.hero}>
            <Text style={s.heroTitle}>You are not alone.</Text>
            <Text style={s.heroSub}>
              Take a slow breath.{'\n'}We're here with you.
            </Text>
          </View>

          {/* Emergency contacts (from profile setup) */}
          {contacts.length > 0 && (
            <>
              <Text style={s.sectionLabel}>YOUR CONTACTS</Text>
              {contacts.map((c) => (
                <View key={c.phone} style={s.card}>
                  <View style={s.cardInfo}>
                    <Text style={s.cardName}>👤  {c.name}</Text>
                    <Text style={s.cardPhone}>{c.phone}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => Linking.openURL(`tel:${c.phone.replace(/\D/g, '')}`)}
                  >
                    <Text style={s.actionBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* Hardcoded crisis lines */}
          <Text style={s.sectionLabel}>CRISIS LINES</Text>

          <View style={s.card}>
            <View style={s.cardInfo}>
              <Text style={s.cardName}>🆘  988 Lifeline</Text>
              <Text style={s.cardPhone}>Call or text 988  ·  24/7  ·  Free</Text>
            </View>
            <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL('tel:988')}>
              <Text style={s.actionBtnText}>Call</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <View style={s.cardInfo}>
              <Text style={s.cardName}>💬  Crisis Text Line</Text>
              <Text style={s.cardPhone}>Text HOME to 741741</Text>
            </View>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => Linking.openURL('sms:741741&body=HOME')}
            >
              <Text style={s.actionBtnText}>Text</Text>
            </TouchableOpacity>
          </View>

          {/* Quick grounding */}
          <Text style={s.sectionLabel}>QUICK GROUNDING</Text>

          {/* 54321 */}
          <TouchableOpacity
            style={s.card}
            onPress={() => { setShowGrounding((v) => !v); setGroundStep(0); }}
            activeOpacity={0.8}
          >
            <View style={s.exerciseHeader}>
              <Text style={s.cardName}>🖐  54321 Grounding</Text>
              <Text style={s.cardPhone}>{showGrounding ? 'Tap to close' : 'Start right now (5 min)'}</Text>
            </View>
          </TouchableOpacity>

          {showGrounding && (
            <View style={s.exerciseCard}>
              <Text style={s.exerciseStepLabel}>
                Step {groundStep + 1} of {GROUNDING_STEPS.length}
              </Text>
              <Text style={s.exerciseNum}>{GROUNDING_STEPS[groundStep].num}</Text>
              <Text style={s.exerciseText}>{GROUNDING_STEPS[groundStep].instruction}</Text>
              <View style={s.exerciseNav}>
                {groundStep > 0 && (
                  <TouchableOpacity
                    style={s.navBtn}
                    onPress={() => setGroundStep((v) => v - 1)}
                  >
                    <Text style={s.navBtnText}>← Back</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }} />
                {groundStep < GROUNDING_STEPS.length - 1 ? (
                  <TouchableOpacity
                    style={[s.navBtn, s.navBtnPrimary]}
                    onPress={() => setGroundStep((v) => v + 1)}
                  >
                    <Text style={[s.navBtnText, s.navBtnTextPrimary]}>Next →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[s.navBtn, s.navBtnPrimary]}
                    onPress={() => setShowGrounding(false)}
                  >
                    <Text style={[s.navBtnText, s.navBtnTextPrimary]}>Done ✓</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* 1-min breathing */}
          <TouchableOpacity
            style={s.card}
            onPress={() => setShowBreathing((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={s.exerciseHeader}>
              <Text style={s.cardName}>🫁  1-Min Breathing</Text>
              <Text style={s.cardPhone}>{showBreathing ? 'Tap to stop' : '4-4-4-4 box breathing'}</Text>
            </View>
          </TouchableOpacity>

          {showBreathing && (
            <View style={s.breathCard}>
              <View style={s.breathCircle}>
                <Text style={s.breathPhaseText}>{BREATH_PHASES[breathPhase]}</Text>
                <Text style={s.breathCountText}>{breathCount}</Text>
              </View>
              <Text style={s.breathCycleLabel}>in  ·  hold  ·  out  ·  hold</Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity style={s.backBtn} onPress={handleClose} activeOpacity={0.8}>
            <Text style={s.backBtnText}>← Back to app</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },

  hero: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  heroTitle: {
    fontSize: 24, fontWeight: '700', color: '#3D3935',
    letterSpacing: -0.3, marginBottom: 10, textAlign: 'center',
  },
  heroSub: {
    fontSize: 15, color: '#3D3935', opacity: 0.55,
    lineHeight: 22, textAlign: 'center',
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#3D3935', marginBottom: 3 },
  cardPhone: { fontSize: 13, color: '#3D3935', opacity: 0.45 },

  actionBtn: {
    backgroundColor: '#A8C5A0', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16, marginLeft: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#F7F3EE' },

  exerciseHeader: { flex: 1 },

  exerciseCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  exerciseStepLabel: {
    fontSize: 11, color: '#A8C5A0', fontWeight: '700',
    letterSpacing: 0.5, marginBottom: 8,
  },
  exerciseNum: {
    fontSize: 52, fontWeight: '700', color: '#A8C5A030',
    position: 'absolute', right: 20, top: 16,
  },
  exerciseText: {
    fontSize: 17, color: '#3D3935', fontWeight: '500',
    lineHeight: 25, marginBottom: 20,
  },
  exerciseNav: { flexDirection: 'row', alignItems: 'center' },
  navBtn: {
    paddingVertical: 9, paddingHorizontal: 16,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E0DDD8',
  },
  navBtnPrimary: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A015' },
  navBtnText: { fontSize: 13, color: '#3D3935', opacity: 0.5, fontWeight: '500' },
  navBtnTextPrimary: { color: '#A8C5A0', opacity: 1, fontWeight: '600' },

  breathCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24,
    alignItems: 'center', marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  breathCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#A8C5A015', borderWidth: 2, borderColor: '#A8C5A060',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  breathPhaseText: { fontSize: 13, fontWeight: '600', color: '#A8C5A0', marginBottom: 4 },
  breathCountText: { fontSize: 36, fontWeight: '700', color: '#3D3935' },
  breathCycleLabel: { fontSize: 12, color: '#3D3935', opacity: 0.3, letterSpacing: 0.5 },

  footer: {
    paddingHorizontal: 22, paddingBottom: 24, paddingTop: 8,
    backgroundColor: '#F7F3EE',
  },
  backBtn: {
    backgroundColor: '#3D3935', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#F7F3EE' },
});
