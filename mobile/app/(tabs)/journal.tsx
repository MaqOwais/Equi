import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Screen 03 — Journal
// Block editor, life events, social rhythm card — Phase 3.
export default function JournalScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-sky/20 items-center justify-center mb-4">
          <Text className="text-3xl">📓</Text>
        </View>
        <Text className="text-charcoal text-2xl font-semibold mb-2">Journal</Text>
        <Text className="text-charcoal/50 text-sm text-center">
          Block-based journal editor with life events and social rhythm — Phase 3.
        </Text>
      </View>
    </SafeAreaView>
  );
}
