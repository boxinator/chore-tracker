import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "../db/connection.js";
import { createTestDatabase } from "../db/test-helpers.js";
import { getDashboardData } from "./dashboard.js";
import {
  TaskValidationError,
  completeTask,
  createTask,
  deleteTask,
  parseCreateTaskInput,
  uncompleteTask
} from "./tasks.js";

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

describe("parseCreateTaskInput", () => {
  it("normalizes and validates a task payload", () => {
    const parsed = parseCreateTaskInput({
      title: "  Put bike away  ",
      description: "  Garage  ",
      childId: "child-1"
    });

    expect(parsed).toEqual({
      title: "Put bike away",
      description: "Garage",
      childId: "child-1"
    });
  });

  it("rejects invalid task payloads", () => {
    expect(() => parseCreateTaskInput({ title: "", childId: "" })).toThrow(TaskValidationError);
  });
});

describe("createTask", () => {
  it("creates an open task that appears in the assignee dashboard lane", () => {
    const fixtureDb = createBaseFixture();

    const input = parseCreateTaskInput({
      title: "Pack camp shirt",
      description: "For field trip",
      childId: "child-2"
    });

    createTask(fixtureDb, input);

    const dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);

    expect(dashboard.children[1]?.tasks).toHaveLength(1);
    expect(dashboard.children[1]?.tasks[0]).toMatchObject({
      title: "Pack camp shirt",
      description: "For field trip",
      assigneeChildId: "child-2",
      isCompletedToday: false
    });
  });

  it("rejects a missing assignee", () => {
    const fixtureDb = createBaseFixture();

    expect(() =>
      createTask(
        fixtureDb,
        parseCreateTaskInput({
          title: "Put toys away",
          childId: "missing-child"
        })
      )
    ).toThrow(TaskValidationError);
  });
});

describe("completeTask and uncompleteTask", () => {
  it("writes zero-point ledger entries and leaves point totals unchanged", () => {
    const fixtureDb = createBaseFixture();
    const { id } = createTask(
      fixtureDb,
      parseCreateTaskInput({
        title: "Put bike away",
        description: "",
        childId: "child-1"
      })
    );

    completeTask(fixtureDb, id, "2026-04-23");

    let dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);
    expect(dashboard.children[0]?.totalPoints).toBe(0);
    expect(dashboard.children[0]?.tasks[0]?.isCompletedToday).toBe(true);

    const nextDayDashboard = getDashboardData(fixtureDb, "2026-04-24", 5);
    expect(nextDayDashboard.children[0]?.tasks).toEqual([]);

    const historicalDashboard = getDashboardData(fixtureDb, "2026-04-23", 4, false);
    expect(historicalDashboard.children[0]?.tasks[0]).toMatchObject({
      id,
      isCompletedToday: true
    });

    uncompleteTask(fixtureDb, id);

    dashboard = getDashboardData(fixtureDb, "2026-04-24", 5);
    expect(dashboard.children[0]?.totalPoints).toBe(0);
    expect(dashboard.children[0]?.tasks[0]).toMatchObject({
      id,
      isCompletedToday: false
    });

    const futureDashboard = getDashboardData(fixtureDb, "2026-04-25", 6, false);
    expect(futureDashboard.children[0]?.tasks).toEqual([]);

    const ledgerEntries = fixtureDb
      .prepare(
        `
          SELECT event_type, source_type, point_delta
          FROM ledger_entries
          WHERE child_id = 'child-1'
          ORDER BY timestamp ASC
        `
      )
      .all() as Array<{ event_type: string; source_type: string; point_delta: number }>;

    expect(ledgerEntries).toEqual([
      { event_type: "task_complete", source_type: "task", point_delta: 0 },
      { event_type: "task_uncomplete", source_type: "task", point_delta: 0 }
    ]);
  });
});

describe("deleteTask", () => {
  it("soft deletes a task so it no longer appears", () => {
    const fixtureDb = createBaseFixture();
    const { id } = createTask(
      fixtureDb,
      parseCreateTaskInput({
        title: "Put toys away",
        childId: "child-1"
      })
    );

    deleteTask(fixtureDb, id);

    const dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);
    expect(dashboard.children[0]?.tasks).toEqual([]);
  });
});
