import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Screen 04 — Cycle Tracker
// 4-state toggle, 90-day wave graph — Phase 3.
export default function TrackerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-mauve/20 items-center justify-center mb-4">
          <Text className="text-3xl">🌊</Text>
        </View>
        <Text className="text-charcoal text-2xl font-semibold mb-2">Cycle Tracker</Text>
        <Text className="text-charcoal/50 text-sm text-center">
          Mania, depressive, mixed, and stable tracking with 90-day wave graph — Phase 3.
        </Text>
      </View>
    </SafeAreaView>
  );
}
