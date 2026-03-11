import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';

const TIERS = [
  { label: '$3', cents: 300, desc: 'Buy the team a coffee' },
  { label: '$10', cents: 1000, desc: 'Keep the servers running' },
  { label: '$25', cents: 2500, desc: "Fund a month for someone who can't pay" },
  { label: '$50', cents: 5000, desc: 'Fund a new feature' },
] as const;

// Replace with your actual Stripe Payment Links
const PAYMENT_LINKS: Record<number, Record<string, string>> = {
  300:  { one_time: 'https://equiapp.com/donate?amount=300',  recurring: 'https://equiapp.com/donate?amount=300&mode=subscription' },
  1000: { one_time: 'https://equiapp.com/donate?amount=1000', recurring: 'https://equiapp.com/donate?amount=1000&mode=subscription' },
  2500: { one_time: 'https://equiapp.com/donate?amount=2500', recurring: 'https://equiapp.com/donate?amount=2500&mode=subscription' },
  5000: { one_time: 'https://equiapp.com/donate?amount=5000', recurring: 'https://equiapp.com/donate?amount=5000&mode=subscription' },
};

export default function DonateScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const userId = session?.user.id ?? '';

  const [selectedCents, setSelectedCents] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [recurring, setRecurring] = useState(false);

  function handleOpenPayment() {
    const cents = selectedCents ?? Math.round(parseFloat(customAmount || '0') * 100);
    if (!cents || cents < 100) {
      Alert.alert('Minimum donation', 'The minimum donation is $1.');
      return;
    }

    let url: string;
    if (selectedCents && PAYMENT_LINKS[selectedCents]) {
      url = PAYMENT_LINKS[selectedCents][recurring ? 'recurring' : 'one_time'];
      url += `&user=${userId}`;
    } else {
      url = `https://equiapp.com/donate?amount=${cents}&user=${userId}&mode=${recurring ? 'subscription' : 'payment'}`;
    }

    Linking.openURL(url);
  }

  const canProceed =
    selectedCents !== null ||
    (customAmount.length > 0 && parseFloat(customAmount) >= 1);

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Nav */}
          <View style={s.nav}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.backText}>←  Back</Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <Text style={s.title}>Keep Equi free{'\n'}for everyone</Text>
          <Text style={s.sub}>
            Equi has no ads and never sells your data. Every donation goes directly to development and keeping the app free for people who can't afford it.
          </Text>

          <View style={s.divider} />

          {/* Tier chips */}
          <View style={s.tierGrid}>
            {TIERS.map((t) => (
              <TouchableOpacity
                key={t.cents}
                style={[s.tier, selectedCents === t.cents && s.tierSelected]}
                onPress={() => {
                  setSelectedCents(t.cents);
                  setCustomAmount('');
                }}
                activeOpacity={0.8}
              >
                <Text style={[s.tierLabel, selectedCents === t.cents && s.tierLabelSelected]}>
                  {t.label}
                </Text>
                <Text style={[s.tierDesc, selectedCents === t.cents && s.tierDescSelected]}>
                  {t.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom amount */}
          <View style={s.customRow}>
            <Text style={s.customPrefix}>$</Text>
            <TextInput
              style={s.customInput}
              value={customAmount}
              onChangeText={(v) => {
                setCustomAmount(v);
                setSelectedCents(null);
              }}
              placeholder="Other amount"
              placeholderTextColor="#3D393550"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Frequency */}
          <View style={s.freqRow}>
            <TouchableOpacity
              style={[s.freqBtn, !recurring && s.freqBtnActive]}
              onPress={() => setRecurring(false)}
            >
              <Text style={[s.freqBtnText, !recurring && s.freqBtnTextActive]}>One-time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.freqBtn, recurring && s.freqBtnActive]}
              onPress={() => setRecurring(true)}
            >
              <Text style={[s.freqBtnText, recurring && s.freqBtnTextActive]}>Monthly</Text>
            </TouchableOpacity>
          </View>
          {recurring && <Text style={s.recurringNote}>Cancel anytime from the email Stripe sends you.</Text>}

          {/* CTA */}
          <TouchableOpacity
            style={[s.payBtn, !canProceed && s.payBtnDisabled]}
            onPress={handleOpenPayment}
            disabled={!canProceed}
            activeOpacity={0.85}
          >
            <Text style={s.payBtnText}>Continue to payment</Text>
          </TouchableOpacity>

          <Text style={s.stripeNote}>🔒  Secured by Stripe. Your card details never reach our servers.</Text>

          <View style={s.divider} />

          {/* Sponsor someone */}
          <View style={s.sponsorSection}>
            <Text style={s.sponsorTitle}>Sponsor someone</Text>
            <Text style={s.sponsorBody}>
              Know someone who needs Equi but can't pay? A $25+ donation automatically funds a month of access for someone on the sponsorship waitlist.
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  nav: { paddingTop: 12, paddingBottom: 4 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },

  title: { fontSize: 32, fontWeight: '700', color: '#3D3935', letterSpacing: -0.6, lineHeight: 40, marginTop: 20, marginBottom: 12 },
  sub: { fontSize: 14, color: '#3D3935', opacity: 0.5, lineHeight: 21, marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#E8DCC8', marginVertical: 24 },

  tierGrid: { gap: 10, marginBottom: 20 },
  tier: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  tierSelected: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A008' },
  tierLabel: { fontSize: 20, fontWeight: '700', color: '#3D3935', marginBottom: 2 },
  tierLabelSelected: { color: '#A8C5A0' },
  tierDesc: { fontSize: 13, color: '#3D3935', opacity: 0.4 },
  tierDescSelected: { opacity: 0.7 },

  customRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderBottomWidth: 1.5, borderBottomColor: '#E0DDD8', paddingBottom: 10, marginBottom: 24,
  },
  customPrefix: { fontSize: 18, fontWeight: '600', color: '#3D3935', opacity: 0.5 },
  customInput: { flex: 1, fontSize: 18, color: '#3D3935', paddingVertical: 4 },

  freqRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  freqBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0DDD8', alignItems: 'center',
  },
  freqBtnActive: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A015' },
  freqBtnText: { fontSize: 14, fontWeight: '600', color: '#3D3935', opacity: 0.45 },
  freqBtnTextActive: { color: '#A8C5A0', opacity: 1 },
  recurringNote: { fontSize: 12, color: '#3D3935', opacity: 0.35, marginBottom: 20 },

  payBtn: {
    backgroundColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12,
  },
  payBtnDisabled: { opacity: 0.4 },
  payBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  stripeNote: { fontSize: 12, color: '#3D3935', opacity: 0.35, textAlign: 'center', marginBottom: 4 },

  sponsorSection: { gap: 8 },
  sponsorTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935' },
  sponsorBody: { fontSize: 14, color: '#3D3935', opacity: 0.5, lineHeight: 21 },
});
