import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "../db/connection.js";
import { createTestDatabase } from "../db/test-helpers.js";
import { getWeekCalendarData } from "./calendar.js";

let db: DatabaseConnection | null = null;

afterEach(() => {
  db?.close();
  db = null;
});

describe("getWeekCalendarData", () => {
  it("returns seven date buckets, historical completion state, and ongoing tasks", () => {
    db = createTestDatabase();
    const now = "2026-06-07T08:00:00.000Z";

    db.prepare(
      "INSERT INTO children (id, name, sort_order, created_at, updated_at) VALUES ('child-1', 'Sample Child 1', 1, @now, @now)"
    ).run({ now });
    db.prepare(
      `
        INSERT INTO chores (
          id, title, description, point_value, assignee_child_id, is_active, created_at, updated_at
        ) VALUES
          ('monday-chore', 'Monday chore', '', 5, NULL, 1, @now, @now),
          ('unassigned-sunday', 'Sunday choice', '', 3, NULL, 1, @now, @now)
      `
    ).run({ now });
    db.prepare(
      "INSERT INTO chore_assignments (id, chore_id, child_id, day_of_week) VALUES ('monday-assignment', 'monday-chore', 'child-1', 1)"
    ).run();
    db.prepare(
      "INSERT INTO chore_schedule_days (id, chore_id, day_of_week) VALUES ('sunday-schedule', 'unassigned-sunday', 0)"
    ).run();
    db.prepare(
      `
        INSERT INTO chore_completions (
          id, chore_id, child_id, completion_date_local, completed_at, status
        ) VALUES ('completion-1', 'monday-chore', 'child-1', '2026-06-08', @now, 'completed')
      `
    ).run({ now });
    db.prepare(
      `
        INSERT INTO tasks (
          id, title, description, assignee_child_id, status, is_active, created_at, updated_at
        ) VALUES ('task-1', 'Pack bag', '', 'child-1', 'open', 1, @now, @now)
      `
    ).run({ now });

    const week = getWeekCalendarData(db, "2026-06-07");

    expect(week.weekStartLocal).toBe("2026-06-07");
    expect(week.weekEndLocal).toBe("2026-06-13");
    expect(week.days).toHaveLength(7);
    expect(week.days[0]?.chores[0]).toMatchObject({
      id: "unassigned-sunday",
      assigneeChildId: null
    });
    expect(week.days[1]?.chores[0]).toMatchObject({
      id: "monday-chore",
      assigneeChildId: "child-1",
      isCompletedToday: true
    });
    expect(week.ongoingTasks).toEqual([
      {
        id: "task-1",
        title: "Pack bag",
        description: "",
        assigneeChildId: "child-1"
      }
    ]);
  });
});
