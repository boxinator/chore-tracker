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

    DROP INDEX IF EXISTS idx_chore_completions_active_per_day;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_chore_completions_active_per_child_day
      ON chore_completions (chore_id, child_id, completion_date_local, status);
  `);

  db.exec(`
    INSERT OR IGNORE INTO chore_assignments (id, chore_id, child_id, day_of_week)
    SELECT
      'assignment-' || ch.id || '-' || ch.assignee_child_id || '-' || days.day_of_week,
      ch.id,
      ch.assignee_child_id,
      days.day_of_week
    FROM chores ch
    JOIN (
      SELECT 0 AS day_of_week UNION ALL
      SELECT 1 UNION ALL
      SELECT 2 UNION ALL
      SELECT 3 UNION ALL
      SELECT 4 UNION ALL
      SELECT 5 UNION ALL
      SELECT 6
    ) days
    WHERE ch.assignee_child_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM chore_schedule_days csd
        WHERE csd.chore_id = ch.id
      );

    INSERT OR IGNORE INTO chore_assignments (id, chore_id, child_id, day_of_week)
    SELECT
      'assignment-' || ch.id || '-' || ch.assignee_child_id || '-' || csd.day_of_week,
      ch.id,
      ch.assignee_child_id,
      csd.day_of_week
    FROM chores ch
    INNER JOIN chore_schedule_days csd ON csd.chore_id = ch.id
    WHERE ch.assignee_child_id IS NOT NULL;

    INSERT OR IGNORE INTO chore_schedule_days (id, chore_id, day_of_week)
    SELECT
      'schedule-' || ch.id || '-' || days.day_of_week,
      ch.id,
      days.day_of_week
    FROM chores ch
    JOIN (
      SELECT 0 AS day_of_week UNION ALL
      SELECT 1 UNION ALL
      SELECT 2 UNION ALL
      SELECT 3 UNION ALL
      SELECT 4 UNION ALL
      SELECT 5 UNION ALL
      SELECT 6
    ) days
    WHERE ch.assignee_child_id IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM chore_assignments ca
        WHERE ca.chore_id = ch.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM chore_schedule_days csd
        WHERE csd.chore_id = ch.id
      );

    UPDATE chores
    SET assignee_child_id = NULL
    WHERE assignee_child_id IS NOT NULL;
  `);

  const childColumns = db.prepare("PRAGMA table_info(children)").all() as Array<{ name: string }>;
  const hasAvatarKey = childColumns.some((column) => column.name === "avatar_key");

  if (!hasAvatarKey) {
    db.exec("ALTER TABLE children ADD COLUMN avatar_key TEXT");
  }

  db.exec(`
    UPDATE children
    SET avatar_key = 'toon-head-01'
    WHERE avatar_key LIKE 'pixel-art-%'
  `);
}
