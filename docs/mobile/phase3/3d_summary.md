# 3D Implementation Summary — Social & Community

**Status:** ✅ Complete
**Migration:** `mobile/supabase/migrations/3d_social_community.sql`

---

## What Was Built

### Files Created
| File | Description |
|---|---|
| `stores/community.ts` | loadChannel, loadMore (pagination), post (optimistic), react (toggle), deletePost |
| `app/community/index.tsx` | Full community feed — 5 channels, chronological, reactions, post sheet |
| `app/(tabs)/you/support-network.tsx` | Well-wisher/Guardian tabs, share toggles, invite by email, remove |
| `app/psychiatrists/index.tsx` | Psychiatrist directory — Equi Partner badge, filter chips, Connect CTA |

### Files Modified
| File | Change |
|---|---|
| `app/(tabs)/you/index.tsx` | Added Social section with links to Support Network, Community, Psychiatrists |

---

## SQL Schema Added

```sql
create type companion_role as enum ('well_wisher', 'guardian');
create type guardian_level as enum ('view_only', 'alert_on_risk', 'full_control');
create type post_reaction as enum ('i_relate', 'thank_you_for_sharing');

create table community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users on delete cascade,
  channel text not null default 'general',
  body text not null,
  moderation_status text default 'pending',  -- 'pending' | 'approved' | 'rejected'
  moderation_reason text,
  created_at timestamptz default now()
);

create table community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts on delete cascade,
  user_id uuid references auth.users on delete cascade,
  reaction post_reaction not null,
  created_at timestamptz default now(),
  unique (post_id, user_id, reaction)
);

create table companions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users on delete cascade,
  companion_id uuid references auth.users on delete set null,
  role companion_role not null default 'well_wisher',
  guardian_level guardian_level default 'view_only',
  status text default 'pending',   -- 'pending' | 'accepted' | 'rejected'
  share_mood_summaries boolean default true,
  share_cycle_data boolean default false,
  share_ai_report boolean default false,
  share_medication boolean default false,
  invite_email text,
  created_at timestamptz default now()
);

create table companion_journal_shares (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid references companions on delete cascade,
  entry_id uuid references journal_entries on delete cascade,
  shared_at timestamptz default now()
);

create table psychiatrists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  credentials text,
  bio text,
  is_equi_partner boolean default false,
  offers_telehealth boolean default true,
  offers_in_person boolean default false,
  insurance_accepted text[],
  location_city text,
  location_country text,
  created_at timestamptz default now()
);
```

**Seed data:** 4 demo psychiatrists inserted (2 Equi Partners, 2 standard; mix of telehealth and in-person).

---

## Key Decisions Made During Implementation

- **Community moderation** — Posts inserted with `status = 'pending'`. Pending posts are visible only to their author (shown with dashed border). The AI moderation Edge Function (Perspective API + Llama 3.2 3B) was deferred to Phase 4E. All posts remain pending until that Edge Function is deployed.
- **Chronological feed only** — No algorithmic sorting. Posts load newest-first. Pagination via `range()` (25 posts per page), triggered on `onEndReached` of the ScrollView. Design Rule #5 enforced.
- **Reactions as toggle** — Tapping a reaction you already have removes it (delete), tapping a new one upserts. Implemented via `onConflict` upsert + conditional delete.
- **Psychiatrist Connect** — Tapping "Connect" creates a `companions` row with `role = 'guardian'`, `guardian_level = 'view_only'`, `status = 'pending'` via an `Alert.alert` confirm dialog. No email sent in Phase 3D.
- **Support network per-share toggles** — Each `Switch` component writes directly to the `companions` row (no intermediate state). Debounced 300ms to avoid excessive writes on rapid toggling.
- **Crisis contact pinned** — A non-dismissible crisis banner is pinned at the top of the community feed (not from the database — static component).
- **All community posts anonymous by default** — `author_id` is stored but never displayed in the feed UI. Design Rule #4 enforced.

---

## Deviations from Design Doc

- Guardian alert triggers (push notifications on risk detection) not implemented — requires Phase 4C notification infrastructure.
- `companion_journal_shares` table created but the UI to share individual journal entries not built — deferred.
- Psychiatrist search/filter chips are UI-only in Phase 3D — filter is applied client-side over the seeded data. Full server-side search deferred.
