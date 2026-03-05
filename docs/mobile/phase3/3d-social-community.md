# 3D — Social & Community

**Goal:** Connect users to peers, supporters, and clinicians. Community provides anonymous peer support with AI moderation. Support Network gives patients fine-grained control over what companions see. Psychiatrists enables discovery and data sharing with clinicians.

---

## Screens

- `app/community/index.tsx` — Community feed
- `app/(tabs)/you/support-network.tsx` — Support Network (patient view + companion home)
- `app/psychiatrists/index.tsx` — Psychiatrist directory

---

## Supabase Schema

### Enums

```sql
create type companion_role as enum ('well_wisher', 'guardian');
create type guardian_level as enum ('view_only', 'alert_on_risk', 'full_control');
create type post_reaction as enum ('i_relate', 'thank_you_for_sharing');
```

### `community_posts`

```sql
create table community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users on delete cascade,
  channel text not null,
    -- 'wins_this_week' | 'depressive_days' | 'mania_stories' | 'medication_talk' | 'caregiver_corner'
  body text not null,
  moderation_status text default 'pending',
    -- 'approved' | 'flagged' | 'removed'
  moderation_reason text,
  created_at timestamptz default now()
);
alter table community_posts enable row level security;

-- Authors see their own posts + all approved posts
create policy "read community" on community_posts for select
  using (moderation_status = 'approved' or author_id = auth.uid());
create policy "insert own" on community_posts for insert
  with check (author_id = auth.uid());
create policy "delete own" on community_posts for delete
  using (author_id = auth.uid());
```

### `community_reactions`

```sql
create table community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts on delete cascade,
  user_id uuid references auth.users on delete cascade,
  reaction post_reaction not null,
  created_at timestamptz default now(),
  unique (post_id, user_id)  -- one reaction per user per post
);
alter table community_reactions enable row level security;
create policy "own reactions" on community_reactions using (auth.uid() = user_id);
```

### `companions`

```sql
create table companions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users on delete cascade,
  companion_id uuid references auth.users,
  role companion_role not null,
  guardian_level guardian_level,       -- only used when role = 'guardian'
  status text default 'pending',       -- 'pending' | 'accepted' | 'rejected'

  -- Per-person sharing toggles (all off by default)
  share_mood_summaries boolean default false,
  share_cycle_data boolean default false,
  share_ai_report boolean default false,
  share_medication boolean default false,  -- off by default even for guardians

  created_at timestamptz default now(),
  unique (patient_id, companion_id)
);
alter table companions enable row level security;
create policy "patient sees their companions" on companions
  using (auth.uid() = patient_id);
create policy "companion sees their link" on companions
  using (auth.uid() = companion_id);
```

### `companion_journal_shares`

Journal entries are never automatically shared. Patient selects specific entries per companion.

```sql
create table companion_journal_shares (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users on delete cascade,
  companion_id uuid references auth.users,
  journal_entry_id uuid references journal_entries on delete cascade,
  shared_at timestamptz default now()
);
alter table companion_journal_shares enable row level security;
create policy "patient controls shares" on companion_journal_shares
  using (auth.uid() = patient_id);
create policy "companion reads shared" on companion_journal_shares for select
  using (auth.uid() = companion_id);
```

---

## Zustand Store

### `stores/community.ts`

```ts
interface CommunityStore {
  channel: string;
  posts: CommunityPost[];
  loadChannel: (channel: string) => Promise<void>;
  post: (body: string) => Promise<void>;
  react: (postId: string, reaction: PostReaction) => Promise<void>;
}
```

---

## Screen Specs

### Community (`app/community/index.tsx`)

Accessible from a nav button in the Activities tab or Profile. Not a top-level tab — community is a secondary destination.

```
┌──────────────────────────────────────────┐
│  📞 988 · Crisis Text Line · NAMI        │ ← always pinned, non-dismissible
│                                          │
│  [Wins][Depressive][Mania][Meds][Carer] │ ← channel tabs
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │  "Had my first 5-day stable run     │ │
│  │   this month. Small wins matter."   │ │
│  │                                     │ │
│  │  💜 I relate   🙏 Thank you         │ │
│  └─────────────────────────────────────┘ │
│  [More posts — chronological order]      │
│                                          │
│                      [+ Post]            │ ← FAB
└──────────────────────────────────────────┘
```

**Feed rules:**
- Strictly chronological — no algorithm, no ranking, no promoted posts
- No likes — only `i_relate` and `thank_you_for_sharing`
- All posts show no author identifier (anonymous by default)
- User can delete their own posts at any time (swipe left → delete)
- Infinite scroll with pagination (25 posts per load)

**Channels:**

| Slug | Display name |
|---|---|
| `wins_this_week` | Wins This Week |
| `depressive_days` | Depressive Days |
| `mania_stories` | Mania Stories |
| `medication_talk` | Medication Talk |
| `caregiver_corner` | Caregiver Corner |

**Crisis line pinned header:** Non-dismissible. Shows 988, Crisis Text Line (text HOME to 741741), NAMI Helpline. Tapping any opens the phone dialler or SMS.

#### AI Moderation Pipeline

