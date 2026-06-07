import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "../db/connection.js";
import { createTestDatabase } from "../db/test-helpers.js";
import {
  createManualAdjustment,
  HistoryValidationError,
  listRecentHistory,
  parseAdjustmentInput
} from "./history.js";

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

describe("listRecentHistory", () => {
  it("returns recent ledger entries newest first with snapshots", () => {
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
          ('ledger-1', 'chore_complete', 'child-1', 'Sample Child 1', 'chore', 'chore-1', 'Clear table', 5, '2026-04-23T09:00:00.000Z'),
          ('ledger-2', 'reward_redeem', 'child-2', 'Sample Child 2', 'reward', 'reward-1', 'Movie Night', -12, '2026-04-23T10:00:00.000Z'),
          ('ledger-3', 'chore_uncomplete', 'child-1', 'Sample Child 1', 'chore', 'chore-1', 'Clear table', -5, '2026-04-23T11:00:00.000Z')
      `
    ).run();

    const history = listRecentHistory(fixtureDb, 2);

    expect(history).toEqual([
      {
        id: "ledger-3",
        eventType: "chore_uncomplete",
        childId: "child-1",
        childName: "Sample Child 1",
        sourceType: "chore",
        sourceId: "chore-1",
        sourceName: "Clear table",
        pointDelta: -5,
        timestamp: "2026-04-23T11:00:00.000Z"
      },
      {
        id: "ledger-2",
        eventType: "reward_redeem",
        childId: "child-2",
        childName: "Sample Child 2",
        sourceType: "reward",
        sourceId: "reward-1",
        sourceName: "Movie Night",
        pointDelta: -12,
        timestamp: "2026-04-23T10:00:00.000Z"
      }
    ]);
  });
});

describe("manual adjustments", () => {
  it("creates auditable additive and subtractive ledger entries", () => {
    const fixtureDb = createBaseFixture();

    expect(
      createManualAdjustment(fixtureDb, {
        childId: "child-1",
        operation: "add",
        amount: 12,
        reason: "Amazing report card"
      })
    ).toMatchObject({ previousTotal: 0, newTotal: 12 });

    expect(
      createManualAdjustment(fixtureDb, {
        childId: "child-1",
        operation: "subtract",
        amount: 5,
        reason: "Correcting a mistake"
      })
    ).toMatchObject({ previousTotal: 12, newTotal: 7 });

    const entries = listRecentHistory(fixtureDb);
    expect(entries.map(({ eventType, sourceName, pointDelta }) => ({
      eventType,
      sourceName,
      pointDelta
    }))).toEqual(expect.arrayContaining([
      {
        eventType: "manual_adjustment",
        sourceName: "Correcting a mistake",
        pointDelta: -5
      },
      {
        eventType: "manual_adjustment",
        sourceName: "Amazing report card",
        pointDelta: 12
      }
    ]));
  });

  it("requires a child, positive whole-number amount, operation, and reason", () => {
    expect(() =>
      parseAdjustmentInput({
        childId: "",
        operation: "add",
        amount: 0,
        reason: ""
      })
    ).toThrow(HistoryValidationError);
  });
});
