# Phase 2 — Tech Setup

**Status:** Complete
**Scope:** Expo project initialisation, dependency installation, NativeWind configuration, Expo Router navigation shell, Supabase client, folder structure.
**Output:** A running React Native app with 5 tabs, Equi's colour system wired into Tailwind, and a typed Supabase client ready to connect.

---

## What Was Built

### Project Location

```
Equi/
├── README.md
├── docs/
└── mobile/          ← entire Phase 2 output lives here
```

The mobile app lives inside `mobile/` as a subdirectory of the main project repo.

---

## Tech Stack Choices

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Expo SDK 55 (React Native 0.83.2) | Managed workflow — no native build configuration needed for development |
| Navigation | Expo Router (file-based) | Built into Expo; supports deep linking and web; recommended for new projects |
| Styling | NativeWind v4 + Tailwind CSS v3 | Tailwind class syntax in React Native; Equi's colour tokens map directly to Tailwind config |
| Backend | Supabase (Postgres + Auth + Realtime) | Single service for database, auth, and real-time; RLS enforces per-user data isolation |
| State | Zustand | Minimal boilerplate; no provider wrapping required |
| Date utils | date-fns | Lightweight, tree-shakeable |
| Icons | @expo/vector-icons (Ionicons) | Bundled with Expo; no extra native setup |

---

## Dependencies

### Runtime (`dependencies`)

| Package | Version | Purpose |
|---|---|---|
| `expo` | ~55.0.4 | Core Expo SDK |
| `expo-router` | ~55.0.4 | File-based navigation |
| `expo-constants` | ~55.0.7 | App config access |
| `expo-linking` | ~55.0.7 | Deep link handling |
| `expo-status-bar` | ~55.0.4 | Status bar control |
| `expo-secure-store` | ~55.0.8 | Secure key-value storage |
| `react` | 19.2.0 | React runtime |
| `react-native` | 0.83.2 | React Native runtime |
| `react-native-screens` | ~4.23.0 | Native screen containers for navigation |
| `react-native-safe-area-context` | ~5.6.2 | Safe area insets |
| `@react-native-async-storage/async-storage` | 2.2.0 | Supabase auth session persistence |
| `@supabase/supabase-js` | ^2.98.0 | Supabase client |
| `nativewind` | ^4.2.2 | Tailwind CSS for React Native |
| `@expo/vector-icons` | ^15.1.1 | Icon library (Ionicons used in tab bar) |
| `zustand` | ^5.0.11 | State management |
| `react-dom` | ^19.2.0 | Required by `@expo/log-box` (Expo's dev overlay) |
| `react-native-reanimated` | 4.2.1 | Required by NativeWind v4 (`react-native-css-interop`) |
| `date-fns` | ^4.1.0 | Date formatting and arithmetic |

### Dev (`devDependencies`)

| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | ^3.4.19 | Tailwind CSS compiler (NativeWind peer dep) |
| `typescript` | ~5.9.2 | TypeScript compiler |
| `@types/react` | ~19.2.2 | React type definitions |
| `babel-preset-expo` | ~55.0.8 | Expo Babel preset (explicit devDep required for Metro) |

---

## Configuration Files

### `package.json` — key change

`"main"` changed from `"index.ts"` (blank template default) to `"expo-router/entry"`. Required for Expo Router to take over the app entry point.

### `app.json`

```json
{
  "expo": {
    "name": "Equi",
    "slug": "equi",
    "scheme": "equi",
    "splash": {
      "backgroundColor": "#F7F3EE"
    },
    "web": {
      "bundler": "metro"
    },
    "plugins": ["expo-router", "expo-secure-store"]
  }
}
```

Changes from default template:
- `name` / `slug` set to `equi`
- `scheme: "equi"` — enables deep linking (`equi://...`)
- Splash background → Soft White (`#F7F3EE`) instead of plain white
- `web.bundler: "metro"` — required for Expo Router web support
- `expo-router` and `expo-secure-store` config plugins auto-added during install

### `babel.config.js`

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
```

- `jsxImportSource: 'nativewind'` — enables `className` prop on all React Native components; combined with `metro.config.js` `withNativeWind`, this is sufficient for NativeWind v4
- `react-native-reanimated/plugin` — required by Reanimated 4, which NativeWind v4 depends on via `react-native-css-interop`

> **Note:** `nativewind/babel` is intentionally absent. In NativeWind v4 it resolves to `react-native-css-interop/babel`, which unconditionally requires `react-native-worklets/plugin` (a Reanimated 4 internal). Using it as a Babel plugin fails because it returns a preset-shaped object; using it as a preset fails because `react-native-worklets` is not a standalone installable package. The `jsxImportSource` preset option + metro transform covers all required NativeWind functionality.

### `metro.config.js`

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

`withNativeWind` wraps Metro to process `global.css` and generate Tailwind output at runtime.

### `tailwind.config.js`

Equi's full colour system mapped into Tailwind — every colour available as a class (`bg-sage`, `text-charcoal`, `border-mauve`, etc.):

```js
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        sage:     '#A8C5A0', // Stable / calm
        sky:      '#89B4CC', // Manic / elevated
        mauve:    '#C4A0B0', // Depressive / low
        sand:     '#E8DCC8', // Neutral backgrounds
        surface:  '#F7F3EE', // Cards / surfaces
        charcoal: '#3D3935', // Primary text
        gold:     '#C9A84C', // Achievements / rewards
      },
    },
  },
  plugins: [],
};
```

### `global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Imported at the top of `app/_layout.tsx` — entry point for all Tailwind styles.

