import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "../db/connection.js";
import { createTestDatabase } from "../db/test-helpers.js";
import { getDashboardData } from "./dashboard.js";
import {
  assignChore,
  ChoreValidationError,
  completeChore,
  createChore,
  deleteChore,
  parseCreateChoreInput,
  parseUpdateChoreInput,
  updateChore,
  uncompleteChore
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

describe("updateChore", () => {
  it("updates title, description, points, assignment, and schedule days", () => {
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
          ('chore-1', 'Clear table', 'After dinner', 5, NULL, 1, @now, @now)
      `
    ).run({ now });

    const input = parseUpdateChoreInput({
      title: " Sweep kitchen ",
      description: " Quick reset ",
      pointValue: "7",
      assigneeChildId: "child-2",
      scheduleDays: [6, 1, 6]
    });

    updateChore(fixtureDb, "chore-1", input);

    const dashboard = getDashboardData(fixtureDb, "2026-04-27", 1);
    expect(dashboard.children[1]?.chores[0]).toMatchObject({
      id: "chore-1",
      title: "Sweep kitchen",
      description: "Quick reset",
      pointValue: 7,
      assigneeChildId: "child-2",
      scheduledDays: [1, 6]
    });

    const offDayDashboard = getDashboardData(fixtureDb, "2026-04-28", 2);
    expect(offDayDashboard.children[1]?.chores).toEqual([]);
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

describe("assignChore", () => {
  it("assigns an unassigned chore to a child", () => {
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

    assignChore(fixtureDb, "chore-1", "child-2");

    const dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);
    expect(dashboard.children[1]?.chores[0]?.id).toBe("chore-1");
  });

  it("moves a newly assigned chore to the top of the assignee lane", () => {
    const fixtureDb = createBaseFixture();

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
          ('chore-older', 'Older assigned', '', 5, 'child-2', 1, '2026-04-23T08:00:00.000Z', '2026-04-23T08:00:00.000Z'),
          ('chore-new', 'Newly assigned', '', 5, NULL, 1, '2026-04-23T07:00:00.000Z', '2026-04-23T07:00:00.000Z')
      `
    ).run();

    assignChore(fixtureDb, "chore-new", "child-2");

    const dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);
    expect(dashboard.children[1]?.chores.map((chore) => chore.id)).toEqual([
      "chore-new",
      "chore-older"
    ]);
  });
});

describe("completeChore and uncompleteChore", () => {
  it("blocks completion for unassigned chores", () => {
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

    expect(() => completeChore(fixtureDb, "chore-1", "2026-04-23", 4)).toThrow(
      ChoreValidationError
    );
  });

  it("completes and uncompletes a chore with ledger reversals", () => {
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
          ('chore-1', 'Clear table', '', 5, 'child-1', 1, @now, @now)
      `
    ).run({ now });

    completeChore(fixtureDb, "chore-1", "2026-04-23", 4);

    let dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);
    expect(dashboard.children[0]?.totalPoints).toBe(5);
    expect(dashboard.children[0]?.chores[0]?.isCompletedToday).toBe(true);

    uncompleteChore(fixtureDb, "chore-1", "2026-04-23");

    dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);
    expect(dashboard.children[0]?.totalPoints).toBe(0);
    expect(dashboard.children[0]?.chores[0]?.isCompletedToday).toBe(false);

    const ledgerEntries = fixtureDb
      .prepare(
        `
          SELECT event_type, point_delta
          FROM ledger_entries
          WHERE child_id = 'child-1'
          ORDER BY timestamp ASC
        `
      )
      .all() as Array<{ event_type: string; point_delta: number }>;

    expect(ledgerEntries).toEqual([
      { event_type: "chore_complete", point_delta: 5 },
      { event_type: "chore_uncomplete", point_delta: -5 }
    ]);
  });
});
