import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { completeChore, uncompleteChore } from "../services/chores.js";
import { createDatabaseConnection } from "./connection.js";
import { setupDatabase } from "./index.js";
import { initializeSchema } from "./schema.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("setupDatabase", () => {
  it("migrates the legacy completion index for repeated recurring-chore reversals", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "chore-tracker-db-"));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, "chore-tracker.db");
    const fixtureDb = createDatabaseConnection(databasePath);
    const now = "2026-04-23T08:00:00.000Z";

    initializeSchema(fixtureDb);
    fixtureDb.exec(`
      DROP INDEX idx_chore_completions_active_per_child_day;
      CREATE UNIQUE INDEX idx_chore_completions_active_per_child_day
        ON chore_completions (chore_id, child_id, completion_date_local, status);
    `);
    fixtureDb.prepare(
      `
        INSERT INTO children (id, name, sort_order, created_at, updated_at)
        VALUES ('child-1', 'Sample Child 1', 1, @now, @now)
      `
    ).run({ now });
    fixtureDb.prepare(
      `
        INSERT INTO chores (
          id, title, description, point_value, assignee_child_id, is_active, created_at, updated_at
        ) VALUES ('chore-1', 'Recurring chore', '', 5, NULL, 1, @now, @now)
      `
    ).run({ now });
    fixtureDb.prepare(
      `
        INSERT INTO chore_assignments (id, chore_id, child_id, day_of_week)
        VALUES ('assignment-1', 'chore-1', 'child-1', 4)
      `
    ).run();
    fixtureDb.close();

    const db = setupDatabase(databasePath);

    completeChore(db, "chore-1", "child-1", "2026-04-23", 4);
    uncompleteChore(db, "chore-1", "child-1", "2026-04-23");
    completeChore(db, "chore-1", "child-1", "2026-04-23", 4);
    expect(() => uncompleteChore(db, "chore-1", "child-1", "2026-04-23")).not.toThrow();

    const index = db
      .prepare(
        `
          SELECT sql
          FROM sqlite_master
          WHERE type = 'index'
            AND name = 'idx_chore_completions_active_per_child_day'
        `
      )
      .get() as { sql: string };

    expect(index.sql).toContain("WHERE status = 'completed'");
    db.close();
  });
});