### `nativewind-env.d.ts`

```ts
/// <reference types="nativewind/types" />
```

Adds TypeScript support for the `className` prop on React Native components.

### `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.d.ts",
    "expo-env.d.ts",
    "nativewind-env.d.ts"
  ]
}
```

- `paths: { "@/*": ["./*"] }` — allows `@/constants/colors` style absolute imports throughout Phase 3
- `strict: true` — full TypeScript strictness enabled from the start

---

## Folder Structure

```
mobile/
├── app/
│   ├── _layout.tsx              # Root layout — global.css import, SafeAreaProvider, StatusBar
│   ├── +not-found.tsx           # 404 fallback screen
│   ├── (auth)/
│   │   └── _layout.tsx          # Auth stack layout (placeholder — wired up in Phase 3)
│   └── (tabs)/
│       ├── _layout.tsx          # Tab bar — 5 tabs, Ionicons, Equi colours
│       ├── index.tsx            # Today (Screen 02) — placeholder
│       ├── journal.tsx          # Journal (Screen 03) — placeholder
│       ├── tracker.tsx          # Cycle Tracker (Screen 04) — placeholder
│       ├── activities.tsx       # Activities (Screen 05) — placeholder
│       └── you.tsx              # You / Profile (Screen 13) — placeholder
├── assets/                      # App icons and splash (Expo template defaults)
├── components/
│   └── ui/                      # Reusable UI primitives — filled in Phase 3
├── constants/
│   ├── colors.ts                # Colour tokens + CycleColors map
│   └── theme.ts                 # Typography scale, spacing, border radii
├── hooks/                       # Custom hooks — Phase 3
├── lib/
│   └── supabase.ts              # Typed Supabase client singleton
├── stores/                      # Zustand stores — Phase 3
├── types/
│   └── database.ts              # Supabase DB types (Phase 2 minimal schema)
├── utils/                       # Utility functions — Phase 3
├── .env.local                   # Supabase credentials (gitignored via .env*.local)
├── .gitignore
├── app.json
├── babel.config.js
├── global.css
├── metro.config.js
├── nativewind-env.d.ts
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## Key Source Files

### `constants/colors.ts`

Single source of truth for all colour tokens. Mirrors the Tailwind config exactly so the same values are available in both `className` props and inline StyleSheet usage.

```ts
export const Colors = {
  sageGreen:  '#A8C5A0',
  skyBlue:    '#89B4CC',
  dustyMauve: '#C4A0B0',
  warmSand:   '#E8DCC8',
  softWhite:  '#F7F3EE',
  charcoal:   '#3D3935',
  mutedGold:  '#C9A84C',
} as const;

export type CycleState = 'stable' | 'manic' | 'depressive' | 'mixed';

export const CycleColors: Record<CycleState, string> = {
  stable:     Colors.sageGreen,
  manic:      Colors.skyBlue,
  depressive: Colors.dustyMauve,
  mixed:      Colors.warmSand,
};
```

`CycleColors` is used throughout the app to resolve a user's current cycle state to the right colour — used by the tab bar active states, home card, cycle tracker, and AI wellness report.

### `constants/theme.ts`

Typography scale, spacing scale, and border radii — consistent design tokens for Phase 3 component work.

### `lib/supabase.ts`

