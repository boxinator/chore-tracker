import crypto from "node:crypto";
import { z } from "zod";
import type { DatabaseConnection } from "../db/connection.js";

const progressGoalInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  targetPoints: z.coerce.number().int().min(1).max(100000),
  startDateLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must use YYYY-MM-DD")
});

export type ProgressGoalInput = z.infer<typeof progressGoalInputSchema>;

export type ProgressGoal = {
  id: string;
  name: string;
  targetPoints: number;
  startDateLocal: string;
  status: "active" | "awarded";
  awardedAt: string | null;
};

export type ActiveProgressGoal = ProgressGoal & {
  earnedPoints: number;
  percentComplete: number;
};

type ProgressGoalRow = {
  id: string;
  name: string;
  targetPoints: number;
  startDateLocal: string;
  status: "active" | "awarded";
  awardedAt: string | null;
};

export class ProgressGoalValidationError extends Error {}

export function parseProgressGoalInput(input: unknown): ProgressGoalInput {
  const result = progressGoalInputSchema.safeParse(input);

  if (!result.success) {
    throw new ProgressGoalValidationError(result.error.issues[0]?.message ?? "Invalid progress goal");
  }

  return result.data;
}

function toProgressGoal(row: ProgressGoalRow): ProgressGoal {
  return {
    id: row.id,
    name: row.name,
    targetPoints: row.targetPoints,
    startDateLocal: row.startDateLocal,
    status: row.status,
    awardedAt: row.awardedAt
  };
}

export function getActiveProgressGoal(db: DatabaseConnection): ProgressGoal | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          name,
          target_points as targetPoints,
          start_date_local as startDateLocal,
          status,
          awarded_at as awardedAt
        FROM progress_goals
        WHERE status = 'active'
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT 1
      `
    )
    .get() as ProgressGoalRow | undefined;

  return row ? toProgressGoal(row) : null;
}

export function getActiveProgressGoalWithProgress(db: DatabaseConnection): ActiveProgressGoal | null {
  const goal = getActiveProgressGoal(db);

  if (!goal) {
    return null;
  }

  const earnedPoints = (
    db
      .prepare(
        `
          SELECT COALESCE(SUM(point_delta), 0) as total
          FROM ledger_entries
          WHERE date(timestamp) >= ?
            AND event_type != 'reward_redeem'
        `
      )
      .get(goal.startDateLocal) as { total: number }
  ).total;

  return {
    ...goal,
    earnedPoints,
    percentComplete: Math.min(100, Math.max(0, Math.round((earnedPoints / goal.targetPoints) * 100)))
  };
}

export function createProgressGoal(db: DatabaseConnection, input: ProgressGoalInput) {
  const existing = getActiveProgressGoal(db);

  if (existing) {
    throw new ProgressGoalValidationError("Award or update the current progress goal first");
  }

  const id = `progress-goal-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO progress_goals (
        id,
        name,
        target_points,
        start_date_local,
        status,
        awarded_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'active', NULL, ?, ?)
    `
  ).run(id, input.name, input.targetPoints, input.startDateLocal, now, now);

  return { id };
}

export function updateProgressGoal(db: DatabaseConnection, goalId: string, input: ProgressGoalInput) {
  const existing = db
    .prepare("SELECT id FROM progress_goals WHERE id = ? AND status = 'active' LIMIT 1")
    .get(goalId) as { id: string } | undefined;

  if (!existing) {
    throw new ProgressGoalValidationError("Active progress goal not found");
  }

  db.prepare(
    `
      UPDATE progress_goals
      SET name = ?, target_points = ?, start_date_local = ?, updated_at = ?
      WHERE id = ?
    `
  ).run(input.name, input.targetPoints, input.startDateLocal, new Date().toISOString(), goalId);
}

export function awardProgressGoal(db: DatabaseConnection, goalId: string) {
  const existing = db
    .prepare("SELECT id FROM progress_goals WHERE id = ? AND status = 'active' LIMIT 1")
    .get(goalId) as { id: string } | undefined;

  if (!existing) {
    throw new ProgressGoalValidationError("Active progress goal not found");
  }

  const now = new Date().toISOString();

  db.prepare(
    `
      UPDATE progress_goals
      SET status = 'awarded', awarded_at = ?, updated_at = ?
      WHERE id = ?
    `
  ).run(now, now, goalId);
}
