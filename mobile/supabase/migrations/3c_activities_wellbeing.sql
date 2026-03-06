-- ─── Phase 3C: Activities & Wellbeing ────────────────────────────────────────
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── Activities (global, read-only content) ────────────────────────────────────

create table if not exists activities (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  duration_minutes  smallint,
  category          text,  -- 'grounding' | 'self_esteem' | 'sleep' | 'forgiveness' | 'reflection'
  compatible_states cycle_state[],
  restricted_states cycle_state[],
  is_workbook_entry boolean default false,
  illustration_url  text,
  evidence_label    text,
  created_at        timestamptz default now()
);
-- No RLS — global read-only content

-- ── Activity Completions ──────────────────────────────────────────────────────

create table if not exists activity_completions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade,
  activity_id  uuid references activities,
  completed_at timestamptz,  -- null = bookmarked but not yet completed
  cycle_state  cycle_state,
  notes        text,
  bookmarked   boolean default false,
  created_at   timestamptz default now()
);
alter table activity_completions enable row level security;
create policy "own completions"
  on activity_completions using (auth.uid() = user_id);

-- ── Prescribed Activities ─────────────────────────────────────────────────────

create table if not exists prescribed_activities (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid references auth.users on delete cascade,
  psychiatrist_id  uuid,
  activity_id      uuid references activities,
  dosage_per_week  smallint,
  goal             text,
  prescribed_at    timestamptz default now(),
  active           boolean default true
);
alter table prescribed_activities enable row level security;
create policy "patient sees own"
  on prescribed_activities using (auth.uid() = patient_id);

-- ── Workbook Responses ────────────────────────────────────────────────────────

create table if not exists workbook_responses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete cascade,
  chapter       smallint not null check (chapter between 1 and 4),
  prompt_index  smallint not null check (prompt_index between 0 and 3),
  response      text not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (user_id, chapter, prompt_index)
);
alter table workbook_responses enable row level security;
create policy "own workbook"
  on workbook_responses using (auth.uid() = user_id);

-- ── Routine Anchors ───────────────────────────────────────────────────────────

create table if not exists routine_anchors (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade,
  anchor_name  text not null,  -- 'wake' | 'first_meal' | 'first_contact' | 'work_start' | 'dinner' | 'bedtime'
  target_time  time,
  enabled      boolean default true,
  created_at   timestamptz default now()
);
alter table routine_anchors enable row level security;
create policy "own anchors"
  on routine_anchors using (auth.uid() = user_id);

-- ── Nutrition Logs ────────────────────────────────────────────────────────────

create table if not exists nutrition_logs (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users on delete cascade,
  log_date             date not null default current_date,
  categories           jsonb not null default '{}',
  eating_window_start  time,
  eating_window_end    time,
  hydration_glasses    smallint,
  gut_health_note      text,
  input_method         text default 'manual',
  created_at           timestamptz default now(),
  unique (user_id, log_date)
);
alter table nutrition_logs enable row level security;
create policy "own nutrition"
  on nutrition_logs using (auth.uid() = user_id);

-- ── Seed: Activity Library ────────────────────────────────────────────────────

insert into activities (title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) values

-- Grounding (all states)
('5-4-3-2-1 Grounding',
 'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. Anchors you to the present moment.',
 5, 'grounding',
 ARRAY['stable','manic','depressive','mixed']::cycle_state[],
 ARRAY[]::cycle_state[],
 false, 'Evidence-based: anxiety & dissociation'),

('Box Breathing',
 'Inhale for 4 counts, hold for 4, exhale for 4, hold for 4. Activates the parasympathetic nervous system.',
 5, 'grounding',
 ARRAY['stable','manic','depressive','mixed']::cycle_state[],
 ARRAY[]::cycle_state[],
 false, 'Evidence-based: stress regulation'),

('Body Scan',
 'Slowly move awareness from your feet to the top of your head, noticing sensations without judgment.',
 10, 'grounding',
 ARRAY['stable','depressive','mixed']::cycle_state[],
 ARRAY[]::cycle_state[],
 false, 'Evidence-based: mindfulness-based stress reduction'),

('Cold Water Reset',
 'Splash cold water on your face or hold ice. Triggers the dive reflex — slows heart rate rapidly.',
 2, 'grounding',
 ARRAY['manic','mixed']::cycle_state[],
 ARRAY[]::cycle_state[],
 false, 'DBT: TIPP skill'),

-- Sleep (stable + depressive)
('Sleep Hygiene Audit',
 'Review your last 3 nights. What helped? What disrupted sleep? Write 3 concrete changes to try this week.',
 15, 'sleep',
 ARRAY['stable','depressive']::cycle_state[],
 ARRAY['manic']::cycle_state[],
 false, 'Evidence-based: CBT-I'),

('Progressive Muscle Relaxation',
 'Systematically tense and release each muscle group from toes to face. Best done lying down before sleep.',
 15, 'sleep',
 ARRAY['stable','depressive','mixed']::cycle_state[],
 ARRAY[]::cycle_state[],
 false, 'Evidence-based: insomnia & anxiety'),

-- Self-esteem (stable only — manic restricted)
('Gratitude Jar',
 'Write 3 specific things you are grateful for today on a small piece of paper and place them in a jar.',
 10, 'self_esteem',
 ARRAY['stable','depressive']::cycle_state[],
 ARRAY['manic']::cycle_state[],
 false, 'Positive psychology: gratitude practice'),

('Compliment Diary',
 'Record one genuine compliment you received or gave today. Reflect on why it mattered.',
 5, 'self_esteem',
 ARRAY['stable','depressive']::cycle_state[],
 ARRAY['manic']::cycle_state[],
 false, 'Positive psychology: self-compassion'),

('Proud Dandelion',
 'Draw or write about one thing you accomplished this week — no matter how small. Dandelions thrive anywhere.',
 10, 'self_esteem',
 ARRAY['stable','depressive']::cycle_state[],
 ARRAY['manic']::cycle_state[],
 false, 'Strengths-based therapy'),

-- Forgiveness / reflection
('Letter I Will Not Send',
 'Write a letter to someone who has hurt you — then don''t send it. The release is in the writing, not the sending.',
 20, 'forgiveness',
 ARRAY['stable','depressive']::cycle_state[],
 ARRAY['manic']::cycle_state[],
 false, 'Narrative therapy'),

('Values Check-In',
 'Name your top 3 values. Rate how aligned your past week was with each one (1–10). What would 10 look like?',
 15, 'reflection',
 ARRAY['stable']::cycle_state[],
 ARRAY[]::cycle_state[],
 false, 'ACT: values clarification'),

-- Workbook entry point
('Bipolar Workbook',
 '4-chapter guided workbook. Understand your cycles, map your triggers, identify warning signs, and discover your strengths.',
 null, 'reflection',
 ARRAY['stable','manic','depressive','mixed']::cycle_state[],
 ARRAY[]::cycle_state[],
 true, 'CBT + psychoeducation');
