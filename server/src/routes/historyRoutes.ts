import type { Express } from "express";
import type { DatabaseConnection } from "../db/connection.js";
import {
  createManualAdjustment,
  HistoryValidationError,
  listRecentHistory,
  parseAdjustmentInput
} from "../services/history.js";
import { sendServiceError } from "./routeUtils.js";

export function registerHistoryRoutes(app: Express, db: DatabaseConnection) {
  app.get("/api/history/recent", (req, res) => {
    const limitParam = req.query.limit;
    const limit =
      typeof limitParam === "string" && Number.isFinite(Number(limitParam))
        ? Number(limitParam)
        : 20;

    res.json({ entries: listRecentHistory(db, limit) });
  });

  app.post("/api/ledger/adjustments", (req, res) => {
    try {
      res.status(201).json(createManualAdjustment(db, parseAdjustmentInput(req.body)));
    } catch (error) {
      sendServiceError(res, error, HistoryValidationError, 400, "Failed to adjust points");
    }
  });
}
