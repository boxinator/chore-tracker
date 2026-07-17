import type { Express } from "express";
import type { DatabaseConnection } from "../db/connection.js";
import {
  TaskValidationError,
  completeTask,
  createTask,
  deleteTask,
  parseCreateTaskInput,
  uncompleteTask
} from "../services/tasks.js";
import { getCurrentLocalDateString } from "../utils/dates.js";
import { sendServiceError } from "./routeUtils.js";

export function registerTaskRoutes(app: Express, db: DatabaseConnection) {
  app.post("/api/tasks", (req, res) => {
    try {
      res.status(201).json(createTask(db, parseCreateTaskInput(req.body)));
    } catch (error) {
      sendServiceError(res, error, TaskValidationError, 400, "Failed to create task");
    }
  });

  app.delete("/api/tasks/:id", (req, res) => {
    try {
      deleteTask(db, req.params.id);
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, TaskValidationError, 404, "Failed to delete task");
    }
  });

  app.post("/api/tasks/:id/complete", (req, res) => {
    try {
      completeTask(db, req.params.id, getCurrentLocalDateString(new Date()));
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, TaskValidationError, 400, "Failed to complete task");
    }
  });

  app.post("/api/tasks/:id/uncomplete", (req, res) => {
    try {
      uncompleteTask(db, req.params.id);
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, TaskValidationError, 400, "Failed to uncomplete task");
    }
  });
}
