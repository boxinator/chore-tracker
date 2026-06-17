import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "../db/connection.js";
import { createTestDatabase } from "../db/test-helpers.js";
import {
  awardProgressGoal,
  createProgressGoal,
  getActiveProgressGoalWithProgress,
  ProgressGoalValidationError,
  updateProgressGoal
} from "./progressGoals.js";

let db: DatabaseConnection | null = null;

afterEach(() => {
  db?.close();
  db = null;
});

function createBaseFixture() {
  db = createTestDatabase();
  const now = "2026-06-12T08:00:00.000Z";

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

function insertLedger(
  fixtureDb: DatabaseConnection,
  id: string,
  eventType: string,
  childId: string,
  pointDelta: number,
  timestamp: string
) {
  const childName = childId === "child-1" ? "Sample Child 1" : "Sample Child 2";

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
        timestamp,
        reversal_of_id,
        metadata_json
      ) VALUES (?, ?, ?, ?, 'test', ?, ?, ?, ?, NULL, NULL)
    `
  ).run(id, eventType, childId, childName, id, eventType, pointDelta, timestamp);
}

describe("progress goals", () => {
  it("derives progress from net ledger deltas since the start date and excludes rewards", () => {
    const fixtureDb = createBaseFixture();

    createProgressGoal(fixtureDb, {
      name: "Rollerblades",
      targetPoints: 100,
      startDateLocal: "2026-06-12"
    });

    insertLedger(fixtureDb, "before-start", "chore_complete", "child-1", 40, "2026-06-11T22:00:00.000Z");
    insertLedger(fixtureDb, "complete-1", "chore_complete", "child-1", 20, "2026-06-12T09:00:00.000Z");
    insertLedger(fixtureDb, "uncomplete-1", "chore_uncomplete", "child-1", -20, "2026-06-12T09:05:00.000Z");
    insertLedger(fixtureDb, "complete-2", "chore_complete", "child-2", 35, "2026-06-13T10:00:00.000Z");
    insertLedger(fixtureDb, "manual-add", "manual_adjustment", "child-2", 10, "2026-06-13T11:00:00.000Z");
    insertLedger(fixtureDb, "manual-subtract", "manual_adjustment", "child-2", -5, "2026-06-13T11:30:00.000Z");
    insertLedger(fixtureDb, "reward", "reward_redeem", "child-2", -15, "2026-06-13T12:00:00.000Z");

    expect(getActiveProgressGoalWithProgress(fixtureDb)).toMatchObject({
      name: "Rollerblades",
      targetPoints: 100,
      startDateLocal: "2026-06-12",
      earnedPoints: 40,
      percentComplete: 40
    });
  });

  it("caps visual progress at 100 percent while preserving earned total", () => {
    const fixtureDb = createBaseFixture();

    createProgressGoal(fixtureDb, {
      name: "Big Trip",
      targetPoints: 50,
      startDateLocal: "2026-06-12"
    });
    insertLedger(fixtureDb, "complete-1", "chore_complete", "child-1", 65, "2026-06-12T09:00:00.000Z");

    expect(getActiveProgressGoalWithProgress(fixtureDb)).toMatchObject({
      earnedPoints: 65,
      percentComplete: 100
    });
  });

  it("blocks a second active goal until the current goal is awarded", () => {
    const fixtureDb = createBaseFixture();

    createProgressGoal(fixtureDb, {
      name: "Rollerblades",
      targetPoints: 100,
      startDateLocal: "2026-06-12"
    });

    expect(() =>
      createProgressGoal(fixtureDb, {
        name: "Camping",
        targetPoints: 200,
        startDateLocal: "2026-06-13"
      })
    ).toThrow(ProgressGoalValidationError);
  });

  it("updates and awards the active goal", () => {
    const fixtureDb = createBaseFixture();
    const { id } = createProgressGoal(fixtureDb, {
      name: "Rollerblades",
      targetPoints: 100,
      startDateLocal: "2026-06-12"
    });

    updateProgressGoal(fixtureDb, id, {
      name: "Skates",
      targetPoints: 80,
      startDateLocal: "2026-06-13"
    });

    expect(getActiveProgressGoalWithProgress(fixtureDb)).toMatchObject({
      id,
      name: "Skates",
      targetPoints: 80,
      startDateLocal: "2026-06-13"
    });

    awardProgressGoal(fixtureDb, id);

    expect(getActiveProgressGoalWithProgress(fixtureDb)).toBeNull();
  });
});