Typed Supabase client. Uses `AsyncStorage` for auth session persistence (required on React Native — cookies don't exist). Throws at startup if env vars are missing, catching misconfiguration early.

```ts
export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### `types/database.ts`

Manually written Phase 2 schema types covering the `profiles` table and `cycle_state` enum. Will be replaced by auto-generated types in Phase 3 once the full schema is in place:

```bash
npx supabase gen types typescript --project-id <id> > types/database.ts
```

---

## Navigation

Expo Router uses the file system as the route map. Two route groups are set up:

```
app/
├── (auth)/     ← unauthenticated users redirected here (Phase 3)
└── (tabs)/     ← main app — renders immediately in Phase 2
```

**Tab bar** (`app/(tabs)/_layout.tsx`):

| Tab | File | Icon | Screen # |
|---|---|---|---|
| Today | `index.tsx` | `home` / `home-outline` | 02 |
| Journal | `journal.tsx` | `book` / `book-outline` | 03 |
| Tracker | `tracker.tsx` | `pulse` / `pulse-outline` | 04 |
| Activities | `activities.tsx` | `leaf` / `leaf-outline` | 05 |
| You | `you.tsx` | `person-circle` / `person-circle-outline` | 13 |

Tab bar styling: background `#F7F3EE` (Soft White), active tint `#A8C5A0` (Sage Green), inactive tint `#3D3935` at 40% opacity, font weight 500, font size 11.

---

## Supabase Setup (Manual Step Required)

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New Project. Note the **Project URL** and **anon key** from Project Settings → API.

### 2. Fill in `mobile/.env.local`

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

This file is gitignored — never commit it.

### 3. Run the Phase 2 schema in Supabase SQL Editor

```sql
-- Cycle state enum (shared across the app)
create type cycle_state as enum ('stable', 'manic', 'depressive', 'mixed');

-- Profiles table (one row per user, extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  diagnosis_confirmed boolean default false,
  current_cycle_state cycle_state default 'stable',
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- Auto-create profile row on every new signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Row Level Security (users see only their own data)
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
```

The full schema for all 19 screens will be added as migrations in Phase 3, one table per feature.

---

## Running the App

**Development (Expo Go on Android — primary method):**

```bash
cd mobile
export PATH="/Users/maqowais/.nvm/versions/node/v24.14.0/bin:$PATH"
npx expo start --tunnel --clear
```

Scan the QR code with **Expo Go** on Android. `--tunnel` is required when the phone and Mac are not on the same Wi-Fi network; it routes through Expo's ngrok tunnel. `--clear` wipes the Metro cache.

> **Expo Go version:** Must be the latest version from the Play Store. SDK 55 requires Expo Go ≥ 2.33. If the Play Store shows no update, install the APK directly from [expo.dev/go](https://expo.dev/go).

**iOS / native builds:** Deferred. MacBook Air 2017 maxes at macOS 12 → Xcode 14.2 → Swift 5.7, which is incompatible with all recent Expo SDK native builds (SDK 55 requires Swift 6.0). Native builds will be done at App Store submission time on a compatible machine.

---

## Known Issues & Resolutions

**`babel-preset-expo` not found at Metro startup:** The package was missing from `devDependencies` (it's a transitive dep of expo, but Metro requires it to be top-level). Fixed by adding `"babel-preset-expo": "~55.0.8"` to `devDependencies`.

**`react-dom` missing:** `@expo/log-box` (Expo's dev overlay) requires `react-dom/client`. Fixed by adding `"react-dom": "^19.2.0"` to `dependencies`. Must install with `--legacy-peer-deps` to avoid an npm ERESOLVE conflict (a transitive dep pulls `react-dom@19.2.4` which wants `react@19.2.4`, but Expo SDK 55 pins `react@19.2.0`).

**NativeWind `nativewind/babel` causes Babel errors:** In NativeWind v4, `nativewind/babel` is `react-native-css-interop/babel` — a preset-shaped factory that returns a `plugins` array. Using it in `plugins:` fails with `.plugins is not a valid Plugin property`; using it in `presets:` fails because it unconditionally references `react-native-worklets/plugin` which is not a standalone installable package. Resolution: omit it entirely; `jsxImportSource: 'nativewind'` + `withNativeWind` metro wrapper covers all needed functionality.

**Expo Go SDK incompatibility:** Expo Go on Android must be updated to the latest version (≥ 2.33) to support SDK 55. If the Play Store shows no update available, install the APK directly from [expo.dev/go](https://expo.dev/go).

**iOS native builds blocked on MacBook Air 2017:** macOS 12 caps at Xcode 14.2 (Swift 5.7). SDK 55 requires Swift 6.0 (Xcode 16+). SDK 51 requires Xcode 14.3+. No viable downgrade path exists. Development runs exclusively on Android via Expo Go; native iOS build deferred to App Store submission.

---

## Verification Checklist

- [x] `npx expo start --tunnel --clear` runs without errors
- [x] App opens in Expo Go on Android — 5 tabs visible, icons and labels correct
- [x] Tapping between tabs navigates without errors
- [x] Tab bar background is Soft White, active tint is Sage Green
- [x] Placeholder screens render (NativeWind `className` working)
- [x] `git status` does not show `.env.local`
- [ ] Supabase project created, credentials in `.env.local`, SQL schema run in dashboard

---

## What Phase 3 Builds

Phase 3 begins feature implementation. Planned build order:

| Priority | Screen | Key work |
|---|---|---|
| 1 | Auth flow (Screen 01) | Sign up, log in, onboarding wizard, route guard in root `_layout.tsx` |
| 2 | Home / Today (Screen 02) | Cycle state card, one-tap mood log, medication check, substance check-in, wearable sleep summary, activity history, SOS button |
| 3 | Cycle Tracker (Screen 04) | 4-state toggle, symptom checklist, 90-day wave graph, life event markers |
| 4 | Journal (Screen 03) | Block editor, life events block type, social rhythm daily card |

Each screen adds its own Supabase table migration alongside the feature code.
