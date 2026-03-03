import { Stack } from 'expo-router';

// Auth screens (login, signup, onboarding) — wired up in Phase 3.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
