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

const assignChoreSchema = z.object({
  childId: z.string().trim().min(1)
});

export type CreateChoreInput = z.infer<typeof createChoreSchema>;
export type AssignChoreInput = z.infer<typeof assignChoreSchema>;

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

export function parseAssignChoreInput(input: unknown): AssignChoreInput {
  const result = assignChoreSchema.safeParse(input);

  if (!result.success) {
    throw new ChoreValidationError(result.error.issues[0]?.message ?? "Invalid assignment input");
  }

  return result.data;
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

export function assignChore(db: DatabaseConnection, choreId: string, childId: string) {
  const child = db.prepare("SELECT id FROM children WHERE id = ? LIMIT 1").get(childId);

  if (!child) {
    throw new ChoreValidationError("Selected child does not exist");
  }

  const chore = db
    .prepare(
      `
        SELECT id
        FROM chores
        WHERE id = ? AND is_active = 1
        LIMIT 1
      `
    )
    .get(choreId);

  if (!chore) {
    throw new ChoreValidationError("Chore not found");
  }

  db.prepare(
    `
      UPDATE chores
      SET assignee_child_id = ?, updated_at = ?
      WHERE id = ?
    `
  ).run(childId, new Date().toISOString(), choreId);
}

export function completeChore(
  db: DatabaseConnection,
  choreId: string,
  currentDateLocal: string,
  dayOfWeek: number
) {
  const chore = db
    .prepare(
      `
        SELECT
          ch.id,
          ch.title,
          ch.point_value,
          ch.assignee_child_id,
          c.name as child_name
        FROM chores ch
        LEFT JOIN children c ON c.id = ch.assignee_child_id
        WHERE ch.id = ? AND ch.is_active = 1
        LIMIT 1
      `
    )
    .get(choreId) as
    | {
        id: string;
        title: string;
        point_value: number;
        assignee_child_id: string | null;
        child_name: string | null;
      }
    | undefined;

  if (!chore) {
    throw new ChoreValidationError("Chore not found");
  }

  if (!chore.assignee_child_id || !chore.child_name) {
    throw new ChoreValidationError("Assign this chore before completing it");
  }

  const scheduleDays = db
    .prepare(
      `
        SELECT day_of_week
        FROM chore_schedule_days
        WHERE chore_id = ?
      `
    )
    .all(choreId) as Array<{ day_of_week: number }>;

  if (scheduleDays.length > 0 && !scheduleDays.some((row) => row.day_of_week === dayOfWeek)) {
    throw new ChoreValidationError("This chore is not active today");
  }

  const existingCompletion = db
    .prepare(
      `
        SELECT id
        FROM chore_completions
        WHERE chore_id = ?
          AND completion_date_local = ?
          AND status = 'completed'
        LIMIT 1
      `
    )
    .get(choreId, currentDateLocal);

  if (existingCompletion) {
    throw new ChoreValidationError("This chore is already completed today");
  }

  const now = new Date().toISOString();
  const ledgerEntryId = `ledger-${crypto.randomUUID()}`;
  const completionId = `completion-${crypto.randomUUID()}`;

  const transaction = db.transaction(() => {
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
        ) VALUES (?, 'chore_complete', ?, ?, 'chore', ?, ?, ?, ?, NULL, NULL)
      `
    ).run(
      ledgerEntryId,
      chore.assignee_child_id,
      chore.child_name,
      chore.id,
      chore.title,
      chore.point_value,
      now
    );

    db.prepare(
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
        ) VALUES (?, ?, ?, ?, ?, NULL, 'completed', ?, NULL)
      `
    ).run(
      completionId,
      chore.id,
      chore.assignee_child_id,
      currentDateLocal,
      now,
      ledgerEntryId
    );
  });

  transaction();
}

export function uncompleteChore(db: DatabaseConnection, choreId: string, currentDateLocal: string) {
  const completion = db
    .prepare(
      `
        SELECT
          cc.id,
          cc.child_id,
          cc.ledger_entry_id,
          le.point_delta,
          le.child_name_snapshot,
          le.source_name_snapshot
        FROM chore_completions cc
        INNER JOIN ledger_entries le ON le.id = cc.ledger_entry_id
        WHERE cc.chore_id = ?
          AND cc.completion_date_local = ?
          AND cc.status = 'completed'
        LIMIT 1
      `
    )
    .get(choreId, currentDateLocal) as
    | {
        id: string;
        child_id: string;
        ledger_entry_id: string;
        point_delta: number;
        child_name_snapshot: string;
        source_name_snapshot: string;
      }
    | undefined;

  if (!completion) {
    throw new ChoreValidationError("This chore is not completed today");
  }

  const now = new Date().toISOString();
  const reversalLedgerId = `ledger-${crypto.randomUUID()}`;

  const transaction = db.transaction(() => {
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
        ) VALUES (?, 'chore_uncomplete', ?, ?, 'chore', ?, ?, ?, ?, ?, NULL)
      `
    ).run(
      reversalLedgerId,
      completion.child_id,
      completion.child_name_snapshot,
      choreId,
      completion.source_name_snapshot,
      completion.point_delta * -1,
      now,
      completion.ledger_entry_id
    );

    db.prepare(
      `
        UPDATE chore_completions
        SET status = 'reversed',
            reversed_at = ?,
            reversal_ledger_entry_id = ?
        WHERE id = ?
      `
    ).run(now, reversalLedgerId, completion.id);
  });

  transaction();
}
