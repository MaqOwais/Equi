# 3A — Auth & Onboarding

**Goal:** Users can register, sign in, reset their password, and complete a role-aware onboarding flow. On completion they are routed into the main app. Returning users are auto-redirected without seeing auth screens.

---

## Screens

- `app/(auth)/sign-in.tsx`
- `app/(auth)/sign-up.tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(auth)/onboarding.tsx`
- `app/_layout.tsx` — updated with auth guard

---

## Supabase Schema

### Extend `profiles` (migration on top of Phase 2 baseline)

```sql
alter table profiles add column if not exists
  diagnosis text,                      -- 'bipolar_1' | 'bipolar_2' | 'cyclothymia' | 'unsure'
  track_medication boolean default false,
  user_role text default 'patient',    -- 'patient' | 'companion'
  companion_for uuid,                  -- patient's user_id (companion path only)
  companion_relationship text,         -- 'partner' | 'parent' | 'sibling' | 'friend' | 'other'
  timezone text default 'UTC',
  theme jsonb;                         -- user's theme/ambiance preferences (Phase 3E)
```

### `emergency_contacts`

```sql
create table emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  phone text not null,
  contact_type text default 'emergency',  -- 'emergency' | 'social'
  created_at timestamptz default now()
);

alter table emergency_contacts enable row level security;
create policy "own contacts" on emergency_contacts
  using (auth.uid() = user_id);
```

---

## Zustand Store

### `stores/auth.ts`

```ts
interface AuthStore {
  session: Session | null;
  profile: Profile | null;
  setSession: (s: Session | null) => void;
  setProfile: (p: Profile) => void;
  signOut: () => Promise<void>;
}
```

Hydrated via `supabase.auth.onAuthStateChange` in root `_layout.tsx`. On sign-out: clear session + profile, then `router.replace('/(auth)/sign-in')`.

---

## Root `_layout.tsx` — Auth Guard

```ts
useEffect(() => {
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
    if (!session) {
      router.replace('/(auth)/sign-in');
    } else if (!profile?.onboarding_complete) {
      router.replace('/(auth)/onboarding');
    } else {
      router.replace('/(tabs)');
    }
  });
}, []);
```

All redirects use `router.replace()` — never `router.push()`.

---

## Screen Specs

### Sign-in (`sign-in.tsx`)

- Email + password fields
- "Forgot password?" link → `forgot-password.tsx`
- "Create account" link → `sign-up.tsx`
- On submit: `supabase.auth.signInWithPassword()` → auth state change fires → root guard redirects
- Error states: invalid credentials (charcoal text, no red)

### Sign-up (`sign-up.tsx`)

- Display name, email, password fields
- On submit: `supabase.auth.signUp()` → profile row auto-created via Phase 2 trigger → redirect to onboarding
- Password minimum: 8 characters (enforced by Supabase; show inline hint, not error)

### Forgot password (`forgot-password.tsx`)

- Email field only
- On submit: `supabase.auth.resetPasswordForEmail()` → success message: "Check your inbox"
- No countdown timer, no "resend" button in Phase 3 (keep it simple)

---

### Onboarding (`onboarding.tsx`)

Multi-step wizard. Progress dots at top (not a linear bar). Back arrow always visible. Last step writes to Supabase and sets `onboarding_complete = true`.

#### Patient path — 5 slides

| Slide | Content | Required | Data written |
|---|---|---|---|
| 1 | Diagnosis: 4 tappable cards — Bipolar I / II / Cyclothymia / Not sure | Yes | `profiles.diagnosis` |
| 2 | Mood intro: static display of the 10-pt emoji scale. "This is how you'll log mood every day." No input. | No (skippable) | — |
| 3 | Quick app tour: one-line description of each of the 5 tabs | No (skippable) | — |
| 4 | Medication: "Do you take medication?" Yes/No. If Yes: "Track it in Equi?" Yes/No | Yes | `profiles.track_medication` |
| 5 | Safety setup: add at least 1 emergency contact (name + phone). Optional: social contacts. | Yes (≥1 emergency contact) | `emergency_contacts` rows |

Final slide "Let's go →" → upserts `profiles.onboarding_complete = true` → root guard fires → `(tabs)`.

#### Companion path — 3 slides

| Slide | Content | Required | Data written |
|---|---|---|---|
| 1 | "Who are you supporting?" + relationship picker | Yes | `profiles.companion_relationship` |
| 2 | Education slide: what companions can and can't see (static read-only list) | No | — |
| 3 | Send connection request: search by email or copy a shareable link | Yes | `companions` row with `status = 'pending'` |

Companion lands on a minimal waiting screen until patient accepts the connection request. `profiles.user_role = 'companion'` determines which home view renders.

#### UX rules
- Progress dots (not a bar) — never makes user feel punished by progress
- Slide 2 and 3 are skippable; slides 1, 4, 5 are required to continue
- "Back" always visible and always works
- No animations that take >200ms — onboarding should feel fast

---

## Access Control

No access control complexity in 3A. The only data written is:
- Own `profiles` row (always private, RLS: `auth.uid() = id`)
- Own `emergency_contacts` rows (always private, never shared with companions)
