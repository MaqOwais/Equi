import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, Linking, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth';
import { useCrisisStore } from '../../stores/crisis';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

// ─── Breathing Circle ─────────────────────────────────────────────────────────

function BreathingCircle() {
  const scale = useRef(new Animated.Value(0.4)).current;
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  useEffect(() => {
    let cancelled = false;

    function cycle() {
      if (cancelled) return;
      setPhase('inhale');
      Animated.timing(scale, { toValue: 1, duration: 4000, useNativeDriver: true }).start(() => {
        if (cancelled) return;
        setPhase('hold');
        setTimeout(() => {
          if (cancelled) return;
          setPhase('exhale');
          Animated.timing(scale, { toValue: 0.4, duration: 4000, useNativeDriver: true }).start(() => {
            setTimeout(cycle, 500);
          });
        }, 4000);
      });
    }

    cycle();
    return () => { cancelled = true; };
  }, []);

  const phaseLabels = { inhale: 'Breathe in…', hold: 'Hold…', exhale: 'Breathe out…' };

  return (
    <View style={bc.container}>
      <Animated.View style={[bc.outer, { transform: [{ scale }] }]}>
        <View style={bc.inner} />
      </Animated.View>
      <Text style={bc.label}>{phaseLabels[phase]}</Text>
    </View>
  );
}

const bc = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 16 },
  outer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#A8C5A030', alignItems: 'center', justifyContent: 'center',
  },
  inner: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#A8C5A0' },
  label: { marginTop: 12, fontSize: 14, color: '#FFFFFF', opacity: 0.6 },
});

// ─── 54321 Grounding ──────────────────────────────────────────────────────────

const GROUNDING_STEPS = [
  { count: 5, sense: 'see', emoji: '👁' },
  { count: 4, sense: 'touch', emoji: '✋' },
  { count: 3, sense: 'hear', emoji: '👂' },
  { count: 2, sense: 'smell', emoji: '👃' },
  { count: 1, sense: 'taste', emoji: '👅' },
];

