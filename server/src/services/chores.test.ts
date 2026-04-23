import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "../db/connection.js";
import { createTestDatabase } from "../db/test-helpers.js";
import { getDashboardData } from "./dashboard.js";
import {
  ChoreValidationError,
  createChore,
  deleteChore,
  parseCreateChoreInput
} from "./chores.js";

let db: DatabaseConnection | null = null;

afterEach(() => {
  db?.close();
  db = null;
});

function createBaseFixture() {
  db = createTestDatabase();
  const now = "2026-04-23T08:00:00.000Z";

  db.prepare(
    `
      INSERT INTO children (id, name, sort_order, created_at, updated_at)
      VALUES
        ('child-1', 'Sample Child 1', 1, @now, @now),
        ('child-2', 'Sample Child 2', 2, @now, @now)
    `
  ).run({ now });

  return db;
}

describe("parseCreateChoreInput", () => {
  it("normalizes and validates a create chore payload", () => {
    const parsed = parseCreateChoreInput({
      title: "  Sweep kitchen  ",
      description: "  Quick clean  ",
      pointValue: "5",
      assigneeChildId: null,
      scheduleDays: [4, 1, 4]
    });

    expect(parsed).toEqual({
      title: "Sweep kitchen",
      description: "Quick clean",
      pointValue: 5,
      assigneeChildId: null,
      scheduleDays: [1, 4]
    });
  });

  it("rejects invalid chore payloads", () => {
    expect(() => parseCreateChoreInput({ title: "", pointValue: 0 })).toThrow(
      ChoreValidationError
    );
  });
});

describe("createChore", () => {
  it("creates a chore with schedule days that appears on the dashboard", () => {
    const fixtureDb = createBaseFixture();

    const input = parseCreateChoreInput({
      title: "Sweep kitchen",
      description: "Quick clean",
      pointValue: 5,
      assigneeChildId: "child-1",
      scheduleDays: [4]
    });

    createChore(fixtureDb, input);

    const dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);

    expect(dashboard.children[0]?.chores).toHaveLength(1);
    expect(dashboard.children[0]?.chores[0]).toMatchObject({
      title: "Sweep kitchen",
      pointValue: 5,
      assigneeChildId: "child-1",
      scheduledDays: [4]
    });
  });
});

describe("deleteChore", () => {
  it("soft deletes a chore so it no longer shows on the dashboard", () => {
    const fixtureDb = createBaseFixture();
    const now = "2026-04-23T08:00:00.000Z";

    fixtureDb.prepare(
      `
        INSERT INTO chores (
          id,
          title,
          description,
          point_value,
          assignee_child_id,
          is_active,
          created_at,
          updated_at
        ) VALUES
          ('chore-1', 'Clear table', '', 5, NULL, 1, @now, @now)
      `
    ).run({ now });

    deleteChore(fixtureDb, "chore-1");

    const dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);
    expect(dashboard.unassignedChores).toEqual([]);
  });
});

