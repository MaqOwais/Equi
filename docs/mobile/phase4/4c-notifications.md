# Phase 4C — Smart Notifications

Push notifications for Equi are intentionally minimal and strictly opt-in. The goal is timely, useful nudges — not engagement-maximising pings. Every notification type is independently togglable. Notifications are automatically skipped if the relevant data has already been logged for the day.

← [Phase 4 README](./README.md)

---

## Notification Types

| Type | Default | Trigger | Auto-skip condition |
|---|---|---|---|
| **Daily mood check-in** | On | User-set time (default 8:00 PM) | Mood already logged today |
| **Medication reminder** | On (if tracking enabled) | User-set time (default 8:00 AM) | Medication already logged today |
| **Weekly report ready** | On | Sunday 10:00 AM | Already viewed this week's report |
| **Early warning alert** | On | AI detects risk pattern | User has acknowledged this alert |
| **Routine anchor nudge** | Off | Per-anchor, 15 min before target | Anchor already logged today |
| **Crisis check-in** | Off | 24h after SOS button used | — |

**Early warning alert** is the only system-triggered notification. All others are time-based. There are no "you haven't opened the app in 3 days" notifications — that pattern is deliberately excluded.

---

## Notification Settings Screen

Route: `/(tabs)/you/notifications`
Entry: `You → Settings → Notifications`

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Notifications            │
│                             │
│  REMINDERS                  │
│  ┌───────────────────────┐  │
│  │  😊  Mood check-in    │  │
│  │  Daily reminder       │  │
│  │  ─────────────────    │  │
│  │  Time:  8:00 PM  ›    │  │
│  │  ─────────────────    │  │
│  │  Enabled      ◉       │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  💊  Medication       │  │
│  │  Shown if tracking on │  │
│  │  ─────────────────    │  │
│  │  Time:  8:00 AM  ›    │  │
│  │  ─────────────────    │  │
│  │  Enabled      ◉       │  │
│  └───────────────────────┘  │
│                             │
│  INSIGHTS                   │
│  ┌───────────────────────┐  │
│  │  📊  Weekly report    │  │
│  │  Sunday 10:00 AM      │  │
│  │  Enabled      ◉       │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  ⚠️  Early warnings   │  │
│  │  When AI flags risk   │  │
│  │  Enabled      ◉       │  │
│  └───────────────────────┘  │
│                             │
│  ROUTINE                    │
│  ┌───────────────────────┐  │
│  │  🗓  Anchor nudges    │  │
│  │  15 min before each   │  │
│  │  routine anchor time  │  │
│  │  Enabled      ○       │  ← off by default
│  └───────────────────────┘  │
│                             │
│  SAFETY                     │
│  ┌───────────────────────┐  │
│  │  🛟  Post-crisis      │  │
│  │  Check-in 24h after   │  │
│  │  SOS button use       │  │
│  │  Enabled      ○       │  │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

**Time picker sheet (tap a time):**
```
┌─────────────────────────────┐
│  Mood check-in time         │
│                             │
│     ▲            ▲          │
│     7    :   45  PM         │
│     8    :   00  PM  ←      │ ← selected
│     9    :   15  PM         │
│     ▼            ▼          │
│                             │
│  [ Save ]                   │
└─────────────────────────────┘
```

</details>

---

## Early Warning Alert

The only AI-triggered notification. Sent when the AI report generation detects that 3+ of the user's personal relapse signature warning signs have been observed in the last 5 days of data.

**Content:**
```
⚠️  Equi noticed something
Your recent patterns match some of your personal early warning signs.
Tap to review in your AI Wellness Report.
```

The notification navigates to the AI Wellness Report, pre-scrolled to the Early Warning Flags section.

**Trigger logic (in `stores/ai.ts` after report generation):**
```ts
if (rj.early_warning_flags.length >= 2) {
  await scheduleEarlyWarningNotification();
}
```

The notification is only sent once per report generation. It is never sent for the same report twice.

---

## Post-Crisis Check-in

