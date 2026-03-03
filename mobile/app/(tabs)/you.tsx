import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Screen 13 — Profile & Settings (You tab)
// Wellness radar, wearable sync, Relapse Signatures — Phase 3.
export default function YouScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-sage/20 items-center justify-center mb-4">
          <Text className="text-3xl">💜</Text>
        </View>
        <Text className="text-charcoal text-2xl font-semibold mb-2">You</Text>
        <Text className="text-charcoal/50 text-sm text-center">
          Your profile, settings, wearable sync, and relapse signatures — Phase 3.
        </Text>
      </View>
    </SafeAreaView>
  );
}
