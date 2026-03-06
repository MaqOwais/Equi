import '../global.css';
import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { CrisisOverlay } from '../components/ui/CrisisOverlay';

// expo-notifications was removed from Expo Go in SDK 53 — only load in builds.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

if (!IS_EXPO_GO) {
  // Handle notifications while app is foregrounded (dev/production builds only)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export default function RootLayout() {
  const { setSession, setProfile, loadProfile } = useAuthStore();
  const notifs = useNotificationsStore();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notifResponseListener = useRef<any>(null);

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

    // Navigate to correct screen when user taps a notification (dev/production only)
    if (!IS_EXPO_GO) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require('expo-notifications');
      notifResponseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response: { notification: { request: { content: { data?: { route?: string } } } } }) => {
          const route = response.notification.request.content.data?.route;
          if (route) router.push(route as never);
        },
      );
    }

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
