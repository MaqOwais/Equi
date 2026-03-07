# Phase 5B — Quality & Observability

Equip Equi with production-grade crash reporting, performance monitoring, accessibility compliance, and offline resilience before any public release. A mental health app that silently crashes or loses data causes real harm — this phase ensures every failure mode is visible, logged, and recoverable.

← [Phase 5 README](./README.md)

---

## Crash Reporting — Sentry

### Why Sentry over Crashlytics

- React Native SDK with source map upload (stack traces point to TypeScript source, not minified JS)
- Session replay available (opt-in, off by default — never enable in a mental health app without explicit user consent)
- Zustand store state can be attached as breadcrumbs
- Self-hosted option available if HIPAA BAA becomes a requirement

### Install

```bash
npx expo install @sentry/react-native
npx sentry-wizard -i reactNative  # patches AppDelegate + MainApplication automatically
```

### Configure

**`lib/sentry.ts`**

```ts
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const IS_PRODUCTION = Constants.expoConfig?.extra?.ENV === 'production';

export function initialiseSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: IS_PRODUCTION,      // disabled in dev / Expo Go
    environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
    tracesSampleRate: 0.2,       // 20% of sessions traced for performance
    integrations: [
      Sentry.reactNativeTracingIntegration(),
    ],
    beforeSend(event) {
      // Strip any user identifiers before sending — GDPR
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        // Keep user.id (hashed) for deduplication only
      }
      return event;
    },
  });
}
```

Call in `app/_layout.tsx` root component — before any navigation renders.

### Capture manual errors

```ts
import * as Sentry from '@sentry/react-native';

// In catch blocks (stores, Edge Function calls):
Sentry.captureException(err, {
  tags: { feature: 'ai_report', action: 'generate' },
  extra: { userId: userId?.slice(0, 8) },  // never full UUID in prod
});
```

### Breadcrumbs from Zustand

Attach a Zustand middleware that logs state transitions as Sentry breadcrumbs (no sensitive data):

```ts
// stores/middleware/sentry-breadcrumb.ts
import * as Sentry from '@sentry/react-native';

export const sentryMiddleware = (config: any) => (set: any, get: any, api: any) =>
  config(
    (args: any) => {
      const prev = get();
      set(args);
      const next = get();
      // Log only boolean/numeric state changes — never content
      Sentry.addBreadcrumb({
        category: 'zustand',
        message: `${api.storeName}: isGenerating ${prev.isGenerating} → ${next.isGenerating}`,
        level: 'info',
      });
    },
    get,
    api,
  );
```

### Source map upload

In `eas.json`, Sentry source maps are uploaded automatically if the Sentry wizard ran correctly. Verify in `.sentry-wizard` config file or run:

```bash
npx sentry-cli sourcemaps explain <artifact-bundle-id>
```

---

## Performance Monitoring

### React Native Performance overlay

Enable during development to catch frame drops:

```ts
// In __DEV__ only:
import { PerformanceObserver, performance } from 'react-native';
```

Or use Flipper with the React DevTools plugin for component render profiling.

### Key performance targets

| Metric | Target | How measured |
|---|---|---|
| Time to interactive (cold launch) | < 3 seconds | Sentry trace, from `Deno.serve` start to first frame |
| Home screen render | < 400ms after auth | Sentry `startTransaction` in `_layout.tsx` |
| AI report generation | < 12 seconds | Sentry `startSpan` wrapping `callGroq` |
| Scroll frame rate | 60 fps | RN Perf Monitor |
| Supabase query (single table) | < 300ms | Sentry DB query span |

### Sentry performance tracing

```ts
// Wrap key operations
const span = Sentry.startSpan({ name: 'ai.generate', op: 'ai' }, async () => {
  return await callGroq(messages);
});
```

### Bundle size audit

```bash
# Analyse the Metro bundle
npx react-native-bundle-visualizer

# Or with expo:
npx expo export --platform ios
# Then inspect .expo/dist/ with source-map-explorer
npx source-map-explorer --only-mapped .expo/dist/bundles/index.ios.js
```

**Size budget targets:**

| Platform | JS bundle budget |
|---|---|
| iOS | < 4 MB (gzipped) |
| Android | < 5 MB (AAB) |

