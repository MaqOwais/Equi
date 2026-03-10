/**
 * Sentry crash reporting — Phase 5B.
 *
 * Install when switching to dev client / production build:
 *   npx expo install @sentry/react-native
 *   npx sentry-wizard -i reactNative
 *
 * In Expo Go: Sentry is disabled (IS_EXPO_GO guard). No crash to worry about.
 */

import Constants from 'expo-constants';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
const IS_PRODUCTION = Constants.expoConfig?.extra?.ENV === 'production';

// Lazy-load Sentry only in non-Expo Go environments to avoid native crash
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null;

export function initialiseSentry() {
  if (IS_EXPO_GO) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      enabled: IS_PRODUCTION,
      environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
      tracesSampleRate: 0.2,
      beforeSend(event: Record<string, unknown> & { user?: Record<string, unknown> }) {
        // Strip PII before sending — GDPR
        if (event.user) {
          delete event.user.email;
          delete event.user.username;
        }
        return event;
      },
    });
  } catch {
    // @sentry/react-native not installed yet — safe to ignore in development
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!Sentry) return;
  Sentry.captureException(err, { extra: context });
}

export function addBreadcrumb(message: string, category = 'app') {
  if (!Sentry) return;
  Sentry.addBreadcrumb({ category, message, level: 'info' });
}
