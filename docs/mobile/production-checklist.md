# Equi — Dev → Production Checklist

Everything that must change or be verified when moving from Expo Go dev mode to a production build.

---

## 1. Environment & Build

| # | What | Dev (Expo Go) | Production |
|---|------|---------------|------------|
| 1 | Database | SQLite via `dev-db.ts` | Supabase (Postgres) |
| 2 | Auth | Mock session, no OTP | Real Supabase OTP (email/SMS) |
| 3 | Build system | `npx expo start` + QR scan | `eas build --profile production` |
| 4 | Bundle ID | N/A | `com.equi.app` (iOS + Android) |
| 5 | Environment vars | `.env.local` | EAS Secrets (never in repo) |

### EAS Secrets to set before production build

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
eas secret:create --scope project --name GROQ_API_KEY --value "..."          # server-side only
eas secret:create --scope project --name PERSPECTIVE_API_KEY --value "..."   # server-side only
eas secret:create --scope project --name SENTRY_DSN --value "..."
```

---

## 2. Supabase Schema

Run all SQL migrations in the Supabase dashboard (SQL editor) before first production deployment.

### Migration files location
`docs/mobile/supabase/` — run in numerical order.

### Tables that need RLS policies verified
- `profiles` — user can only read/write own row
- `medications` — user can only read/write own rows
- `user_substances` — user can only read/write own rows
- `notification_preferences` — user can only read/write own row
- `journal_entries` — user can only read/write own rows
- `community_posts` — read: all authenticated; write: own rows only; delete: own rows only
- `companions` — patient can CRUD; companion can read only what patient shared
- `psychiatrists_public` — read: all authenticated; write: admin only

### Required Supabase functions / triggers
- `handle_new_user()` — auto-creates `profiles` row on `auth.users` INSERT
- `moderate_post()` — Edge Function called on `community_posts` INSERT (requires `PERSPECTIVE_API_KEY`)

### Required Supabase Edge Functions
- `moderate-post` — community content moderation
- `generate-ai-report` — weekly Groq AI report (requires `GROQ_API_KEY`)
- `send-early-warning` — called by AI report if relapse signatures matched

---

## 3. Notifications

| # | What | Dev | Production |
|---|------|-----|------------|
| 1 | Push notifications | Silent no-ops (Expo Go blocks them) | Fully functional |
| 2 | Push token | Not registered | Registered via `registerToken()` in auth store |
| 3 | Android channels | Not created | Created by `ensureChannels()` on first schedule |
| 4 | EAS projectId | Not needed | **Required** — set in `app.json` under `expo.extra.eas.projectId` |
| 5 | APNs entitlement (iOS) | Not needed | Add push notification capability in Apple Developer portal |

### app.json additions needed for production

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    },
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#A8C5A0",
        "sounds": ["./assets/alarm.wav"]
      }]
    ]
  }
}
```

### Call `registerToken()` on login
In `stores/auth.ts` after successful sign-in:
```ts
await useNotificationsStore.getState().registerToken(userId);
```

---

## 4. DEV_MODE flag

The `DEV_MODE` flag in `lib/supabase.ts` must be `false` in production.

```ts
// lib/supabase.ts
const DEV_MODE = false; // ← ensure this before release
```

**How to make this automatic:**
```ts
const DEV_MODE = __DEV__ && Constants.executionEnvironment === 'storeClient';
```
This is automatically `false` in any production or dev build (only `true` in Expo Go).

---

## 5. Wearables (HealthKit / Google Fit)

| # | What | Action needed |
|---|------|---------------|
| 1 | HealthKit | Add `NSHealthShareUsageDescription` to `Info.plist` via `app.json` |
| 2 | HealthKit | Add HealthKit entitlement in Apple Developer portal |
| 3 | Google Fit | Add `android.permission.ACTIVITY_RECOGNITION` to `app.json` |
| 4 | Google Fit | Create OAuth client ID in Google Cloud Console |

---

## 6. Analytics & Crash Reporting

| # | What | Action needed |
|---|------|---------------|
| 1 | Sentry | Set `SENTRY_DSN` secret in EAS |
| 2 | Sentry | Uncomment Sentry init in `lib/sentry.ts` (currently lazy-loaded) |
| 3 | Sentry | Add `@sentry/react-native` to `app.json` plugins for source maps |

---

## 7. App Store Submission

### iOS
- [ ] Xcode 16+ required (Swift 6) — needs macOS 14+ or CI runner
- [ ] Set up Apple Developer account ($99/yr)
- [ ] Create App ID `com.equi.app` in developer portal
- [ ] Enable: Push Notifications, HealthKit, Background Modes (fetch)
- [ ] Create provisioning profiles for distribution
- [ ] Screenshots for all required device sizes
- [ ] Privacy nutrition labels (data collected: health, mood, journal text)
- [ ] App Review notes: explain mental health context, crisis features

### Android
- [ ] Create app in Google Play Console
- [ ] Set up signing keystore (`eas credentials`)
- [ ] Enable: POST_NOTIFICATIONS permission (Android 13+)
- [ ] Review ACTIVITY_RECOGNITION for Google Fit
- [ ] Data safety section: health data, no data sold

---

## 8. Data & Privacy

| # | What | Status |
|---|------|--------|
| 1 | AI (Groq) | Zero-retention API — no training on user data ✅ |
| 2 | Journal text | Never sent to AI — local + Supabase only ✅ |
| 3 | Community posts | Anonymous by default ✅ |
| 4 | Push tokens | Stored in `notification_preferences`, user-deletable ✅ |
| 5 | Data export | Must implement before launch (GDPR/CCPA) ⬜ |
| 6 | Account deletion | Must implement before launch ⬜ |
| 7 | Privacy Policy URL | Required for App Store / Play Store ⬜ |

---

## 9. Schema Migrations (ongoing)

When adding a new column or table during development:

1. **Add a new migration** to `MIGRATIONS` in `mobile/lib/dev-db.ts`
2. **Write the same SQL** as a Supabase migration file in `docs/mobile/supabase/`
3. **Run the Supabase migration** in the dashboard before deploying

Never edit existing migrations — only append new ones.

```ts
// Example: adding a column in dev-db.ts
{
  version: 2,
  statements: [
    `ALTER TABLE profiles ADD COLUMN preferred_language TEXT DEFAULT 'en'`,
  ],
},
```

```sql
-- Corresponding Supabase migration: docs/mobile/supabase/002_add_preferred_language.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
```
