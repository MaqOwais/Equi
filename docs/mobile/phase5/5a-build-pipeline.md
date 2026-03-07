# Phase 5A — Native Build Pipeline

Moves Equi from the Expo Go development environment to a production-grade native build pipeline. Establishes EAS Build for iOS and Android, sets up the Expo Dev Client for native module development, configures OTA (over-the-air) update channels, and defines the complete environment variable and versioning strategy.

← [Phase 5 README](./README.md)

---

## Prerequisites

| Requirement | Detail |
|---|---|
| Xcode 16+ | Required for Swift 6.0 (Expo SDK 55). macOS 14+ (Sonoma). |
| Apple Developer Account | $99/yr. Team ID needed for provisioning. |
| Google Play Console account | $25 one-time. |
| EAS CLI | `npm install -g eas-cli` |
| CocoaPods | `brew install cocoapods` → `cd ios && pod install` |
| Android Studio | For Android emulator and signing keystore generation |

---

## EAS Build Setup

### 1. Install and authenticate

```bash
npm install -g eas-cli
eas login          # authenticate with Expo account
eas build:configure  # initialises eas.json
```

### 2. `eas.json` — build profiles

```json
{
  "cli": {
    "version": ">= 10.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
        "EXPO_PUBLIC_GROQ_API_KEY": "your-groq-key",
        "EXPO_PUBLIC_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "resourceClass": "m-medium" },
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
        "EXPO_PUBLIC_GROQ_API_KEY": "your-groq-key",
        "EXPO_PUBLIC_ENV": "preview"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium",
        "image": "latest"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
        "EXPO_PUBLIC_GROQ_API_KEY": "your-groq-key",
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### 3. Build commands

```bash
# iOS simulator build (for local dev)
eas build --platform ios --profile development --local

# Preview build (internal distribution via TestFlight / Firebase App Distribution)
eas build --platform all --profile preview

# Production build
eas build --platform all --profile production
```

---

## iOS Signing

### Managed credentials (recommended)

EAS can manage all Apple certificates and provisioning profiles automatically:

```bash
eas credentials  # interactive credential management
```

When prompted, choose **"Let EAS manage your credentials"**. EAS creates:
- Distribution certificate (stored in EAS credential store)
- App Store provisioning profile for `com.equi.app`
- Push notification entitlement

### Manual credentials (if needed)

1. Apple Developer Portal → Certificates → create **Apple Distribution** certificate
2. Identifiers → register App ID `com.equi.app`
   - Enable: **Push Notifications**, **HealthKit**, **Associated Domains**
3. Profiles → create **App Store** provisioning profile
4. Download and add to Xcode Keychain, or upload to EAS

### `app.json` additions for iOS

```json
{
  "expo": {
    "name": "Equi",
    "slug": "equi",
    "version": "1.0.0",
    "scheme": "equi",
    "ios": {
      "bundleIdentifier": "com.equi.app",
      "buildNumber": "1",
      "supportsTablet": false,
      "infoPlist": {
        "NSHealthShareUsageDescription": "Equi reads your sleep data to track patterns that affect your mood.",
        "NSHealthUpdateUsageDescription": "Equi writes sleep quality scores to Apple Health.",
        "NSMotionUsageDescription": "Equi uses motion data to infer activity levels.",
        "UIBackgroundModes": ["fetch", "remote-notification"]
      },
      "entitlements": {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.healthkit.access": ["health-records"]
      }
    }
  }
}
```

---

## Android Signing

### Generate upload keystore

```bash
keytool -genkey -v \
  -keystore equi-upload-key.jks \
  -alias equi-key-alias \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Store the keystore and passwords securely (1Password, never commit to git).

### `app.json` additions for Android

```json
{
  "expo": {
    "android": {
      "package": "com.equi.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#F7F3EE"
      },
      "permissions": [
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.ACTIVITY_RECOGNITION",
        "android.permission.BODY_SENSORS"
      ],
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### Play App Signing

Upload keystore to Google Play Console → Setup → App signing.
Google re-signs the final APK/AAB with their own key — the upload key is only used to authenticate uploads.

---

## Expo Dev Client

The Dev Client replaces Expo Go and supports all native modules (HealthKit, notifications, etc.).

### Install

```bash
npx expo install expo-dev-client
```

Add to `app.json`:
```json
{
  "expo": {
    "plugins": ["expo-dev-client"]
  }
}
```

### Build and install

```bash
# Build for iOS simulator
eas build --platform ios --profile development

