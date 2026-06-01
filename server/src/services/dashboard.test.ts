import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "../db/connection.js";
import { createTestDatabase } from "../db/test-helpers.js";
import { getChildPointTotals, getDashboardData, getVisibleChoresForDate } from "./dashboard.js";

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

describe("getChildPointTotals", () => {
  it("derives totals from ledger entries and defaults to zero", () => {
    const fixtureDb = createBaseFixture();

    fixtureDb.prepare(
      `
        INSERT INTO ledger_entries (
          id,
          event_type,
          child_id,
          child_name_snapshot,
          source_type,
          source_id,
          source_name_snapshot,
          point_delta,
          timestamp
        ) VALUES
          ('ledger-1', 'chore_complete', 'child-1', 'Sample Child 1', 'chore', 'c1', 'Feed cat', 5, @now),
          ('ledger-2', 'reward_redeem', 'child-1', 'Sample Child 1', 'reward', 'r1', 'Movie Night', -2, @now)
      `
    ).run({ now: "2026-04-23T09:00:00.000Z" });

    const totals = getChildPointTotals(fixtureDb);

    expect(totals).toEqual([
      { childId: "child-1", name: "Sample Child 1", avatarKey: null, totalPoints: 3 },
      { childId: "child-2", name: "Sample Child 2", avatarKey: null, totalPoints: 0 }
    ]);
  });
});

describe("getVisibleChoresForDate", () => {
  it("shows unscheduled chores every day and scheduled chores only on active weekdays", () => {
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
          ('always', 'Always On', 'Visible daily', 3, NULL, 1, @now, @now),
          ('thu-only', 'Thursday Job', 'Visible on Thursdays', 4, NULL, 1, @now, @now),
          ('mon-only', 'Monday Job', 'Visible on Mondays', 5, NULL, 1, @now, @now)
      `
    ).run({ now });

    fixtureDb.prepare(
      `
        INSERT INTO chore_assignments (id, chore_id, child_id, day_of_week)
        VALUES
          ('always-child-1-0', 'always', 'child-1', 0),
          ('always-child-1-1', 'always', 'child-1', 1),
          ('always-child-1-2', 'always', 'child-1', 2),
          ('always-child-1-3', 'always', 'child-1', 3),
          ('always-child-1-4', 'always', 'child-1', 4),
          ('always-child-1-5', 'always', 'child-1', 5),
          ('always-child-1-6', 'always', 'child-1', 6)
      `
    ).run();

    fixtureDb.prepare(
      `
        INSERT INTO chore_schedule_days (id, chore_id, day_of_week)
        VALUES
          ('thu-only-4', 'thu-only', 4),
          ('mon-only-1', 'mon-only', 1)
      `
    ).run();

    const visibleThursday = getVisibleChoresForDate(fixtureDb, "2026-04-23", 4);

    expect(visibleThursday.map((chore: { id: string }) => chore.id)).toEqual([
      "always",
      "thu-only"
    ]);
  });

  it("marks chores completed for the current local date", () => {
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
          ('dishwasher', 'Empty dishwasher', 'Kitchen reset', 6, NULL, 1, @now, @now)
      `
    ).run({ now });

    fixtureDb.prepare(
      `
        INSERT INTO chore_assignments (id, chore_id, child_id, day_of_week)
        VALUES ('dishwasher-child-2-4', 'dishwasher', 'child-2', 4)
      `
    ).run();

    fixtureDb.prepare(
      `
        INSERT INTO chore_completions (
          id,
          chore_id,
          child_id,
          completion_date_local,
          completed_at,
          reversed_at,
          status,
          ledger_entry_id,
          reversal_ledger_entry_id
        ) VALUES
          ('completion-1', 'dishwasher', 'child-2', '2026-04-23', @now, NULL, 'completed', NULL, NULL)
      `
    ).run({ now });

    const visible = getVisibleChoresForDate(fixtureDb, "2026-04-23", 4);

    expect(visible).toEqual([
      {
        id: "dishwasher",
        title: "Empty dishwasher",
        description: "Kitchen reset",
        pointValue: 6,
        assigneeChildId: "child-2",
        isCompletedToday: true,
        scheduledDays: [4],
        assignments: [{ childId: "child-2", days: [4] }],
        unassignedScheduleDays: []
      }
    ]);
  });
});

