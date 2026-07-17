import type { Express } from "express";
import type { DatabaseConnection } from "../db/connection.js";
import {
  awardProgressGoal,
  createProgressGoal,
  getActiveProgressGoalWithProgress,
  parseProgressGoalInput,
  ProgressGoalValidationError,
  updateProgressGoal
} from "../services/progressGoals.js";
import { sendServiceError } from "./routeUtils.js";

export function registerProgressGoalRoutes(app: Express, db: DatabaseConnection) {
  app.get("/api/progress-goals/active", (_req, res) => {
    res.json({ progressGoal: getActiveProgressGoalWithProgress(db) });
  });

  app.post("/api/progress-goals", (req, res) => {
    try {
      res.status(201).json(createProgressGoal(db, parseProgressGoalInput(req.body)));
    } catch (error) {
      sendServiceError(res, error, ProgressGoalValidationError, 400, "Failed to create progress goal");
    }
  });

  app.patch("/api/progress-goals/:id", (req, res) => {
    try {
      updateProgressGoal(db, req.params.id, parseProgressGoalInput(req.body));
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, ProgressGoalValidationError, 400, "Failed to update progress goal");
    }
  });

  app.post("/api/progress-goals/:id/award", (req, res) => {
    try {
      awardProgressGoal(db, req.params.id);
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, ProgressGoalValidationError, 400, "Failed to award progress goal");
    }
  });
}
