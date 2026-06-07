import crypto from "node:crypto";
import { z } from "zod";
import type { DatabaseConnection } from "../db/connection.js";

const adjustmentInputSchema = z.object({
  childId: z.string().trim().min(1),
  operation: z.enum(["add", "subtract"]),
  amount: z.coerce.number().int().min(1).max(10000),
  reason: z.string().trim().min(3).max(200)
});

export type AdjustmentInput = z.infer<typeof adjustmentInputSchema>;

export class HistoryValidationError extends Error {}

export type HistoryEntry = {
  id: string;
  eventType: string;
  childId: string;
  childName: string;
  sourceType: string;
  sourceId: string;
  sourceName: string;
  pointDelta: number;
  timestamp: string;
};

export function listRecentHistory(db: DatabaseConnection, limit = 20): HistoryEntry[] {
  const safeLimit = Math.max(1, Math.min(limit, 100));

  return db
    .prepare(
      `
        SELECT
          id,
          event_type as eventType,
          child_id as childId,
          child_name_snapshot as childName,
          source_type as sourceType,
          source_id as sourceId,
          source_name_snapshot as sourceName,
          point_delta as pointDelta,
          timestamp
        FROM ledger_entries
        ORDER BY datetime(timestamp) DESC, id DESC
        LIMIT ?
      `
    )
    .all(safeLimit) as HistoryEntry[];
}

export function parseAdjustmentInput(input: unknown): AdjustmentInput {
  const result = adjustmentInputSchema.safeParse(input);

  if (!result.success) {
    throw new HistoryValidationError(result.error.issues[0]?.message ?? "Invalid adjustment");
  }

  return result.data;
}

export function createManualAdjustment(db: DatabaseConnection, input: AdjustmentInput) {
  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ? LIMIT 1")
    .get(input.childId) as { id: string; name: string } | undefined;

  if (!child) {
    throw new HistoryValidationError("Child not found");
  }

  const previousTotal = (
    db
      .prepare(
        "SELECT COALESCE(SUM(point_delta), 0) as total FROM ledger_entries WHERE child_id = ?"
      )
      .get(child.id) as { total: number }
  ).total;
  const pointDelta = input.operation === "add" ? input.amount : input.amount * -1;
  const id = `ledger-${crypto.randomUUID()}`;

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
      ) VALUES (?, 'manual_adjustment', ?, ?, 'manual', ?, ?, ?, ?, NULL, ?)
    `
  ).run(
    id,
    child.id,
    child.name,
    id,
    input.reason,
    pointDelta,
    new Date().toISOString(),
    JSON.stringify({ operation: input.operation, reason: input.reason })
  );

  return {
    id,
    previousTotal,
    newTotal: previousTotal + pointDelta
  };
}
