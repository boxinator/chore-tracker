import type { DatabaseConnection } from "./connection.js";

export function initializeSchema(db: DatabaseConnection) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_key TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chores (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      point_value INTEGER NOT NULL,
      assignee_child_id TEXT REFERENCES children(id) ON DELETE SET NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chore_schedule_days (
      id TEXT PRIMARY KEY,
      chore_id TEXT NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_chore_schedule_unique
      ON chore_schedule_days (chore_id, day_of_week);

    CREATE TABLE IF NOT EXISTS chore_assignments (
      id TEXT PRIMARY KEY,
      chore_id TEXT NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_chore_assignments_unique
      ON chore_assignments (chore_id, child_id, day_of_week);

    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      cost INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      assignee_child_id TEXT NOT NULL REFERENCES children(id),
      status TEXT NOT NULL CHECK (status IN ('open', 'completed')),
      completion_date_local TEXT,
      completed_at TEXT,
      uncompleted_at TEXT,
      completion_ledger_entry_id TEXT REFERENCES ledger_entries(id),
      uncompletion_ledger_entry_id TEXT REFERENCES ledger_entries(id),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      child_id TEXT NOT NULL REFERENCES children(id),
      child_name_snapshot TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_name_snapshot TEXT NOT NULL,
      point_delta INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      reversal_of_id TEXT REFERENCES ledger_entries(id),
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS chore_completions (
      id TEXT PRIMARY KEY,
      chore_id TEXT NOT NULL REFERENCES chores(id),
      child_id TEXT NOT NULL REFERENCES children(id),
      completion_date_local TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      reversed_at TEXT,
      status TEXT NOT NULL CHECK (status IN ('completed', 'reversed')),
      ledger_entry_id TEXT REFERENCES ledger_entries(id),
      reversal_ledger_entry_id TEXT REFERENCES ledger_entries(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_chore_completions_active_per_child_day
      ON chore_completions (chore_id, child_id, completion_date_local, status);
  `);
}