Every post is submitted with `moderation_status = 'pending'`. A Supabase Edge Function fires on insert and runs two layers:

**Layer 1 — Perspective API:**
- Checks: toxicity, identity_attack, insult, threat scores
- If any score > 0.7 → `flagged`

**Layer 2 — Llama 3.2 3B via Groq:**
- Context-aware evaluation: bipolar-specific crisis signals, nuance (e.g. "I want to stop existing" is different from generic sadness)
- Can override Layer 1's flag decision (unflag false positives from Perspective)

**Outcomes:**

| Status | User experience |
|---|---|
| `approved` | Post becomes visible immediately |
| `flagged` | Post held; user shown: "We'd like you to review this before posting." with specific guidance and an edit path. Never silent. |
| `removed` | Only for clear TOS violations. User shown reason + appeal path |

Posts remain visible to their author at all times (even while `pending` or `flagged`).

---

### Support Network (`app/(tabs)/you/support-network.tsx`)

#### Patient view — 2 tabs

**Well-wishers tab:**

Each accepted `companion_role = 'well_wisher'` shown as a `CompanionCard`. Card contains:
- Name + relationship
- Per-person toggles:
  - Mood summaries (shows "Having a calm day" — not a raw number)
  - Cycle data (state name only, no intensity)
  - AI Wellness Report (full PDF)
  - Selected journal entries → opens an entry picker modal

**Guardians tab:**

`companion_role = 'guardian'` cards. Includes well-wisher toggles plus:
- Guardian level selector: View only / Alert if high risk / Full account control
- Alert triggers display (always shown, read-only — explains what triggers alerts):
  - Mood ≤ 2/10 for 2+ consecutive days
  - SOS button tapped
  - No journal entry for 3+ days
  - Manic symptoms logged 2+ consecutive days
- "Revoke guardian access" button — always visible, always one tap away
- Patient sees a log of all guardian alerts sent (timestamped list)

**Adding a companion:**
1. Patient taps "Add companion" → enters email or copies a link
2. A `companions` row is created with `status = 'pending'`
3. Companion receives an email (Supabase auth email) with an accept link
4. On accept, `status` → `'accepted'`

**Removing a companion:** Swipe on `CompanionCard` → "Remove". Deletes the `companions` row. Companion loses access immediately.

#### Companion home view (same app, different root)

When `profiles.user_role = 'companion'` and the companion link has `status = 'accepted'`, the root guard routes to a companion-specific home:

**Well-wisher companion home:**
- Simplified mood card: "Alex is having a calm day" (not a clinical label or raw score)
- Shared journal entries (only those patient explicitly selected in `companion_journal_shares`)
- Reaction buttons: 💜 and 🙏 only — no free text, no comment threads
- Quick check-in message templates: "Thinking of you", "How are you doing?", "I'm here if you need me"
- DMs are private, one-to-one

**Guardian companion home:**
- All well-wisher content
- Actual cycle state labels (clinical — guardians are higher trust)
- Medication status card (only if `share_medication = true`)
- Alert banner when a high-risk trigger fires (sticky, dismissible only after 24h)

**Patient controls:** Patient can mute or remove any companion at any time. "Mute" pauses their access without removing the connection. "Remove" deletes the row.

---

### Psychiatrists (`app/psychiatrists/index.tsx`)

Phase 3 scope: patient-facing only. The psychiatrist web portal is Phase 4.

**Layout — toggle between Map and List view:**

**List view card:**
- Name, credentials (e.g. MD, Board Certified in Psychiatry)
- "Equi Partner" badge (partners understand the monitoring approach and can prescribe activities)
- In-person / Telehealth availability
- Distance (approximate, not exact)
- Insurance accepted
- "Connect" and "Book" CTAs

**Connecting to a psychiatrist:**
1. Patient taps "Connect" on a profile
2. Default share = activity completion data only (no medication, no journal, no mood)
3. A `companions` row is created: `role = 'guardian'`, `guardian_level = 'view_only'`, all share flags off except future activity compliance
4. Patient can update sharing at any time from Support Network

**Pre-appointment share:**
- "Share AI Report" one-tap button on the psychiatrist's profile
- Opens the latest `ai_reports.pdf_url` in the native share sheet (email, AirDrop, etc.)

---

## Access Control Summary

| Data | Well-wisher | Guardian (view only) | Guardian (alert/full) | Psychiatrist |
|---|---|---|---|---|
| Mood summary ("calm day") | Toggle | Toggle | Toggle | — |
| Raw mood score | Never | Never | Never | — |
| Cycle state name | Toggle | Toggle | Toggle + alerts | — |
| Cycle intensity | Never | Never | Never | — |
| Journal entries | Selected by patient | Selected by patient | Selected by patient | Never |
| Medication status | Never | Never | Toggle | Separate toggle |
| Substance data | Never | Never | Never | Via AI Report only |
| Activity compliance | Never | Never | Never | Yes (default) |
| AI Wellness Report | Toggle | Toggle | Toggle | Patient shares manually |
| Workbook responses | Never | Never | Never | Never |

All toggles live in the `companions` table, enforced at the RLS level. Removing a companion row immediately revokes all access.
