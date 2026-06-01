import crypto from "node:crypto";
import { z } from "zod";
import type { DatabaseConnection } from "../db/connection.js";

const avatarKeySchema = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,80}$/);

const childInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  avatarKey: avatarKeySchema.nullable().optional()
});

const childUpdateInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    avatarKey: avatarKeySchema.nullable().optional()
  })
  .refine((input) => input.name !== undefined || input.avatarKey !== undefined, {
    message: "At least one child field is required"
  });

type ChildRow = {
  id: string;
  name: string;
  avatarKey: string | null;
  sortOrder: number;
};

function normalizeChild(row: ChildRow): Child {
  return {
    ...row,
    avatarKey:
      row.avatarKey && avatarKeySchema.safeParse(row.avatarKey).success ? row.avatarKey : null
  };
}

export type Child = {
  id: string;
  name: string;
  avatarKey: string | null;
  sortOrder: number;
};

export type ChildInput = z.infer<typeof childInputSchema>;
export type ChildUpdateInput = z.infer<typeof childUpdateInputSchema>;

export class ChildValidationError extends Error {}

export function parseChildInput(input: unknown): ChildInput {
  const result = childInputSchema.safeParse(input);

  if (!result.success) {
    throw new ChildValidationError(result.error.issues[0]?.message ?? "Invalid child input");
  }

  return result.data;
}

export function parseChildUpdateInput(input: unknown): ChildUpdateInput {
  const result = childUpdateInputSchema.safeParse(input);

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
          avatar_key as avatarKey,
          sort_order as sortOrder
        FROM children
        ORDER BY sort_order ASC, name ASC
      `
    )
    .all()
    .map((row) => normalizeChild(row as ChildRow));
}

export function createChild(db: DatabaseConnection, input: ChildInput) {
  const now = new Date().toISOString();
  const childId = `child-${crypto.randomUUID()}`;
  const nextSortOrderRow = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 as nextSortOrder FROM children")
    .get() as { nextSortOrder: number };

  db.prepare(
    `
      INSERT INTO children (id, name, avatar_key, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(childId, input.name, input.avatarKey ?? null, nextSortOrderRow.nextSortOrder, now, now);

  return { id: childId };
}

export function updateChild(db: DatabaseConnection, childId: string, input: ChildUpdateInput) {
  const existing = db.prepare("SELECT id FROM children WHERE id = ? LIMIT 1").get(childId);

  if (!existing) {
    throw new ChildValidationError("Child not found");
  }

  db.prepare(
    `
      UPDATE children
      SET
        name = COALESCE(?, name),
        avatar_key = CASE WHEN ? THEN ? ELSE avatar_key END,
        updated_at = ?
      WHERE id = ?
    `
  ).run(
    input.name ?? null,
    input.avatarKey !== undefined ? 1 : 0,
    input.avatarKey ?? null,
    new Date().toISOString(),
    childId
  );
}