Common bundle bloat sources:
- `moment.js` → replace with `date-fns` (already done)
- Lodash full import → use `import debounce from 'lodash/debounce'`
- Unused icon sets → only import used icon families from `@expo/vector-icons`
- `react-native-svg` is large but necessary for the cycle graph — keep it

### Memory profiling

Use Xcode Instruments (Memory Graph) or Android Studio Memory Profiler:
- Launch app, navigate through all 5 tabs, return to Home
- Total heap should return to baseline — no retained cycles
- Common RN leak: `useEffect` subscriptions not cleaned up (Supabase Realtime channels)

Ensure every `supabase.channel()` subscription has a cleanup:
```ts
useEffect(() => {
  const channel = supabase.channel('my-channel').subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

---

## Accessibility

Equi serves a population that may use accessibility tools during depressive episodes (low energy → large text, screen reader) or manic episodes (fast navigation, impulsive taps). Accessibility is not optional.

### iOS VoiceOver / Android TalkBack

Every interactive element must have:

```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Log today's cycle state as Stable"
  accessibilityHint="Double tap to save"
>
```

**Audit checklist:**
- [ ] All buttons have `accessibilityLabel`
- [ ] All icons have `accessibilityLabel` or `accessibilityElementsHidden={true}` (if decorative)
- [ ] Tab bar icons have descriptive labels (not "tab, 3 of 5")
- [ ] Modal `accessibilityViewIsModal={true}` to trap focus
- [ ] Loading states announce with `accessibilityLiveRegion="polite"`
- [ ] Error messages announced via `accessibilityLiveRegion="assertive"`

### Minimum tap target size

Apple HIG: **44 × 44 pts** minimum. Android: **48 × 48 dp**.

Add invisible padding to small elements:
```tsx
<TouchableOpacity
  style={{ padding: 8 }}  // increases tap area without changing visual size
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
```

### Dynamic Type (iOS) / Font Scale (Android)

All `fontSize` values must scale with the user's system font size setting:
- Use `StyleSheet.create` with `fontSize` — Expo automatically honours Dynamic Type
- Never use `allowFontScaling={false}` except for numeric displays (cycle intensity chips) where scaling would break layout
- Test at `XXXL` font size — all text must remain legible, no clipping

### Contrast ratios (WCAG AA)

| Element | Minimum ratio |
|---|---|
| Body text on white | 4.5:1 |
| Large text (18pt+) | 3:1 |
| Icon on background | 3:1 |

Equi color system contrast check:
- `#3D3935` on `#F7F3EE`: **10.4:1** ✅
- `#A8C5A0` on `#F7F3EE`: **2.4:1** ⚠️ — use charcoal text on sage-colored buttons, not white
- `#C4A0B0` on `#F7F3EE`: **3.1:1** — acceptable for large text only
- `#C9A84C` (gold) on `#FFFFFF`: **2.9:1** ⚠️ — only use gold for decorative elements, not body text

### Reduced Motion

Respect `AccessibilityInfo.isReduceMotionEnabled()`:
```ts
import { AccessibilityInfo } from 'react-native';

const prefersReducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
// Disable chart animations if true
```

---

## Offline Resilience

Core features must work without internet. The offline contract for Phase 5:

| Feature | Offline behaviour |
|---|---|
| Mood log | Queued locally → synced when connection restores |
| Cycle log | Queued locally |
| Journal write | Queued locally |
| Daily check-in | Queued locally |
| AI report generation | Fails gracefully: "Connect to internet to generate your report" |
| Push notifications | Already scheduled locally — not affected |
| Sleep log (manual) | Queued locally |
| Community feed | Shows cached posts (no new posts while offline) |

### Offline queue implementation

```ts
// lib/offline-queue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedWrite {
  id: string;
  table: string;
  row: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = 'equi_offline_queue';

export async function enqueue(table: string, row: Record<string, unknown>) {
  const existing: QueuedWrite[] = JSON.parse(
    (await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]'
  );
  existing.push({ id: crypto.randomUUID(), table, row, timestamp: Date.now() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
}

export async function flushQueue() {
  const queue: QueuedWrite[] = JSON.parse(
    (await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]'
  );
  if (queue.length === 0) return;

  const failed: QueuedWrite[] = [];
  for (const item of queue) {
    const { error } = await (supabase as any).from(item.table).insert(item.row);
    if (error) failed.push(item);
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
}
```

