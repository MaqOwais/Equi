/**
 * dev-db.ts — SQLite-backed local client that mirrors the Supabase query builder API.
 * Used automatically when DEV_MODE = true (no OTP, no network needed).
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

// ─── SQLite setup ─────────────────────────────────────────────────────────────

const sqliteDb = SQLite.openDatabaseSync('equi-dev.db');

sqliteDb.execSync(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    user_role TEXT DEFAULT 'user',
    diagnosis_confirmed INTEGER DEFAULT 0,
    current_cycle_state TEXT DEFAULT 'stable',
    onboarding_complete INTEGER DEFAULT 1,
    onboarding_step TEXT DEFAULT 'complete',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cycle_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    logged_at TEXT,
    state TEXT,
    intensity INTEGER,
    symptoms TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mood_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    logged_at TEXT,
    score INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sleep_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    date TEXT,
    quality_score INTEGER,
    duration_minutes INTEGER,
    source TEXT DEFAULT 'manual',
    bedtime TEXT,
    wake_time TEXT,
    deep_minutes INTEGER,
    rem_minutes INTEGER,
    awakenings INTEGER,
    raw_healthkit TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS medication_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    log_date TEXT,
    status TEXT,
    skip_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    description TEXT,
    category TEXT,
    target_per_week INTEGER DEFAULT 3,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_completions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    activity_id TEXT,
    activity_name TEXT,
    completed_at TEXT,
    cycle_state TEXT,
    notes TEXT,
    bookmarked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    entry_date TEXT UNIQUE,
    blocks TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS social_rhythm_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    date TEXT,
    score REAL,
    anchors_hit INTEGER,
    anchors_partial INTEGER,
    anchors_total INTEGER,
    anchor_detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS routine_anchors (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    anchor_name TEXT,
    label TEXT,
    target_time TEXT,
    window_minutes INTEGER DEFAULT 30,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS routine_anchor_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    anchor_id TEXT,
    date TEXT,
    actual_time TEXT,
    source TEXT DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS nutrition_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    log_date TEXT,
    categories TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    checkin_date TEXT,
    alcohol INTEGER,
    cannabis INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wearable_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    provider TEXT,
    connected_at TEXT,
    last_synced_at TEXT
  );

  CREATE TABLE IF NOT EXISTS prescribed_activities (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    activity_id TEXT,
    active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    title TEXT,
    body TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT,
    channel TEXT DEFAULT 'wins_this_week',
    body TEXT,
    moderation_status TEXT DEFAULT 'approved',
    moderation_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS community_reactions (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    user_id TEXT,
    reaction TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ai_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    report_type TEXT,
    period_start TEXT,
    period_end TEXT,
    report_json TEXT,
    pdf_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    early_warning_enabled INTEGER DEFAULT 1,
    daily_checkin_enabled INTEGER DEFAULT 1,
    push_token TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS relapse_signatures (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    episode_type TEXT,
    warning_signs TEXT,
    days_before INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS report_shares (
    id TEXT PRIMARY KEY,
    report_id TEXT,
    user_id TEXT,
    companion_id TEXT,
    share_url TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workbook_responses (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    module_id TEXT,
    question_id TEXT,
    response TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS companions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    companion_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS emergency_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    phone TEXT,
    relationship TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS psychiatrist_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    psychiatrist_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS psychiatrists_public (
    id TEXT PRIMARY KEY,
    name TEXT,
    specialisation TEXT,
    bio TEXT,
    calendly_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Seed dev data (INSERT OR IGNORE so it only runs once) ───────────────────

sqliteDb.execSync(`
  INSERT OR IGNORE INTO profiles (id, display_name, user_role, diagnosis_confirmed, onboarding_complete, onboarding_step, current_cycle_state)
  VALUES ('${DEV_USER_ID}', 'Dev User', 'user', 1, 1, 'complete', 'stable');

  INSERT OR IGNORE INTO activities (id, user_id, name, description, category, target_per_week) VALUES
    ('act-1', '${DEV_USER_ID}', 'Morning Walk', '15-minute gentle walk', 'movement', 5),
    ('act-2', '${DEV_USER_ID}', 'Meditation', '10-minute guided meditation', 'mindfulness', 7),
    ('act-3', '${DEV_USER_ID}', 'Journaling', 'Free-write for 10 minutes', 'expression', 5),
    ('act-4', '${DEV_USER_ID}', 'Creative Art', 'Drawing, painting, or crafts', 'expression', 3),
    ('act-5', '${DEV_USER_ID}', 'Social Call', 'Connect with a friend or family member', 'social', 3);

  INSERT OR IGNORE INTO routine_anchors (id, user_id, anchor_name, label, target_time, window_minutes) VALUES
    ('anc-1', '${DEV_USER_ID}', 'wake', 'Wake up', '07:00', 30),
    ('anc-2', '${DEV_USER_ID}', 'breakfast', 'Breakfast', '08:00', 30),
    ('anc-3', '${DEV_USER_ID}', 'medication', 'Morning medication', '08:30', 60),
    ('anc-4', '${DEV_USER_ID}', 'lunch', 'Lunch', '12:30', 60),
    ('anc-5', '${DEV_USER_ID}', 'dinner', 'Dinner', '19:00', 60),
    ('anc-6', '${DEV_USER_ID}', 'bedtime', 'Bedtime', '22:30', 30);
`);

// ─── JSON serialization helpers ───────────────────────────────────────────────

const JSON_COLS = new Set([
  'symptoms', 'blocks', 'categories', 'anchor_detail', 'raw_healthkit',
  'report_json', 'warning_signs', 'compatible_states',
]);
const BOOL_COLS = new Set(['alcohol', 'cannabis', 'diagnosis_confirmed', 'onboarding_complete', 'is_active', 'bookmarked']);

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Array)) {
      out[k] = JSON.stringify(v);
    } else if (Array.isArray(v)) {
      out[k] = JSON.stringify(v);
    } else if (typeof v === 'boolean') {
      out[k] = v ? 1 : 0;
    } else {
      out[k] = v;
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
  private _params: unknown[] = [];
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

  constructor(table: string) {
    this._table = table;
  }

  select(cols = '*') {
    this._op = 'select';
    this._selectCols = cols;
    return this;
  }

  eq(col: string, val: unknown) {
    this._wheres.push(`${col} = ?`);
    this._params.push(val);
    return this;
  }

  gte(col: string, val: unknown) {
    this._wheres.push(`${col} >= ?`);
    this._params.push(val);
    return this;
  }

  lte(col: string, val: unknown) {
    this._wheres.push(`${col} <= ?`);
    this._params.push(val);
    return this;
  }

  not(col: string, operator: string, val: unknown) {
    if (operator === 'is' && val === null) {
      this._wheres.push(`${col} IS NOT NULL`);
    } else if (operator === 'eq') {
      this._wheres.push(`${col} != ?`);
      this._params.push(val);
    } else {
      // Fallback: ignore unknown operator so query still runs
      console.warn('[DevDB] unsupported .not() operator:', operator);
    }
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this._orderCol = col;
    this._orderAsc = opts?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this._limitVal = n;
    return this;
  }

  range(from: number, to: number) {
    this._rangeFrom = from;
    this._rangeTo = to;
    return this;
  }

  contains(col: string, _val: unknown) {
    // Best-effort: in dev mode just allow all rows through (no JSON-array filtering)
    void col;
    return this;
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]) {
    this._op = 'insert';
    this._data = data;
    return this;
  }

  upsert(data: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }) {
    this._op = 'upsert';
    this._data = data;
    if (opts?.onConflict) {
      this._conflictCols = opts.onConflict.split(',').map((s) => s.trim());
    }
    return this;
  }

  update(data: Record<string, unknown>) {
    this._op = 'update';
    this._data = data;
    return this;
  }

  delete() {
    this._op = 'delete';
    return this;
  }

  single() {
    this._single = true;
    return this._exec();
  }

  maybeSingle() {
    this._maybeSingle = true;
    return this._exec();
  }

  // Thenable — resolves when awaited directly
  then(
    resolve: (v: { data: unknown; error: null }) => unknown,
    reject: (e: unknown) => unknown,
  ) {
    return this._exec().then(resolve, reject);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _whereClause() {
    return this._wheres.length > 0 ? ` WHERE ${this._wheres.join(' AND ')}` : '';
  }

  private _processRows(rows: Record<string, unknown>[]): unknown[] {
    return rows.map((row) => {
      const d = deserializeRow(row);

      // Handle Supabase join notation: "activity:activities(name|category|*)"
      if (
        (this._table === 'activity_completions' || this._table === 'prescribed_activities') &&
        this._selectCols.includes('activity:activities')
      ) {
        const act = sqliteDb.getFirstSync(
          'SELECT * FROM activities WHERE id = ?',
          [d.activity_id],
        ) as Record<string, unknown> | null;
        return {
          ...d,
          activity: act ? deserializeRow(act) : { name: d.activity_name ?? 'Activity', id: d.activity_id },
        };
      }

      // Handle "*, reactions:community_reactions(reaction, user_id)" join
      if (this._table === 'community_posts' && this._selectCols.includes('community_reactions')) {
        const reactions = sqliteDb.getAllSync(
          'SELECT reaction, user_id FROM community_reactions WHERE post_id = ?',
          [d.id],
        ) as { reaction: string; user_id: string }[];
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

        if (this._single || this._maybeSingle) {
          return { data: processed[0] ?? null, error: null };
        }
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
            sql = `INSERT INTO ${this._table} (${keys.join(', ')}) VALUES (${placeholders})
              ON CONFLICT (${this._conflictCols.join(', ')}) DO UPDATE SET ${updateClause}`;
          } else {
            sql = `INSERT OR REPLACE INTO ${this._table} (${keys.join(', ')}) VALUES (${placeholders})`;
          }

          sqliteDb.runSync(sql, values);

          // Fetch the upserted row back for return value
          const whereCol = this._conflictCols[0] ?? 'id';
          const whereVal = row[whereCol];
          const fetched = sqliteDb.getFirstSync(
            `SELECT * FROM ${this._table} WHERE ${whereCol} = ?`,
            [whereVal],
          ) as Record<string, unknown> | null;

          if (fetched) inserted.push(deserializeRow(fetched));
        }

        if (this._single || this._maybeSingle) return { data: inserted[0] ?? null, error: null };
        return { data: inserted, error: null };
      }

      if (this._op === 'update') {
        const row = serializeRow(this._data as Record<string, unknown>);
        const keys = Object.keys(row);
        const setClause = keys.map((k) => `${k} = ?`).join(', ');
        const values = [...keys.map((k) => row[k]), ...this._params];
        sqliteDb.runSync(
          `UPDATE ${this._table} SET ${setClause}${this._whereClause()}`,
          values,
        );
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

  signOut: async () => {
    return { error: null };
  },

  signInWithOtp: async () => ({ error: null }),

  verifyOtp: async () => ({ data: { session: DEV_SESSION }, error: null }),

  getUser: async () => ({ data: { user: DEV_SESSION.user }, error: null }),
};

// ─── Dev client (mirrors supabase shape) ─────────────────────────────────────

export const devClient = {
  from: (table: string) => new DevQueryBuilder(table),
  auth: devAuth,
};
