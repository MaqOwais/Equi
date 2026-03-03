import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Screen 05 — Activities
// All / Prescribed / Working for Me tabs — Phase 3.
export default function ActivitiesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-gold/20 items-center justify-center mb-4">
          <Text className="text-3xl">🎯</Text>
        </View>
        <Text className="text-charcoal text-2xl font-semibold mb-2">Activities</Text>
        <Text className="text-charcoal/50 text-sm text-center">
          Therapist-backed activities filtered by cycle phase — Phase 3.
        </Text>
      </View>
    </SafeAreaView>
  );
}
