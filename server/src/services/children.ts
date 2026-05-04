import crypto from "node:crypto";
import { z } from "zod";
import type { DatabaseConnection } from "../db/connection.js";

const childInputSchema = z.object({
  name: z.string().trim().min(1).max(60)
});

export type Child = {
  id: string;
  name: string;
  sortOrder: number;
};

export type ChildInput = z.infer<typeof childInputSchema>;

export class ChildValidationError extends Error {}

export function parseChildInput(input: unknown): ChildInput {
  const result = childInputSchema.safeParse(input);

  if (!result.success) {
    throw new ChildValidationError(result.error.issues[0]?.message ?? "Invalid child input");
  }

  return result.data;
}

export function listChildren(db: DatabaseConnection): Child[] {
  return db
    .prepare(
      `
        SELECT
          id,
          name,
          sort_order as sortOrder
        FROM children
        ORDER BY sort_order ASC, name ASC
      `
    )
    .all() as Child[];
}

export function createChild(db: DatabaseConnection, input: ChildInput) {
  const now = new Date().toISOString();
  const childId = `child-${crypto.randomUUID()}`;
  const nextSortOrderRow = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 as nextSortOrder FROM children")
    .get() as { nextSortOrder: number };

  db.prepare(
    `
      INSERT INTO children (id, name, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(childId, input.name, nextSortOrderRow.nextSortOrder, now, now);

  return { id: childId };
}

export function updateChild(db: DatabaseConnection, childId: string, input: ChildInput) {
  const existing = db.prepare("SELECT id FROM children WHERE id = ? LIMIT 1").get(childId);

  if (!existing) {
    throw new ChildValidationError("Child not found");
  }

  db.prepare(
    `
      UPDATE children
      SET name = ?, updated_at = ?
      WHERE id = ?
    `
  ).run(input.name, new Date().toISOString(), childId);
}