function GroundingTool() {
  const [step, setStep] = useState(0);
  const done = step >= GROUNDING_STEPS.length;
  const current = GROUNDING_STEPS[step];

  return (
    <View style={gt.container}>
      {done ? (
        <View style={gt.done}>
          <Text style={gt.doneText}>You did it. Take a slow breath.</Text>
          <TouchableOpacity onPress={() => setStep(0)} style={gt.restart}>
            <Text style={gt.restartText}>Start again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={gt.instruction}>
            {current.emoji}  Name {current.count} thing{current.count > 1 ? 's' : ''} you can {current.sense}
          </Text>
          <Text style={gt.stepCounter}>{step + 1} of {GROUNDING_STEPS.length}</Text>
          <TouchableOpacity style={gt.nextBtn} onPress={() => setStep((s) => s + 1)}>
            <Text style={gt.nextBtnText}>
              {step < GROUNDING_STEPS.length - 1 ? 'Next →' : 'Done ✓'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const gt = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF10', borderRadius: 12, padding: 14 },
  instruction: { fontSize: 15, color: '#FFFFFF', lineHeight: 22, marginBottom: 6 },
  stepCounter: { fontSize: 12, color: '#FFFFFF', opacity: 0.4, marginBottom: 12 },
  nextBtn: { backgroundColor: '#A8C5A0', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  done: { alignItems: 'center' },
  doneText: { fontSize: 15, color: '#FFFFFF', marginBottom: 10 },
  restart: { paddingVertical: 6 },
  restartText: { fontSize: 13, color: '#A8C5A0', fontWeight: '500' },
});

// ─── Main Overlay ─────────────────────────────────────────────────────────────

const CRISIS_LINES = [
  { label: '988 Suicide & Crisis Lifeline', action: () => Linking.openURL('tel:988') },
  { label: 'Crisis Text: text HOME to 741741', action: () => Linking.openURL('sms:741741?body=HOME') },
  { label: 'NAMI Helpline: 1-800-950-6264', action: () => Linking.openURL('tel:18009506264') },
];

const STORAGE_KEY = 'equi:emergency_contacts';

export function CrisisOverlay() {
  const { visible, close } = useCrisisStore();
  const { session } = useAuthStore();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [activeTab, setActiveTab] = useState<'contacts' | 'grounding' | 'breathing'>('contacts');

  // Load contacts: AsyncStorage first (offline), then Supabase
  useEffect(() => {
    async function loadContacts() {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) setContacts(JSON.parse(cached));

      if (session?.user.id) {
        const { data } = await supabase
          .from('emergency_contacts')
          .select('id, name, phone')
          .eq('user_id', session.user.id)
          .order('created_at');
        if (data?.length) {
          setContacts(data as EmergencyContact[]);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      }
    }
    if (visible) loadContacts();
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.heading}>You are not alone.</Text>
            <TouchableOpacity onPress={close} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Inner tabs */}
          <View style={s.tabs}>
            {(['contacts', 'grounding', 'breathing'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.tab, activeTab === t && s.tabActive]}
                onPress={() => setActiveTab(t)}
              >
                <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>
                  {t === 'contacts' ? 'Contacts' : t === 'grounding' ? '5-4-3-2-1' : 'Breathing'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contacts tab */}
          {activeTab === 'contacts' && (
            <>
              <Text style={s.sectionLabel}>CALL SOMEONE YOU TRUST</Text>
              {contacts.length === 0 ? (
                <Text style={s.noContacts}>
                  No emergency contacts saved yet. Add them in Profile → Emergency Contacts.
                </Text>
              ) : (
                contacts.map((c) => (
                  <View key={c.id} style={s.contactRow}>
                    <View>
                      <Text style={s.contactName}>{c.name}</Text>
                      <Text style={s.contactPhone}>{c.phone}</Text>
                    </View>
                    <TouchableOpacity
                      style={s.callBtn}
                      onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, '')}`)}
                    >
                      <Text style={s.callBtnText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <Text style={[s.sectionLabel, { marginTop: 20 }]}>NATIONAL CRISIS LINES</Text>
              {CRISIS_LINES.map((line) => (
                <TouchableOpacity key={line.label} style={s.crisisLine} onPress={line.action}>
                  <Text style={s.crisisLineText}>{line.label}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Grounding tab */}
          {activeTab === 'grounding' && (
            <>
              <Text style={s.sectionLabel}>5-4-3-2-1 GROUNDING</Text>
              <Text style={s.toolDesc}>
                Anchor yourself to the present. Take your time with each step.
              </Text>
              <GroundingTool />
            </>
          )}

          {/* Breathing tab */}
          {activeTab === 'breathing' && (
            <>
              <Text style={s.sectionLabel}>1-MINUTE BREATHING</Text>
              <Text style={s.toolDesc}>
                Follow the circle. 4 counts in, 4 counts hold, 4 counts out.
              </Text>
              <BreathingCircle />
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1A1A1A', paddingTop: 54 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  heading: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3, flex: 1 },
  closeBtn: { paddingVertical: 4, paddingLeft: 16 },
  closeBtnText: { fontSize: 14, color: '#FFFFFF', opacity: 0.4 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#FFFFFF15', marginBottom: 20 },
  tab: { paddingVertical: 10, marginRight: 20 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#A8C5A0' },
  tabText: { fontSize: 14, color: '#FFFFFF', opacity: 0.35, fontWeight: '500' },
  tabTextActive: { opacity: 1, fontWeight: '700', color: '#A8C5A0' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#FFFFFF', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  toolDesc: { fontSize: 14, color: '#FFFFFF', opacity: 0.55, lineHeight: 20, marginBottom: 16 },

  noContacts: { fontSize: 14, color: '#FFFFFF', opacity: 0.35, lineHeight: 20, marginBottom: 16 },

  contactRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF08', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  contactName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  contactPhone: { fontSize: 13, color: '#FFFFFF', opacity: 0.45 },
  // Red is acceptable here — Design Rule #1 exception for crisis UI
  callBtn: { backgroundColor: '#C0392B', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 18 },
  callBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  crisisLine: {
    backgroundColor: '#FFFFFF08', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  crisisLineText: { fontSize: 14, color: '#A8C5A0', fontWeight: '500' },
});
