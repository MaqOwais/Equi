import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-charcoal text-xl font-semibold mb-4">Screen not found</Text>
        <Link href="/" className="text-sage text-base">Go home</Link>
      </View>
    </>
  );
}
