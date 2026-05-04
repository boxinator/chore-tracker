import type { DatabaseConnection } from "../db/connection.js";

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
