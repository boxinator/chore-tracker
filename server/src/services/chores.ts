import crypto from "node:crypto";
import { z } from "zod";
import type { DatabaseConnection } from "../db/connection.js";

const createChoreSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional().default(""),
  pointValue: z.coerce.number().int().min(1).max(1000),
  assigneeChildId: z.string().trim().min(1).nullable().optional().default(null),
  scheduleDays: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .optional()
    .default([])
});

export type CreateChoreInput = z.infer<typeof createChoreSchema>;

export class ChoreValidationError extends Error {}

export function parseCreateChoreInput(input: unknown): CreateChoreInput {
  const result = createChoreSchema.safeParse(input);

  if (!result.success) {
    throw new ChoreValidationError(result.error.issues[0]?.message ?? "Invalid chore input");
  }

  return {
    ...result.data,
    description: result.data.description?.trim() ?? "",
    scheduleDays: [...new Set(result.data.scheduleDays)].sort((a, b) => a - b)
  };
}

export function createChore(db: DatabaseConnection, input: CreateChoreInput) {
  const now = new Date().toISOString();
  const choreId = `chore-${crypto.randomUUID()}`;

  const childExistsStatement = db.prepare("SELECT 1 FROM children WHERE id = ? LIMIT 1");
  if (input.assigneeChildId && !childExistsStatement.get(input.assigneeChildId)) {
    throw new ChoreValidationError("Selected child does not exist");
  }

  const insertChore = db.prepare(`
    INSERT INTO chores (
      id,
      title,
      description,
      point_value,
      assignee_child_id,
      is_active,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertScheduleDay = db.prepare(`
    INSERT INTO chore_schedule_days (id, chore_id, day_of_week)
    VALUES (?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertChore.run(
      choreId,
      input.title,
      input.description,
      input.pointValue,
      input.assigneeChildId,
      now,
      now
    );

    for (const dayOfWeek of input.scheduleDays) {
      insertScheduleDay.run(`schedule-${crypto.randomUUID()}`, choreId, dayOfWeek);
    }
  });

  transaction();

  return { id: choreId };
}

export function deleteChore(db: DatabaseConnection, choreId: string) {
  const existing = db
    .prepare("SELECT id FROM chores WHERE id = ? AND is_active = 1 LIMIT 1")
    .get(choreId);

  if (!existing) {
    throw new ChoreValidationError("Chore not found");
  }

  db.prepare(
    `
      UPDATE chores
      SET is_active = 0, updated_at = ?
      WHERE id = ?
    `
  ).run(new Date().toISOString(), choreId);
}