Sent 24 hours after the user opens the CrisisOverlay (detected by a timestamp stored on close). Navigates to the Today screen.

**Content:**
```
🛟  How are you doing?
Yesterday was difficult. We're checking in. Tap to log today.
```

This notification is the only one that can be sent at an unusual hour — if the crisis was at 3 AM, the check-in fires at 3 AM the next day.

---

## Data Model

### `notification_preferences` table

```sql
create table notification_preferences (
  id                    uuid default gen_random_uuid() primary key,
  user_id               uuid references auth.users on delete cascade not null unique,
  push_token            text,                -- Expo push token
  push_token_updated_at timestamptz,

  -- Reminders
  checkin_enabled       boolean default true,
  checkin_time          time    default '20:00:00',
  medication_enabled    boolean default true,
  medication_time       time    default '08:00:00',

  -- Insights
  weekly_report_enabled boolean default true,
  early_warning_enabled boolean default true,

  -- Routine
  anchor_nudges_enabled boolean default false,

  -- Safety
  post_crisis_enabled   boolean default false,

  updated_at            timestamptz default now()
);

alter table notification_preferences enable row level security;
create policy "Users own their notification preferences"
  on notification_preferences for all using (auth.uid() = user_id);
```

---

## Implementation Notes

### Expo Notifications Setup

**Package:**
```bash
npx expo install expo-notifications expo-device
```

**`app.json` plugin:**
```json
{
  "plugins": [
    ["expo-notifications", {
      "icon": "./assets/notification-icon.png",
      "color": "#A8C5A0"
    }]
  ]
}
```

**`lib/notifications.ts`:**
```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;  // no push on simulator

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing !== 'granted'
    ? await Notifications.requestPermissionsAsync()
    : { status: existing };

  if (status !== 'granted') return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function scheduleDailyCheckin(time: { hour: number; minute: number }) {
  await Notifications.cancelAllScheduledNotificationsAsync();  // clear old
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "How are you feeling today?",
      body: "Tap to log your mood — it takes 5 seconds.",
      data: { route: '/(tabs)' },
    },
    trigger: {
      hour: time.hour,
      minute: time.minute,
      repeats: true,
    },
  });
}
```

### Skip Logic

Before a scheduled notification fires, a Supabase Edge Function `check-and-send` runs (triggered by pg_cron). It checks whether the data is already logged and cancels the notification if so:

```ts
// Edge Function: check-and-send
const today = new Date().toISOString().split('T')[0];
const { data: moodLog } = await supabase
  .from('mood_logs')
  .select('id')
  .eq('user_id', userId)
  .eq('logged_at::date', today)
  .maybeSingle();

if (moodLog) return;  // already logged — skip notification

await sendExpoPushNotification(pushToken, { ... });
```

### Notification Handler (in `app/_layout.tsx`)

```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,  // no sounds — respects quiet environments
    shouldSetBadge: false,
  }),
});
```

Navigation on tap: use `useNotificationResponse` hook in `_layout.tsx` to read `notification.request.content.data.route` and call `router.push()`.

### Stores

**`stores/notifications.ts`** — new Zustand store:
- `prefs: NotificationPreferences | null`
- `load(userId)` — fetch preferences from table
- `save(userId, updates)` — upsert preferences + reschedule notifications
- `registerToken(userId)` — request permission, get token, save to table

---

## Checklist

- [ ] `notification_preferences` table created in Supabase
- [ ] `lib/notifications.ts` — token registration, daily schedule, early warning, post-crisis
- [ ] `stores/notifications.ts` — load, save, registerToken
- [ ] `app/(tabs)/you/notifications.tsx` — settings screen with all toggles + time pickers
- [ ] `app/_layout.tsx` — notification handler + tap navigation
- [ ] Supabase Edge Function `check-and-send` — skip-if-logged logic
- [ ] pg_cron jobs for nightly Edge Function calls
- [ ] CrisisOverlay — record `crisis_opened_at` timestamp on open for post-crisis check-in
- [ ] Early warning trigger in `stores/ai.ts` after report generation
