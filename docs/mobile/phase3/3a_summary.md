# 3A Implementation Summary — Auth & Onboarding

**Status:** ✅ Complete
**Migration:** `mobile/supabase/migrations/3a_auth_onboarding.sql`

---

## What Was Built

### Files Created
| File | Description |
|---|---|
| `app/(auth)/_layout.tsx` | Stack layout for auth screens |
| `app/(auth)/sign-in.tsx` | Email + password sign-in |
| `app/(auth)/sign-up.tsx` | Display name + email + password registration |
| `app/(auth)/forgot-password.tsx` | Password reset via email |
| `app/(auth)/onboarding.tsx` | 5-step patient onboarding wizard |
| `stores/auth.ts` | Zustand store: session, profile, signOut, updateProfile |

### Files Modified
| File | Change |
|---|---|
| `app/_layout.tsx` | Auth guard wired via `supabase.auth.onAuthStateChange`; routes to `(auth)` or `(tabs)` based on session + `onboarding_complete` |

---

## SQL Schema Added

```sql
-- Extended profiles table (on top of Phase 2 baseline)
alter table profiles add column if not exists diagnosis text;
alter table profiles add column if not exists track_medication boolean default false;
alter table profiles add column if not exists user_role text default 'patient';
alter table profiles add column if not exists companion_for uuid;
alter table profiles add column if not exists companion_relationship text;
alter table profiles add column if not exists timezone text default 'UTC';
alter table profiles add column if not exists theme jsonb;

-- Emergency contacts
create table emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  phone text not null,
  contact_type text default 'emergency',
  created_at timestamptz default now()
);
```

---

## Key Decisions Made During Implementation

- All auth errors shown in charcoal text — **no red** (Design Rule #1). Error state uses opacity reduction.
- `router.replace()` used everywhere (not `router.push`) so back button never returns to auth screens.
- Profile row auto-created on signup via the Phase 2 Supabase trigger (`on_auth_user_created`).
- Onboarding: slides 1 (diagnosis), 4 (medication), 5 (emergency contact) are required; slides 2 and 3 are skippable.
- Companion path is stubbed at slide 3 — full companion flow deferred to Phase 3D.
- `updateProfile` action added to auth store to support partial profile updates from any screen.

---

## Deviations from Design Doc

- Custom symptom list (`profiles.custom_symptoms`) deferred — not implemented in 3A or 3B.
- Companion waiting screen (post-registration) not built — companion connection handled via support-network screen in 3D.
