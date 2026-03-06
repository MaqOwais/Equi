import '../global.css';
import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { CrisisOverlay } from '../components/ui/CrisisOverlay';

// Handle notifications while app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,  // no sounds — respects quiet environments
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const { setSession, setProfile, loadProfile } = useAuthStore();
  const notifs = useNotificationsStore();
  const router = useRouter();
  const notifResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Hydrate initial session on cold start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        notifs.registerToken(session.user.id);
        notifs.load(session.user.id);
      }
    });

    // Listen for sign-in / sign-out / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) setProfile(null);
      },
    );

    // Navigate to correct screen when user taps a notification
    notifResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const route = response.notification.request.content.data?.route as string | undefined;
        if (route) router.push(route as never);
      },
    );

    return () => {
      subscription.unsubscribe();
      notifResponseListener.current?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <CrisisOverlay />
    </SafeAreaProvider>
  );
}