Wire `flushQueue()` to the NetInfo connection change event in `app/_layout.tsx`:

```ts
import NetInfo from '@react-native-community/netinfo';

useEffect(() => {
  const unsub = NetInfo.addEventListener((state) => {
    if (state.isConnected) flushQueue().catch(() => {});
  });
  return unsub;
}, []);
```

### Supabase Realtime reconnect

Supabase Realtime channels automatically reconnect. If a channel goes stale after > 30s offline, re-subscribe:

```ts
// In any screen that uses Realtime:
useEffect(() => {
  const channel = supabase.channel('community_posts').on(...).subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
// Expo Router re-mounts screens on focus — no manual reconnect needed
```

---

## E2E Testing — Maestro

Maestro is used for smoke tests of critical user flows. Runs on CI after every preview build.

### Install

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Test: complete a daily check-in

```yaml
# .maestro/daily-checkin.yaml
appId: com.equi.app
---
- launchApp
- tapOn: "Home"
- tapOn: "How are you feeling today?"
- tapOn: "Stable"
- tapOn: "Save"
- assertVisible: "Saved"
```

### Test: generate AI report

```yaml
# .maestro/ai-report.yaml
appId: com.equi.app
---
- launchApp
- tapOn: "You"
- tapOn: "AI Wellness Report"
- tapOn: "Generate weekly report"
- waitForAnimationToEnd:
    timeout: 15000
- assertVisible: "Summary"
```

### CI integration

```bash
maestro cloud --apiKey $MAESTRO_API_KEY .maestro/
```

### Test coverage targets

| Flow | Coverage target |
|---|---|
| Auth (OTP login) | Mandatory |
| Daily cycle log | Mandatory |
| Journal entry | Mandatory |
| Crisis mode activation | Mandatory |
| AI report generation | Mandatory |
| PDF export | Nice to have |
| Community post | Nice to have |

---

## Supabase Connection Hardening

### Connection pooling

Use Supabase's built-in PgBouncer (transaction mode) for the mobile client. Set in `supabase.ts`:

```ts
// For read-heavy mobile client, PgBouncer is the default.
// No change needed in supabase-js — it uses the REST API, not direct PostgreSQL.
```

### RLS policy performance

Add indexes for all commonly-filtered RLS policies:

```sql
-- All tables that RLS filters by user_id
create index if not exists idx_mood_logs_user_id on mood_logs(user_id);
create index if not exists idx_cycle_logs_user_id on cycle_logs(user_id);
create index if not exists idx_sleep_logs_user_id on sleep_logs(user_id);
create index if not exists idx_social_rhythm_logs_user_id on social_rhythm_logs(user_id);
create index if not exists idx_ai_reports_user_id_type on ai_reports(user_id, report_type);
create index if not exists idx_activity_completions_user_id on activity_completions(user_id);
```

### Query timeouts

Set client-side timeout for all critical queries to prevent UI hangs:

```ts
const { data, error } = await supabase
  .from('mood_logs')
  .select('*')
  .abortSignal(AbortSignal.timeout(5000))  // 5s timeout
  .eq('user_id', userId);
```

---

## Pre-Release Quality Gate

Before submitting to App Store (5D), all items must pass:

### Automated
- [ ] Zero TypeScript errors (`npx tsc --noEmit`)
- [ ] All Maestro smoke tests pass on iOS and Android
- [ ] Sentry error rate < 0.1% on preview build after 48h of beta use
- [ ] Bundle size within budget (see above)

### Manual
- [ ] VoiceOver navigation through all 5 tabs — no unlabelled elements
- [ ] Large text (XXXL) renders correctly on all main screens
- [ ] App works for 30 minutes with Airplane Mode on (offline queue verified)
- [ ] App correctly handles session expiry (auto-refresh or login prompt)
- [ ] Crisis mode reachable from every screen within 2 taps
- [ ] No console.log statements shipping to production
- [ ] All placeholder text and TODO comments removed