# Build for Android device
eas build --platform android --profile development
```

After installing the Dev Client on device/simulator, start the dev server:
```bash
npx expo start --dev-client
```

---

## OTA Updates (EAS Update)

Over-the-air updates let patches ship without App Store re-review (JS + assets only — native code changes still require a full build).

### Setup

```bash
npx expo install expo-updates
eas update:configure
```

Add to `app.json`:
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id",
      "fallbackToCacheTimeout": 0,
      "checkAutomatically": "ON_LOAD"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### Update channels

| Channel | Audience | Auto-download |
|---|---|---|
| `development` | Internal team only | No — must manually apply |
| `preview` | Beta testers (TestFlight) | Yes, on next app open |
| `production` | All users | Yes, on next app open |

### Deploy an OTA update

```bash
# Push to production channel
eas update --branch production --message "Fix tracker insight not showing"

# Push to preview channel only
eas update --branch preview --message "New AI report toggle"
```

### Rollback

```bash
eas update:rollback --branch production
```

---

## Environment Variable Strategy

| Variable | Scope | Where stored |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile client | `.env.local` (dev) · EAS secrets (prod) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile client | `.env.local` · EAS secrets |
| `EXPO_PUBLIC_GROQ_API_KEY` | Mobile client | `.env.local` · EAS secrets |
| `EXPO_PUBLIC_ENV` | Mobile client | `eas.json` env block |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only | Supabase secrets (never in app) |
| `PERSPECTIVE_API_KEY` | Edge Functions only | Supabase secrets |
| `STRIPE_SECRET_KEY` | Edge Functions only | Supabase secrets |
| `STRIPE_WEBHOOK_SECRET` | Edge Functions only | Supabase secrets |

**Security rules:**
- `EXPO_PUBLIC_*` variables are bundled into the JS and visible to the client — never put service role keys here.
- Server-only secrets live in Supabase Edge Function environment, never in the mobile bundle.
- Rotate the Groq API key before production; set rate limits on Groq dashboard.

### Set EAS secrets

```bash
eas secret:create --scope project --name EXPO_PUBLIC_GROQ_API_KEY --value "your-key"
eas secret:list
```

---

## App Versioning Strategy

```
version (semver): MAJOR.MINOR.PATCH   e.g. 1.0.0
buildNumber (iOS): auto-incremented by EAS
versionCode (Android): auto-incremented by EAS
```

- `appVersionSource: "remote"` in `eas.json` — EAS tracks the build number centrally so parallel CI builds don't conflict.
- Bump `version` in `app.json` for each public release (App Store / Play Store).
- `runtimeVersion` policy `"appVersion"` — OTA updates are only applied to users on the same app version. Breaking native changes force a full rebuild.

### Version bump workflow

```bash
# Patch (bug fix)
npm version patch   # bumps 1.0.0 → 1.0.1 in package.json

# Minor (new feature, backwards compatible)
npm version minor   # bumps 1.0.0 → 1.1.0

# Then sync to app.json manually (or use expo-version script)
```

---

## CocoaPods & Native Module Linking

After adding any native module:

```bash
cd ios
pod install
cd ..
```

Run `pod install` again after:
- Any `npx expo install` that adds a native module
- Updating Expo SDK version
- Changing Xcode version

### `.podspec` caveats for Phase 5 modules

| Module | CocoaPods note |
|---|---|
| `expo-health-connect` | Requires iOS 16.0+ minimum deployment target |
| `expo-notifications` | Requires push entitlement + APNs key in Apple Developer Portal |
| `@stripe/stripe-react-native` | Run `pod install` after install; requires `use_frameworks! :linkage => :static` in Podfile for some configs |
| `@sentry/react-native` | Auto-patches `AppDelegate` for crash capture; review the patch in git diff |

---

## Preflight Checklist (before any production build)

- [ ] `npx expo-doctor` passes — no SDK version mismatches
- [ ] `npx tsc --noEmit` — zero TypeScript errors
- [ ] All `EXPO_PUBLIC_*` secrets set in EAS
- [ ] `app.json` version + buildNumber bumped
- [ ] `ios/Podfile.lock` committed (locks native dependency versions)
- [ ] `.env.local` not committed (confirmed in `.gitignore`)
- [ ] Supabase RLS policies verified on production project
- [ ] `reports` Storage bucket created with correct policies
- [ ] All Edge Functions deployed: `generate-report-pdf`, `export-user-data`, `moderate-post`

---

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/build.yml
name: EAS Build

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --profile preview --non-interactive
```

OTA update on merge to `main`:
```yaml
      - run: eas update --branch preview --message "${{ github.event.head_commit.message }}" --non-interactive
```
