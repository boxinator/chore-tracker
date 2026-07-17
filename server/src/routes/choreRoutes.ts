import type { Express } from "express";
import type { DatabaseConnection } from "../db/connection.js";
import {
  ChoreValidationError,
  assignChore,
  completeChore,
  createChore,
  deleteChore,
  parseAssignChoreInput,
  parseCreateChoreInput,
  parseUpdateChoreInput,
  updateChore,
  uncompleteChore
} from "../services/chores.js";
import { getCurrentLocalDateString } from "../utils/dates.js";
import { sendServiceError } from "./routeUtils.js";

export function registerChoreRoutes(app: Express, db: DatabaseConnection) {
  app.post("/api/chores", (req, res) => {
    try {
      res.status(201).json(createChore(db, parseCreateChoreInput(req.body)));
    } catch (error) {
      sendServiceError(res, error, ChoreValidationError, 400, "Failed to create chore");
    }
  });

  app.patch("/api/chores/:id", (req, res) => {
    try {
      updateChore(db, req.params.id, parseUpdateChoreInput(req.body));
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, ChoreValidationError, 400, "Failed to update chore");
    }
  });

  app.delete("/api/chores/:id", (req, res) => {
    try {
      deleteChore(db, req.params.id);
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, ChoreValidationError, 404, "Failed to delete chore");
    }
  });

  app.patch("/api/chores/:id/assign", (req, res) => {
    try {
      assignChore(db, req.params.id, parseAssignChoreInput(req.body).childId);
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, ChoreValidationError, 400, "Failed to assign chore");
    }
  });

  app.post("/api/chores/:id/complete", (req, res) => {
    try {
      const now = new Date();
      const childId = typeof req.body?.childId === "string" ? req.body.childId : "";
      completeChore(db, req.params.id, childId, getCurrentLocalDateString(now), now.getDay());
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, ChoreValidationError, 400, "Failed to complete chore");
    }
  });

  app.post("/api/chores/:id/uncomplete", (req, res) => {
    try {
      const now = new Date();
      const childId = typeof req.body?.childId === "string" ? req.body.childId : "";
      uncompleteChore(db, req.params.id, childId, getCurrentLocalDateString(now));
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, ChoreValidationError, 400, "Failed to uncomplete chore");
    }
  });
}
