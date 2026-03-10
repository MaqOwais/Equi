/**
 * dev-db.ts — SQLite-backed local client that mirrors the Supabase query builder API.
 * Used automatically when DEV_MODE = true (no OTP, no network needed).
 *
 * Schema changes: append a new entry to MIGRATIONS. Never edit existing entries.
 * Each statement must be a single SQL statement (Android expo-sqlite constraint).
 */
import * as SQLite from 'expo-sqlite';

// ─── Dev identity ─────────────────────────────────────────────────────────────

export const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000000';

const DEV_SESSION = {
  user: {
    id: DEV_USER_ID,
    email: 'dev@equi.app',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
  access_token: 'dev-token',
  refresh_token: 'dev-refresh',
  expires_in: 3600,
  token_type: 'bearer',
};

// ─── Migrations ───────────────────────────────────────────────────────────────
// Rules:
//   • Never edit an existing migration — only append new ones.
//   • Each string must be a SINGLE SQL statement (no semicolons mid-string).
//   • Statements that may fail on existing DBs (ALTER TABLE) are wrapped in
//     try/catch by the runner — safe to leave them in.

const MIGRATIONS: { version: number; statements: string[] }[] = [
  {
    // v1 — full baseline schema (all tables with current columns)
    version: 1,
    statements: [
      `PRAGMA journal_mode = WAL`,
      `CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, title TEXT, description TEXT, duration_minutes INTEGER, category TEXT, compatible_states TEXT DEFAULT '[]', restricted_states TEXT DEFAULT '[]', is_workbook_entry INTEGER DEFAULT 0, illustration_url TEXT, evidence_label TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, display_name TEXT, user_role TEXT DEFAULT 'user', diagnosis_confirmed INTEGER DEFAULT 0, current_cycle_state TEXT DEFAULT 'stable', onboarding_complete INTEGER DEFAULT 1, onboarding_step TEXT DEFAULT 'complete', track_medication INTEGER DEFAULT 1, medication_name TEXT, medication_dosage TEXT, track_substances INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS cycle_logs (id TEXT PRIMARY KEY, user_id TEXT, logged_at TEXT, state TEXT, intensity INTEGER, symptoms TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS mood_logs (id TEXT PRIMARY KEY, user_id TEXT, logged_at TEXT, score INTEGER, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS sleep_logs (id TEXT PRIMARY KEY, user_id TEXT, date TEXT, quality_score INTEGER, duration_minutes INTEGER, source TEXT DEFAULT 'manual', bedtime TEXT, wake_time TEXT, deep_minutes INTEGER, rem_minutes INTEGER, awakenings INTEGER, raw_healthkit TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS medication_logs (id TEXT PRIMARY KEY, user_id TEXT, log_date TEXT, status TEXT, skip_reason TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS activity_completions (id TEXT PRIMARY KEY, user_id TEXT, activity_id TEXT, activity_name TEXT, completed_at TEXT, cycle_state TEXT, notes TEXT, bookmarked INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS journal_entries (id TEXT PRIMARY KEY, user_id TEXT, entry_date TEXT UNIQUE, blocks TEXT, cycle_state TEXT, mood_score INTEGER, locked INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS social_rhythm_logs (id TEXT PRIMARY KEY, user_id TEXT, date TEXT, score REAL, anchors_hit INTEGER, anchors_partial INTEGER, anchors_total INTEGER, anchor_detail TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS routine_anchors (id TEXT PRIMARY KEY, user_id TEXT, anchor_name TEXT, label TEXT, target_time TEXT, window_minutes INTEGER DEFAULT 30, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS routine_anchor_logs (id TEXT PRIMARY KEY, user_id TEXT, anchor_id TEXT, date TEXT, actual_time TEXT, source TEXT DEFAULT 'manual', created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS nutrition_logs (id TEXT PRIMARY KEY, user_id TEXT, log_date TEXT, categories TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS daily_checkins (id TEXT PRIMARY KEY, user_id TEXT, checkin_date TEXT, alcohol INTEGER, cannabis INTEGER, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS wearable_connections (id TEXT PRIMARY KEY, user_id TEXT, provider TEXT, connected_at TEXT, last_synced_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS prescribed_activities (id TEXT PRIMARY KEY, patient_id TEXT, activity_id TEXT, active INTEGER DEFAULT 1, notes TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, body TEXT, read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS community_posts (id TEXT PRIMARY KEY, author_id TEXT, channel TEXT DEFAULT 'wins_this_week', body TEXT, moderation_status TEXT DEFAULT 'approved', moderation_reason TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS community_reactions (id TEXT PRIMARY KEY, post_id TEXT, user_id TEXT, reaction TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS ai_reports (id TEXT PRIMARY KEY, user_id TEXT, report_type TEXT, period_start TEXT, period_end TEXT, report_json TEXT, pdf_url TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS notification_preferences (id TEXT PRIMARY KEY, user_id TEXT UNIQUE, push_token TEXT, push_token_updated_at TEXT, checkin_enabled INTEGER DEFAULT 1, checkin_time TEXT DEFAULT '20:00:00', checkin_ring INTEGER DEFAULT 0, journal_enabled INTEGER DEFAULT 0, journal_time TEXT DEFAULT '21:00:00', journal_ring INTEGER DEFAULT 0, sleep_log_enabled INTEGER DEFAULT 0, sleep_log_time TEXT DEFAULT '09:00:00', sleep_log_ring INTEGER DEFAULT 0, activity_reminder_enabled INTEGER DEFAULT 0, activity_reminder_time TEXT DEFAULT '15:00:00', activity_reminder_ring INTEGER DEFAULT 0, weekly_report_enabled INTEGER DEFAULT 1, early_warning_enabled INTEGER DEFAULT 1, anchor_nudges_enabled INTEGER DEFAULT 0, anchor_nudges_ring INTEGER DEFAULT 0, post_crisis_enabled INTEGER DEFAULT 0, updated_at TEXT DEFAULT (datetime('now')), created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS relapse_signatures (id TEXT PRIMARY KEY, user_id TEXT, episode_type TEXT, warning_signs TEXT, days_before INTEGER, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS report_shares (id TEXT PRIMARY KEY, report_id TEXT, user_id TEXT, companion_id TEXT, share_url TEXT, expires_at TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS workbook_responses (id TEXT PRIMARY KEY, user_id TEXT, module_id TEXT, question_id TEXT, response TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS companions (id TEXT PRIMARY KEY, user_id TEXT, companion_id TEXT, patient_id TEXT, role TEXT DEFAULT 'well_wisher', guardian_level TEXT, share_mood_summaries INTEGER DEFAULT 0, share_cycle_data INTEGER DEFAULT 0, share_ai_report INTEGER DEFAULT 0, share_medication INTEGER DEFAULT 0, invite_email TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS emergency_contacts (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, phone TEXT, relationship TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS psychiatrist_connections (id TEXT PRIMARY KEY, user_id TEXT, psychiatrist_id TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS psychiatrists_public (id TEXT PRIMARY KEY, name TEXT, specialisation TEXT, bio TEXT, calendly_url TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS medications (id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, dosage TEXT, times TEXT DEFAULT '[]', ring_enabled INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS user_substances (id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, category TEXT DEFAULT 'other', active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
      // Seed data — INSERT OR IGNORE is idempotent
      `INSERT OR IGNORE INTO profiles (id, display_name, user_role, diagnosis_confirmed, onboarding_complete, onboarding_step, current_cycle_state, track_medication, track_substances) VALUES ('${DEV_USER_ID}', 'Dev User', 'user', 1, 1, 'complete', 'stable', 1, 1)`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-01', '5-4-3-2-1 Grounding', 'Use your five senses to anchor yourself in the present moment. Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.', 5, 'grounding', '["stable","manic","depressive","mixed"]', '[]', 0, 'Evidence-based: anxiety & dissociation')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-02', 'Box Breathing', 'Breathe in for 4 counts, hold for 4, breathe out for 4, hold for 4. Repeat 4 times. Activates the parasympathetic system.', 5, 'grounding', '["stable","manic","depressive","mixed"]', '[]', 0, 'Evidence-based: stress regulation')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-03', 'Body Scan', 'Lie down and slowly move attention from head to toe, noticing tension or sensation without judgment. Great for depressive episodes.', 10, 'grounding', '["stable","depressive","mixed"]', '["manic"]', 0, 'Evidence-based: mindfulness & mood')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-04', 'Cold Water Reset', 'Run cold/medium water over your face, nose, ears, wrists till elbow, legs or any visible body part for 30 seconds. This activates the dive reflex and rapidly calms an escalating mood.', 2, 'grounding', '["manic","mixed"]', '[]', 0, 'Evidence-based: emotion regulation')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-05', 'Sleep Hygiene Audit', 'Review your last 3 nights: consistent bed/wake time? Screen-free 30 min before bed? Cool, dark room? Adjust one variable tonight.', 15, 'sleep', '["stable","depressive"]', '["manic"]', 0, 'Evidence-based: circadian stabilisation')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-06', 'Progressive Muscle Relaxation', 'Tense each muscle group for 5 seconds then release, working from feet to head. Reduces physiological tension in 15 minutes.', 15, 'sleep', '["stable","depressive","mixed"]', '[]', 0, 'Evidence-based: anxiety & insomnia')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-07', 'Gratitude Jar', 'Write one thing you are grateful for on a slip of paper and place it in a jar. Read past slips when you need a lift.', 10, 'self_esteem', '["stable","depressive"]', '["manic"]', 0, 'Evidence-based: positive affect')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-08', 'Compliment Diary', 'Write down three kind things someone said to you this week — or three things you did well. Re-read on difficult days.', 5, 'self_esteem', '["stable","depressive"]', '["manic"]', 0, 'Evidence-based: self-compassion')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-09', 'Proud Dandelion', 'Draw a dandelion. On each seed write something you are proud of — big or small. Blow the seeds away as a mindful release.', 10, 'self_esteem', '["stable","depressive"]', '["manic"]', 0, 'Creative expression')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-10', 'Letter I Will Not Send', 'Write an honest letter to someone who has hurt you — or to yourself. You will not send it. Burn, shred, or keep it privately.', 20, 'forgiveness', '["stable","depressive"]', '["manic"]', 0, 'Evidence-based: emotional processing')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-11', 'Values Check-In', 'List your top 5 values. For each one, rate 0-10 how much your recent actions reflected it. Choose one value to act on today.', 15, 'reflection', '["stable"]', '[]', 0, 'Evidence-based: ACT therapy')`,
      `INSERT OR IGNORE INTO activities (id, title, description, duration_minutes, category, compatible_states, restricted_states, is_workbook_entry, evidence_label) VALUES ('act-12', 'Bipolar Workbook', 'Structured CBT and psychoeducation exercises for bipolar disorder. Work through modules at your own pace.', NULL, 'reflection', '["stable","manic","depressive","mixed"]', '[]', 1, NULL)`,
      `INSERT OR IGNORE INTO routine_anchors (id, user_id, anchor_name, label, target_time, window_minutes) VALUES ('anc-1', '${DEV_USER_ID}', 'wake', 'Wake up', '07:00', 30)`,
      `INSERT OR IGNORE INTO routine_anchors (id, user_id, anchor_name, label, target_time, window_minutes) VALUES ('anc-2', '${DEV_USER_ID}', 'breakfast', 'Breakfast', '08:00', 30)`,
      `INSERT OR IGNORE INTO routine_anchors (id, user_id, anchor_name, label, target_time, window_minutes) VALUES ('anc-3', '${DEV_USER_ID}', 'medication', 'Morning medication', '08:30', 60)`,
      `INSERT OR IGNORE INTO routine_anchors (id, user_id, anchor_name, label, target_time, window_minutes) VALUES ('anc-4', '${DEV_USER_ID}', 'lunch', 'Lunch', '12:30', 60)`,
      `INSERT OR IGNORE INTO routine_anchors (id, user_id, anchor_name, label, target_time, window_minutes) VALUES ('anc-5', '${DEV_USER_ID}', 'dinner', 'Dinner', '19:00', 60)`,
      `INSERT OR IGNORE INTO routine_anchors (id, user_id, anchor_name, label, target_time, window_minutes) VALUES ('anc-6', '${DEV_USER_ID}', 'bedtime', 'Bedtime', '22:30', 30)`,
    ],
  },

  // ── Add new migrations here — never edit above ──────────────────────────────
  {
    version: 2,
    statements: [
      // Seed default notification_preferences for dev user (idempotent)
      `INSERT OR IGNORE INTO notification_preferences (id, user_id, checkin_enabled, checkin_time, checkin_ring, journal_enabled, journal_time, journal_ring, sleep_log_enabled, sleep_log_time, sleep_log_ring, activity_reminder_enabled, activity_reminder_time, activity_reminder_ring, weekly_report_enabled, early_warning_enabled, anchor_nudges_enabled, anchor_nudges_ring, post_crisis_enabled) VALUES ('notif-prefs-dev', '${DEV_USER_ID}', 1, '20:00:00', 0, 0, '21:00:00', 0, 0, '09:00:00', 0, 0, '15:00:00', 0, 1, 1, 0, 0, 0)`,
    ],
  },
  {
    version: 3,
    statements: [
      // Rebuild workbook_responses with correct schema (chapter/prompt_index/entry_date)
      // Old schema used module_id/question_id — safe to drop since it's dev-only data
      `DROP TABLE IF EXISTS workbook_responses`,
      `CREATE TABLE IF NOT EXISTS workbook_responses (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), user_id TEXT NOT NULL, chapter INTEGER NOT NULL, prompt_index INTEGER NOT NULL, response TEXT NOT NULL, entry_date TEXT NOT NULL DEFAULT (date('now')), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    ],
  },
];

// ─── Migration runner ─────────────────────────────────────────────────────────

const sqliteDb = SQLite.openDatabaseSync('equi-dev.db');

function runMigrations() {
  // Version tracking table — single row, id=1
  sqliteDb.execSync(`CREATE TABLE IF NOT EXISTS _schema_version (id INTEGER PRIMARY KEY DEFAULT 1, version INTEGER NOT NULL DEFAULT 0)`);
  sqliteDb.execSync(`INSERT OR IGNORE INTO _schema_version (id, version) VALUES (1, 0)`);

  const row = sqliteDb.getFirstSync(`SELECT version FROM _schema_version WHERE id = 1`) as { version: number } | null;
  const currentVersion = row?.version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;

    console.log(`[DevDB] Running migration v${migration.version}`);
    for (const stmt of migration.statements) {
      try {
        sqliteDb.execSync(stmt);
      } catch (e) {
        // Expected for ALTER TABLE on fresh DBs (column already in CREATE TABLE)
        // Log at debug level only — not a real error
        if (__DEV__) {
          const preview = stmt.trim().slice(0, 70);
          console.debug(`[DevDB] v${migration.version} stmt skipped (ok): ${preview}`);
        }
      }
    }
    sqliteDb.execSync(`UPDATE _schema_version SET version = ${migration.version} WHERE id = 1`);
    console.log(`[DevDB] Migration v${migration.version} done`);
  }
}

runMigrations();

// ─── JSON & Bool serialization helpers ────────────────────────────────────────

// Columns stored as JSON strings in SQLite
const JSON_COLS = new Set([
  'symptoms', 'blocks', 'categories', 'anchor_detail', 'raw_healthkit',
  'report_json', 'warning_signs', 'compatible_states', 'restricted_states',
  'times',
]);

// Columns stored as 0/1 integers in SQLite, returned as booleans
const BOOL_COLS = new Set([
  'alcohol', 'cannabis', 'diagnosis_confirmed', 'onboarding_complete', 'is_active',
  'bookmarked', 'is_workbook_entry', 'track_substances', 'track_medication', 'locked',
  'ring_enabled', 'active',
  'share_mood_summaries', 'share_cycle_data', 'share_ai_report', 'share_medication',
  'checkin_enabled', 'checkin_ring', 'anchor_nudges_enabled', 'anchor_nudges_ring',
  'journal_enabled', 'journal_ring', 'sleep_log_enabled', 'sleep_log_ring',
  'activity_reminder_enabled', 'activity_reminder_ring',
  'weekly_report_enabled', 'early_warning_enabled', 'post_crisis_enabled',
  'read',
]);

type SqlValue = string | number | null | boolean;
type SqlRow = Record<string, SqlValue>;

function serializeRow(row: Record<string, unknown>): SqlRow {
  const out: SqlRow = {};
  for (const [k, v] of Object.entries(row)) {
    if (Array.isArray(v) || (v !== null && typeof v === 'object')) {
      out[k] = JSON.stringify(v);
    } else if (typeof v === 'boolean') {
      out[k] = v ? 1 : 0;
    } else {
      out[k] = v as SqlValue;
    }
  }
  return out;
}

function deserializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && typeof v === 'string' && JSON_COLS.has(k)) {
      try { out[k] = JSON.parse(v); } catch { out[k] = v; }
    } else if (BOOL_COLS.has(k) && typeof v === 'number') {
      out[k] = v === 1;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function randomId(): string {
  return `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

// ─── Query builder ────────────────────────────────────────────────────────────

type Op = 'select' | 'insert' | 'upsert' | 'update' | 'delete';

class DevQueryBuilder {
  private _table: string;
  private _wheres: string[] = [];
  private _params: SqlValue[] = [];
  private _op: Op = 'select';
  private _data: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private _orderCol: string | null = null;
  private _orderAsc = true;
  private _single = false;
  private _maybeSingle = false;
  private _conflictCols: string[] = [];
  private _selectCols = '*';
  private _limitVal: number | null = null;
  private _rangeFrom: number | null = null;
  private _rangeTo: number | null = null;
  private _returning = false;

  constructor(table: string) {
    this._table = table;
  }

  select(cols = '*') {
    if (this._op === 'insert' || this._op === 'upsert' || this._op === 'update') {
      // .insert().select() — keep write op, just flag that we return the row
      this._returning = true;
    } else {
      this._op = 'select';
    }
    this._selectCols = cols;
    return this;
  }
  eq(col: string, val: unknown) { this._wheres.push(`${col} = ?`); this._params.push(val as SqlValue); return this; }
  gte(col: string, val: unknown) { this._wheres.push(`${col} >= ?`); this._params.push(val as SqlValue); return this; }
  lte(col: string, val: unknown) { this._wheres.push(`${col} <= ?`); this._params.push(val as SqlValue); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this._orderCol = col; this._orderAsc = opts?.ascending ?? true; return this; }
  limit(n: number) { this._limitVal = n; return this; }
  range(from: number, to: number) { this._rangeFrom = from; this._rangeTo = to; return this; }

  not(col: string, operator: string, val: unknown) {
    if (operator === 'is' && val === null) {
      this._wheres.push(`${col} IS NOT NULL`);
    } else if (operator === 'eq') {
      this._wheres.push(`${col} != ?`);
      this._params.push(val as SqlValue);
    } else {
      console.warn('[DevDB] unsupported .not() operator:', operator);
    }
    return this;
  }

  contains(_col: string, _val: unknown) {
    // Best-effort dev approximation — no JSON-array filtering
    return this;
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]) { this._op = 'insert'; this._data = data; return this; }
  upsert(data: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }) {
    this._op = 'upsert';
    this._data = data;
    if (opts?.onConflict) this._conflictCols = opts.onConflict.split(',').map((s) => s.trim());
    return this;
  }
  update(data: Record<string, unknown>) { this._op = 'update'; this._data = data; return this; }
  delete() { this._op = 'delete'; return this; }

  single() { this._single = true; return this._exec(); }
  maybeSingle() { this._maybeSingle = true; return this._exec(); }

  then(resolve: (v: { data: unknown; error: null }) => unknown, reject: (e: unknown) => unknown) {
    return this._exec().then(resolve, reject);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _whereClause() {
    return this._wheres.length ? ` WHERE ${this._wheres.join(' AND ')}` : '';
  }

  private _processRows(rows: Record<string, unknown>[]): unknown[] {
    return rows.map((row) => {
      const d = deserializeRow(row);

      // Supabase join: activity:activities(*)
      if (
        (this._table === 'activity_completions' || this._table === 'prescribed_activities') &&
        this._selectCols.includes('activity:activities')
      ) {
        const act = sqliteDb.getFirstSync('SELECT * FROM activities WHERE id = ?', [d.activity_id as string]) as Record<string, unknown> | null;
        return { ...d, activity: act ? deserializeRow(act) : { title: d.activity_name ?? 'Activity', id: d.activity_id, compatible_states: [], restricted_states: [] } };
      }

      // Supabase join: reactions:community_reactions(reaction,user_id)
      if (this._table === 'community_posts' && this._selectCols.includes('community_reactions')) {
        const reactions = sqliteDb.getAllSync('SELECT reaction, user_id FROM community_reactions WHERE post_id = ?', [d.id as string]) as { reaction: string; user_id: string }[];
        return { ...d, reactions };
      }

      return d;
    });
  }

  private async _exec(): Promise<{ data: unknown; error: null }> {
    try {
      if (this._op === 'select') {
        let sql = `SELECT * FROM ${this._table}${this._whereClause()}`;
        if (this._orderCol) sql += ` ORDER BY ${this._orderCol} ${this._orderAsc ? 'ASC' : 'DESC'}`;
        if (this._single || this._maybeSingle) {
          sql += ' LIMIT 1';
        } else if (this._rangeFrom !== null && this._rangeTo !== null) {
          sql += ` LIMIT ${this._rangeTo - this._rangeFrom + 1} OFFSET ${this._rangeFrom}`;
        } else if (this._limitVal !== null) {
          sql += ` LIMIT ${this._limitVal}`;
        }
        const rows = sqliteDb.getAllSync(sql, this._params) as Record<string, unknown>[];
        const processed = this._processRows(rows);
        if (this._single || this._maybeSingle) return { data: processed[0] ?? null, error: null };
        return { data: processed, error: null };
      }

      if (this._op === 'insert' || this._op === 'upsert') {
        const rows = Array.isArray(this._data) ? this._data : [this._data!];
        const inserted: Record<string, unknown>[] = [];
        for (const rawRow of rows) {
          const row = serializeRow({ id: randomId(), ...rawRow });
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(', ');
          const values = keys.map((k) => row[k]);
          let sql: string;
          if (this._op === 'upsert' && this._conflictCols.length > 0) {
            const updateCols = keys.filter((k) => !this._conflictCols.includes(k));
            const updateClause = updateCols.map((k) => `${k} = excluded.${k}`).join(', ');
            sql = `INSERT INTO ${this._table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${this._conflictCols.join(', ')}) DO UPDATE SET ${updateClause}`;
          } else {
            sql = `INSERT OR REPLACE INTO ${this._table} (${keys.join(', ')}) VALUES (${placeholders})`;
          }
          sqliteDb.runSync(sql, values);
          const whereCol = this._conflictCols[0] ?? 'id';
          const fetched = sqliteDb.getFirstSync(`SELECT * FROM ${this._table} WHERE ${whereCol} = ?`, [row[whereCol]]) as Record<string, unknown> | null;
          if (fetched) inserted.push(deserializeRow(fetched));
        }
        if (this._returning || this._single || this._maybeSingle) return { data: inserted[0] ?? null, error: null };
        return { data: inserted, error: null };
      }

      if (this._op === 'update') {
        const row = serializeRow(this._data as Record<string, unknown>);
        const keys = Object.keys(row);
        const setClause = keys.map((k) => `${k} = ?`).join(', ');
        const values: SqlValue[] = [...keys.map((k) => row[k]), ...this._params];
        sqliteDb.runSync(`UPDATE ${this._table} SET ${setClause}${this._whereClause()}`, values);
        return { data: null, error: null };
      }

      if (this._op === 'delete') {
        sqliteDb.runSync(`DELETE FROM ${this._table}${this._whereClause()}`, this._params);
        return { data: null, error: null };
      }

      return { data: null, error: null };
    } catch (e) {
      console.warn('[DevDB]', this._table, this._op, e);
      return { data: null, error: null };
    }
  }
}

// ─── Auth mock ────────────────────────────────────────────────────────────────

export const devAuth = {
  getSession: async () => ({ data: { session: DEV_SESSION }, error: null }),
  onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
    setTimeout(() => cb('SIGNED_IN', DEV_SESSION), 0);
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  signOut: async () => ({ error: null }),
  signInWithOtp: async () => ({ error: null }),
  verifyOtp: async () => ({ data: { session: DEV_SESSION }, error: null }),
  getUser: async () => ({ data: { user: DEV_SESSION.user }, error: null }),
};

// ─── Dev client (mirrors supabase shape) ─────────────────────────────────────

export const devClient = {
  from: (table: string) => new DevQueryBuilder(table),
  auth: devAuth,
};
