import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "../db/connection.js";
import { createTestDatabase } from "../db/test-helpers.js";
import { listActiveRewards, redeemReward, RewardValidationError } from "./rewards.js";

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
      VALUES ('child-1', 'Sample Child 1', 1, @now, @now)
    `
  ).run({ now });

  db.prepare(
    `
      INSERT INTO rewards (id, name, description, cost, is_active, created_at, updated_at)
      VALUES
        ('reward-1', 'Movie Night', 'Pick the movie', 12, 1, @now, @now),
        ('reward-2', 'Extra Dessert', 'Pick dessert', 8, 1, @now, @now)
    `
  ).run({ now });

  return db;
}

describe("listActiveRewards", () => {
  it("returns active rewards sorted by cost then name", () => {
    const fixtureDb = createBaseFixture();

    expect(listActiveRewards(fixtureDb).map((reward) => reward.id)).toEqual([
      "reward-2",
      "reward-1"
    ]);
  });
});

describe("redeemReward", () => {
  it("creates a negative ledger entry and returns previous/new totals", () => {
    const fixtureDb = createBaseFixture();
    const now = "2026-04-23T09:00:00.000Z";

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
        ) VALUES ('ledger-1', 'bonus_seed', 'child-1', 'Sample Child 1', 'system', 'seed', 'Seed Bonus', 20, @now)
      `
    ).run({ now });

    const result = redeemReward(fixtureDb, "reward-1", "child-1");

    expect(result).toEqual({ previousTotal: 20, newTotal: 8 });

    const ledger = fixtureDb
      .prepare(
        `
          SELECT event_type, point_delta
          FROM ledger_entries
          WHERE child_id = 'child-1'
          ORDER BY timestamp ASC
        `
      )
      .all() as Array<{ event_type: string; point_delta: number }>;

    expect(ledger).toEqual([
      { event_type: "bonus_seed", point_delta: 20 },
      { event_type: "reward_redeem", point_delta: -12 }
    ]);
  });

  it("rejects redemption when the child cannot afford it", () => {
    const fixtureDb = createBaseFixture();

    expect(() => redeemReward(fixtureDb, "reward-1", "child-1")).toThrow(RewardValidationError);
  });
});

