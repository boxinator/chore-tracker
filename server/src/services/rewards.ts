import crypto from "node:crypto";
import { z } from "zod";
import type { DatabaseConnection } from "../db/connection.js";

const redeemRewardSchema = z.object({
  childId: z.string().trim().min(1)
});

const rewardInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(1000).optional().default(""),
  cost: z.coerce.number().int().min(1).max(1000)
});

export type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number;
  isActive: boolean;
};

export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;
export type RewardInput = z.infer<typeof rewardInputSchema>;

export class RewardValidationError extends Error {}

export function parseRedeemRewardInput(input: unknown): RedeemRewardInput {
  const result = redeemRewardSchema.safeParse(input);

  if (!result.success) {
    throw new RewardValidationError(result.error.issues[0]?.message ?? "Invalid reward input");
  }

  return result.data;
}

export function parseRewardInput(input: unknown): RewardInput {
  const result = rewardInputSchema.safeParse(input);

  if (!result.success) {
    throw new RewardValidationError(result.error.issues[0]?.message ?? "Invalid reward input");
  }

  return {
    ...result.data,
    description: result.data.description?.trim() ?? ""
  };
}

export function listActiveRewards(db: DatabaseConnection): Reward[] {
  return db
    .prepare(
      `
        SELECT
          id,
          name,
          description,
          cost,
          is_active as isActive
        FROM rewards
        WHERE is_active = 1
        ORDER BY cost ASC, name ASC
      `
    )
    .all() as Reward[];
}

export function listAllRewards(db: DatabaseConnection): Reward[] {
  return db
    .prepare(
      `
        SELECT
          id,
          name,
          description,
          cost,
          is_active as isActive
        FROM rewards
        ORDER BY is_active DESC, cost ASC, name ASC
      `
    )
    .all() as Reward[];
}

export function createReward(db: DatabaseConnection, input: RewardInput) {
  const rewardId = `reward-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO rewards (id, name, description, cost, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `
  ).run(rewardId, input.name, input.description, input.cost, now, now);

  return { id: rewardId };
}

export function updateReward(db: DatabaseConnection, rewardId: string, input: RewardInput) {
  const existing = db
    .prepare("SELECT id FROM rewards WHERE id = ? LIMIT 1")
    .get(rewardId) as { id: string } | undefined;

  if (!existing) {
    throw new RewardValidationError("Reward not found");
  }

  db.prepare(
    `
      UPDATE rewards
      SET name = ?, description = ?, cost = ?, updated_at = ?
      WHERE id = ?
    `
  ).run(input.name, input.description, input.cost, new Date().toISOString(), rewardId);
}

export function deactivateReward(db: DatabaseConnection, rewardId: string) {
  const existing = db
    .prepare("SELECT id FROM rewards WHERE id = ? AND is_active = 1 LIMIT 1")
    .get(rewardId) as { id: string } | undefined;

  if (!existing) {
    throw new RewardValidationError("Reward not found");
  }

  db.prepare(
    `
      UPDATE rewards
      SET is_active = 0, updated_at = ?
      WHERE id = ?
    `
  ).run(new Date().toISOString(), rewardId);
}

export function redeemReward(db: DatabaseConnection, rewardId: string, childId: string) {
  const reward = db
    .prepare(
      `
        SELECT id, name, cost
        FROM rewards
        WHERE id = ? AND is_active = 1
        LIMIT 1
      `
    )
    .get(rewardId) as { id: string; name: string; cost: number } | undefined;

  if (!reward) {
    throw new RewardValidationError("Reward not found");
  }

  const child = db
    .prepare(
      `
        SELECT id, name
        FROM children
        WHERE id = ?
        LIMIT 1
      `
    )
    .get(childId) as { id: string; name: string } | undefined;

  if (!child) {
    throw new RewardValidationError("Child not found");
  }

  const pointsRow = db
    .prepare(
      `
        SELECT COALESCE(SUM(point_delta), 0) as total
        FROM ledger_entries
        WHERE child_id = ?
      `
    )
    .get(childId) as { total: number };

  if (pointsRow.total < reward.cost) {
    throw new RewardValidationError("Not enough points for this reward");
  }

  const ledgerEntryId = `ledger-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(
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
      ) VALUES (?, 'reward_redeem', ?, ?, 'reward', ?, ?, ?, ?, NULL, NULL)
    `
  ).run(
    ledgerEntryId,
    child.id,
    child.name,
    reward.id,
    reward.name,
    reward.cost * -1,
    now
  );

  return {
    previousTotal: pointsRow.total,
    newTotal: pointsRow.total - reward.cost
  };
}
