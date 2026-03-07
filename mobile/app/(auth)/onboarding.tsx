import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth';
import { DEV_MODE } from '../../constants/dev';
import type { Diagnosis, UserRole } from '../../types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactDraft = { name: string; phone: string };

// ─── Progress dots ─────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[s.dot, i === current && s.dotActive, i < current && s.dotDone]}
        />
      ))}
    </View>
  );
}

// ─── Shared card chip ─────────────────────────────────────────────────────

function Chip({
  label,
  sublabel,
  selected,
  onPress,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.chip, selected && s.chipSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[s.chipLabel, selected && s.chipLabelSelected]}>{label}</Text>
      {sublabel && (
        <Text style={[s.chipSub, selected && s.chipSubSelected]}>{sublabel}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export default function Onboarding() {
  const { session, loadProfile } = useAuthStore();

  // Shared
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient data
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [trackMedication, setTrackMedication] = useState<boolean | null>(null);
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Companion data
  const [companionRelationship, setCompanionRelationship] = useState<string | null>(null);
  const [companionEmail, setCompanionEmail] = useState('');

  // ── Step counts ────────────────────────────────────────────────────────

  // Step 0 = role selection (shared)
  // Patient: steps 1-5
  // Companion: steps 1-3
  const totalSteps = role === 'companion' ? 4 : 6; // 0-indexed

  // ── Navigation ─────────────────────────────────────────────────────────

  function goNext() {
    setError(null);
    setStep((s) => s + 1);
  }

  function goBack() {
    setError(null);
    if (step === 0) return;
    setStep((s) => s - 1);
  }

  // ── Completion ─────────────────────────────────────────────────────────

  async function finish() {
    if (!session) return;
    setLoading(true);
    setError(null);

    if (role === 'patient') {
      // Upsert profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          user_role: 'patient',
          diagnosis,
          track_medication: trackMedication ?? false,
          onboarding_complete: true,
        })
        .eq('id', session.user.id);

      if (profileErr) {
        setLoading(false);
        setError('Something went wrong saving your profile. Please try again.');
        return;
      }

      // Insert emergency contacts
      if (contacts.length > 0) {
        const { error: contactErr } = await supabase
          .from('emergency_contacts')
          .insert(
            contacts.map((c) => ({
              user_id: session.user.id,
              name: c.name,
              phone: c.phone,
              contact_type: 'emergency' as const,
            })),
          );

        if (contactErr) {
          setLoading(false);
          setError('Could not save emergency contacts. Please try again.');
          return;
        }
      }
    } else if (role === 'companion') {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          user_role: 'companion',
          companion_relationship: companionRelationship,
          onboarding_complete: true,
        })
        .eq('id', session.user.id);

      if (profileErr) {
        setLoading(false);
        setError('Something went wrong saving your profile. Please try again.');
        return;
      }
    }

    await loadProfile(session.user.id);
    setLoading(false);
    router.replace('/(tabs)');
  }

  // ── Add contact helper ─────────────────────────────────────────────────

  function addContact() {
    if (!contactName.trim() || !contactPhone.trim()) return;
    setContacts((prev) => [
      ...prev,
      { name: contactName.trim(), phone: contactPhone.trim() },
    ]);
    setContactName('');
    setContactPhone('');
  }

  // ── Slide renderers ────────────────────────────────────────────────────

  function renderSlide() {
    // Step 0: Role selection
    if (step === 0) {
      return (
        <View style={s.slide}>
          <Text style={s.slideTitle}>Welcome to Equi.</Text>
          <Text style={s.slideBody}>
            First, tell us how you'll be using the app.
          </Text>
          <Chip
            label="I'm tracking my own wellbeing"
            sublabel="Patient / self-tracker"
            selected={role === 'patient'}
            onPress={() => setRole('patient')}
          />
          <Chip
            label="I'm supporting someone I care about"
            sublabel="Well-wisher / companion"
            selected={role === 'companion'}
            onPress={() => setRole('companion')}
          />
        </View>
      );
    }

    // ── Patient slides ────────────────────────────────────────────────

    if (role === 'patient') {
      if (step === 1) {
        return (
          <View style={s.slide}>
            <Text style={s.slideTitle}>About your diagnosis.</Text>
            <Text style={s.slideBody}>
              This helps us personalise your experience. You can change this any time.
            </Text>
            {(
              [
                ['bipolar_1', 'Bipolar I', 'Distinct manic and depressive episodes'],
                ['bipolar_2', 'Bipolar II', 'Hypomania and depressive episodes'],
                ['cyclothymia', 'Cyclothymia', 'Milder mood fluctuations over time'],
                ['unsure', 'Not sure yet', 'Still figuring things out'],
              ] as [Diagnosis, string, string][]
            ).map(([val, label, sub]) => (
              <Chip
                key={val}
                label={label}
                sublabel={sub}
                selected={diagnosis === val}
                onPress={() => setDiagnosis(val)}
              />
            ))}
          </View>
        );
      }

      if (step === 2) {
        return (
          <View style={s.slide}>
            <Text style={s.slideTitle}>How you'll log mood.</Text>
            <Text style={s.slideBody}>
              Every day you'll rate how you feel on a 10-point scale. There are no right or wrong answers — only honest ones.
            </Text>
            <View style={s.moodRow}>
              {['😔', '😟', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩', '✨'].map(
                (em, i) => (
                  <View key={i} style={s.moodItem}>
                    <Text style={s.moodEmoji}>{em}</Text>
                    <Text style={s.moodNum}>{i + 1}</Text>
                  </View>
                ),
              )}
            </View>
            <Text style={s.skipHint}>
              This is just a preview — tap Continue to move on.
            </Text>
          </View>
        );
      }

      if (step === 3) {
        return (
          <View style={s.slide}>
            <Text style={s.slideTitle}>Your five spaces.</Text>
            <Text style={s.slideBody}>
              Equi is built around five areas of your daily life.
            </Text>
            {[
              ['Today', 'Your daily check-in, mood, and energy snapshot'],
              ['Journal', 'Write freely — entries stay private to you'],
              ['Tracker', 'Visualise your cycle over weeks and months'],
              ['Activities', 'Evidence-based exercises matched to your state'],
              ['You', 'Settings, safety plan, and wellbeing data'],
            ].map(([name, desc]) => (
              <View key={name} style={s.tourRow}>
                <Text style={s.tourName}>{name}</Text>
                <Text style={s.tourDesc}>{desc}</Text>
              </View>
            ))}
          </View>
        );
      }

      if (step === 4) {
        return (
          <View style={s.slide}>
            <Text style={s.slideTitle}>Medication.</Text>
            <Text style={s.slideBody}>
              Do you take medication for your mood condition?
            </Text>
            <Chip
              label="Yes"
              sublabel="I'd like to track it in Equi"
              selected={trackMedication === true}
              onPress={() => setTrackMedication(true)}
            />
            <Chip
              label="No / Not yet"
              selected={trackMedication === false}
              onPress={() => setTrackMedication(false)}
            />
          </View>
        );
      }

      if (step === 5) {
        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.slide}>
                <Text style={s.slideTitle}>Safety contacts.</Text>
                <Text style={s.slideBody}>
                  Add at least one person we can remind you to reach out to in a difficult moment. They won't be contacted automatically.
                </Text>

                {contacts.map((c, i) => (
                  <View key={i} style={s.contactCard}>
                    <Text style={s.contactName}>{c.name}</Text>
                    <Text style={s.contactPhone}>{c.phone}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setContacts((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <Text style={s.contactRemove}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <Text style={s.label}>Name</Text>
                <TextInput
                  style={s.input}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="e.g. Mum, Dr Ahmed"
                  placeholderTextColor="#3D393580"
                  autoCapitalize="words"
                />
                <Text style={s.label}>Phone</Text>
                <TextInput
                  style={s.input}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  placeholder="+44 7700 000000"
                  placeholderTextColor="#3D393580"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={[
                    s.addButton,
                    (!contactName.trim() || !contactPhone.trim()) && s.addButtonDisabled,
                  ]}
                  onPress={addContact}
                  disabled={!contactName.trim() || !contactPhone.trim()}
                >
                  <Text style={s.addButtonText}>+ Add contact</Text>
                </TouchableOpacity>

                {contacts.length === 0 && (
                  <Text style={s.skipHint}>
                    You need at least one contact to continue.
                  </Text>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        );
      }
    }

    // ── Companion slides ──────────────────────────────────────────────

    if (role === 'companion') {
      if (step === 1) {
        return (
          <View style={s.slide}>
            <Text style={s.slideTitle}>Your relationship.</Text>
            <Text style={s.slideBody}>
              How are you connected to the person you're supporting?
            </Text>
            {['Partner', 'Parent', 'Sibling', 'Friend', 'Other'].map((rel) => (
              <Chip
                key={rel}
                label={rel}
                selected={companionRelationship === rel.toLowerCase()}
                onPress={() => setCompanionRelationship(rel.toLowerCase())}
              />
            ))}
          </View>
        );
      }

      if (step === 2) {
        return (
          <View style={s.slide}>
            <Text style={s.slideTitle}>What you can see.</Text>
            <Text style={s.slideBody}>
              Equi is built around the patient's privacy and consent.
            </Text>
            {[
              ['✓', 'Mood summaries they choose to share'],
              ['✓', 'Cycle state (stable / elevated / low)'],
              ['✓', 'Activity streaks and wellbeing goals'],
              ['✗', 'Journal entries — always private'],
              ['✗', 'AI reports — unless they share them'],
              ['✗', 'Medication details — unless they share them'],
            ].map(([icon, text], i) => (
              <View key={i} style={s.accessRow}>
                <Text style={[s.accessIcon, icon === '✗' && s.accessDenied]}>
                  {icon}
                </Text>
                <Text style={s.accessText}>{text}</Text>
              </View>
            ))}
          </View>
        );
      }

      if (step === 3) {
        return (
          <View style={s.slide}>
            <Text style={s.slideTitle}>Connect with them.</Text>
            <Text style={s.slideBody}>
              Enter the email address of the person you want to support. They'll receive a connection request in Equi.
            </Text>
            <Text style={s.label}>Their email</Text>
            <TextInput
              style={s.input}
              value={companionEmail}
              onChangeText={setCompanionEmail}
              placeholder="their@email.com"
              placeholderTextColor="#3D393580"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={s.skipHint}>
              You can also connect later from your profile.
            </Text>
          </View>
        );
      }
    }

    return null;
  }

  // ── Can advance? ───────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (step === 0) return role !== null;
    if (role === 'patient') {
      if (step === 1) return diagnosis !== null;
      if (step === 2 || step === 3) return true; // skippable
      if (step === 4) return trackMedication !== null;
      if (step === 5) return contacts.length >= 1;
    }
    if (role === 'companion') {
      if (step === 1) return companionRelationship !== null;
      if (step === 2) return true; // informational
      if (step === 3) return true; // email optional (can connect later)
    }
    return false;
  }

  const isLastStep =
    (role === 'patient' && step === 5) ||
    (role === 'companion' && step === 3);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.waveBar} />

      <View style={s.header}>
        {step > 0 ? (
          <TouchableOpacity onPress={goBack}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <ProgressDots total={totalSteps} current={step} />
      </View>

      <View style={{ flex: 1 }}>
        {renderSlide()}
      </View>

      {error && <Text style={s.errorGlobal}>{error}</Text>}

      {DEV_MODE && (
        <TouchableOpacity
          style={s.devSkip}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={s.devSkipText}>⚙ Dev: skip to app</Text>
        </TouchableOpacity>
      )}

      <View style={s.footer}>
        <TouchableOpacity
          style={[
            s.button,
            (!canAdvance() || loading) && s.buttonDisabled,
          ]}
          onPress={isLastStep ? finish : goNext}
          disabled={!canAdvance() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.buttonText}>
              {isLastStep ? "Let's go →" : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  waveBar: {
    height: 6,
    backgroundColor: '#A8C5A0',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backText: {
    fontSize: 15,
    color: '#A8C5A0',
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3D393520',
  },
  dotActive: {
    backgroundColor: '#A8C5A0',
    width: 18,
  },
  dotDone: {
    backgroundColor: '#A8C5A080',
  },

  // Slide
  slide: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D3935',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  slideBody: {
    fontSize: 15,
    color: '#3D3935',
    opacity: 0.55,
    lineHeight: 22,
    marginBottom: 28,
  },
  skipHint: {
    fontSize: 13,
    color: '#3D3935',
    opacity: 0.4,
    marginTop: 12,
    textAlign: 'center',
  },

  // Chip
  chip: {
    borderWidth: 1.5,
    borderColor: '#3D393520',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF60',
  },
  chipSelected: {
    borderColor: '#A8C5A0',
    backgroundColor: '#A8C5A015',
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3D3935',
  },
  chipLabelSelected: {
    color: '#3D3935',
    fontWeight: '600',
  },
  chipSub: {
    fontSize: 13,
    color: '#3D3935',
    opacity: 0.45,
    marginTop: 2,
  },
  chipSubSelected: {
    opacity: 0.6,
  },

  // Mood scale
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moodItem: {
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodNum: {
    fontSize: 11,
    color: '#3D3935',
    opacity: 0.4,
    marginTop: 2,
  },

  // Tour rows
  tourRow: {
    marginBottom: 14,
  },
  tourName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3D3935',
  },
  tourDesc: {
    fontSize: 13,
    color: '#3D3935',
    opacity: 0.5,
    marginTop: 2,
    lineHeight: 18,
  },

  // Companion access rows
  accessRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  accessIcon: {
    fontSize: 15,
    color: '#A8C5A0',
    fontWeight: '700',
    width: 18,
  },
  accessDenied: {
    color: '#C4A0B0',
  },
  accessText: {
    fontSize: 14,
    color: '#3D3935',
    opacity: 0.7,
    flex: 1,
    lineHeight: 20,
  },

  // Contact inputs
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3935',
    opacity: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#A8C5A0',
    paddingVertical: 10,
    fontSize: 16,
    color: '#3D3935',
    marginBottom: 20,
  },
  addButton: {
    borderWidth: 1.5,
    borderColor: '#A8C5A0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonDisabled: {
    borderColor: '#3D393530',
  },
  addButtonText: {
    fontSize: 15,
    color: '#A8C5A0',
    fontWeight: '600',
  },
  contactCard: {
    backgroundColor: '#A8C5A015',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3D3935',
    flex: 1,
  },
  contactPhone: {
    fontSize: 13,
    color: '#3D3935',
    opacity: 0.5,
    marginRight: 12,
  },
  contactRemove: {
    fontSize: 13,
    color: '#C4A0B0',
  },

  // Footer / button
  errorGlobal: {
    fontSize: 13,
    color: '#C4A0B0',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  button: {
    backgroundColor: '#A8C5A0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  devSkip: {
    marginHorizontal: 24,
    marginBottom: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  devSkipText: {
    fontSize: 13,
    color: '#3D393550',
  },
});