describe("getDashboardData", () => {
  it("groups visible chores into unassigned and per-child dashboard lanes", () => {
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
          ('assigned-1', 'Feed cat', 'Kitchen', 4, NULL, 1, @now, @now),
          ('assigned-2', 'Laundry', 'Bedroom', 7, NULL, 1, @now, @now),
          ('unassigned-1', 'Recycling', 'Outside', 8, NULL, 1, @now, @now)
      `
    ).run({ now });

    fixtureDb.prepare(
      `
        INSERT INTO chore_assignments (id, chore_id, child_id, day_of_week)
        VALUES
          ('assigned-1-child-1-4', 'assigned-1', 'child-1', 4),
          ('assigned-2-child-2-4', 'assigned-2', 'child-2', 4)
      `
    ).run();

    fixtureDb.prepare(
      `
        INSERT INTO chore_schedule_days (id, chore_id, day_of_week)
        VALUES ('unassigned-1-4', 'unassigned-1', 4)
      `
    ).run();

    fixtureDb.prepare(
      `
        INSERT INTO ledger_entries (
          id,
          event_type,
          child_id,
          child_name_snapshot,
          source_type,
          source_id,
          source_name_snapshot,
          point_delta,
          timestamp
        ) VALUES
          ('ledger-1', 'bonus_seed', 'child-1', 'Sample Child 1', 'system', 'seed', 'Seed Bonus', 10, @now)
      `
    ).run({ now });

    const dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);

    expect(dashboard.currentDateLocal).toBe("2026-04-23");
    expect(dashboard.dayOfWeek).toBe(4);
    expect(dashboard.unassignedChores.map((chore) => chore.id)).toEqual(["unassigned-1"]);
    expect(dashboard.children).toEqual([
      {
        id: "child-1",
        name: "Sample Child 1",
        avatarKey: null,
        totalPoints: 10,
        chores: [
          {
            id: "assigned-1",
            title: "Feed cat",
            description: "Kitchen",
            pointValue: 4,
            assigneeChildId: "child-1",
            isCompletedToday: false,
            scheduledDays: [4],
            assignments: [{ childId: "child-1", days: [4] }],
            unassignedScheduleDays: []
          }
        ]
      },
      {
        id: "child-2",
        name: "Sample Child 2",
        avatarKey: null,
        totalPoints: 0,
        chores: [
          {
            id: "assigned-2",
            title: "Laundry",
            description: "Bedroom",
            pointValue: 7,
            assigneeChildId: "child-2",
            isCompletedToday: false,
            scheduledDays: [4],
            assignments: [{ childId: "child-2", days: [4] }],
            unassignedScheduleDays: []
          }
        ]
      }
    ]);
  });

  it("shows the same chore under multiple children on the same weekday", () => {
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
          ('workbooks', 'Workbook pages', 'Math and reading', 5, NULL, 1, @now, @now)
      `
    ).run({ now });

    fixtureDb.prepare(
      `
        INSERT INTO chore_assignments (id, chore_id, child_id, day_of_week)
        VALUES
          ('workbooks-child-1-4', 'workbooks', 'child-1', 4),
          ('workbooks-child-2-4', 'workbooks', 'child-2', 4)
      `
    ).run();

    const dashboard = getDashboardData(fixtureDb, "2026-04-23", 4);

    expect(dashboard.children[0]?.chores.map((chore) => chore.id)).toEqual(["workbooks"]);
    expect(dashboard.children[1]?.chores.map((chore) => chore.id)).toEqual(["workbooks"]);
  });
});
