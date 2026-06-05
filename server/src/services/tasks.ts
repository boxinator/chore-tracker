import crypto from "node:crypto";
import { z } from "zod";
import type { DatabaseConnection } from "../db/connection.js";

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional().default(""),
  childId: z.string().trim().min(1)
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export class TaskValidationError extends Error {}

export function parseCreateTaskInput(input: unknown): CreateTaskInput {
  const result = createTaskSchema.safeParse(input);

  if (!result.success) {
    throw new TaskValidationError(result.error.issues[0]?.message ?? "Invalid task input");
  }

  return {
    ...result.data,
    description: result.data.description?.trim() ?? ""
  };
}

export function createTask(db: DatabaseConnection, input: CreateTaskInput) {
  const child = db
    .prepare("SELECT id FROM children WHERE id = ? LIMIT 1")
    .get(input.childId);

  if (!child) {
    throw new TaskValidationError("Selected child does not exist");
  }

  const now = new Date().toISOString();
  const taskId = `task-${crypto.randomUUID()}`;

  db.prepare(
    `
      INSERT INTO tasks (
        id,
        title,
        description,
        assignee_child_id,
        status,
        completion_date_local,
        completed_at,
        uncompleted_at,
        completion_ledger_entry_id,
        uncompletion_ledger_entry_id,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'open', NULL, NULL, NULL, NULL, NULL, 1, ?, ?)
    `
  ).run(taskId, input.title, input.description, input.childId, now, now);

  return { id: taskId };
}

export function deleteTask(db: DatabaseConnection, taskId: string) {
  const existing = db
    .prepare("SELECT id FROM tasks WHERE id = ? AND is_active = 1 LIMIT 1")
    .get(taskId);

  if (!existing) {
    throw new TaskValidationError("Task not found");
  }

  db.prepare(
    `
      UPDATE tasks
      SET is_active = 0,
          updated_at = ?
      WHERE id = ?
    `
  ).run(new Date().toISOString(), taskId);
}

export function completeTask(
  db: DatabaseConnection,
  taskId: string,
  currentDateLocal: string
) {
  const task = db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.assignee_child_id,
          c.name as child_name
        FROM tasks t
        INNER JOIN children c ON c.id = t.assignee_child_id
        WHERE t.id = ? AND t.is_active = 1
        LIMIT 1
      `
    )
    .get(taskId) as
    | {
        id: string;
        title: string;
        status: string;
        assignee_child_id: string;
        child_name: string;
      }
    | undefined;

  if (!task) {
    throw new TaskValidationError("Task not found");
  }

  if (task.status === "completed") {
    throw new TaskValidationError("This task is already completed");
  }

  const now = new Date().toISOString();
  const ledgerEntryId = `ledger-${crypto.randomUUID()}`;

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
        ) VALUES (?, 'task_complete', ?, ?, 'task', ?, ?, 0, ?, NULL, NULL)
      `
    ).run(
      ledgerEntryId,
      task.assignee_child_id,
      task.child_name,
      task.id,
      task.title,
      now
    );

    db.prepare(
      `
        UPDATE tasks
        SET status = 'completed',
            completion_date_local = ?,
            completed_at = ?,
            uncompleted_at = NULL,
            completion_ledger_entry_id = ?,
            uncompletion_ledger_entry_id = NULL,
            updated_at = ?
        WHERE id = ?
      `
    ).run(currentDateLocal, now, ledgerEntryId, now, task.id);
  });

  transaction();
}

export function uncompleteTask(db: DatabaseConnection, taskId: string) {
  const task = db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.assignee_child_id,
          t.completion_ledger_entry_id,
          le.child_name_snapshot
        FROM tasks t
        INNER JOIN ledger_entries le ON le.id = t.completion_ledger_entry_id
        WHERE t.id = ? AND t.is_active = 1
        LIMIT 1
      `
    )
    .get(taskId) as
    | {
        id: string;
        title: string;
        status: string;
        assignee_child_id: string;
        completion_ledger_entry_id: string;
        child_name_snapshot: string;
      }
    | undefined;

  if (!task || task.status !== "completed") {
    throw new TaskValidationError("This task is not completed");
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
        ) VALUES (?, 'task_uncomplete', ?, ?, 'task', ?, ?, 0, ?, ?, NULL)
      `
    ).run(
      reversalLedgerId,
      task.assignee_child_id,
      task.child_name_snapshot,
      task.id,
      task.title,
      now,
      task.completion_ledger_entry_id
    );

    db.prepare(
      `
        UPDATE tasks
        SET status = 'open',
            completion_date_local = NULL,
            completed_at = NULL,
            uncompleted_at = ?,
            completion_ledger_entry_id = NULL,
            uncompletion_ledger_entry_id = ?,
            updated_at = ?
        WHERE id = ?
      `
    ).run(now, reversalLedgerId, now, task.id);
  });

  transaction();
}
