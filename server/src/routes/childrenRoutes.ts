import type { Express } from "express";
import type { DatabaseConnection } from "../db/connection.js";
import {
  ChildValidationError,
  createChild,
  listChildren,
  parseChildInput,
  parseChildUpdateInput,
  updateChild
} from "../services/children.js";
import { sendServiceError } from "./routeUtils.js";

export function registerChildrenRoutes(app: Express, db: DatabaseConnection) {
  app.get("/api/children", (_req, res) => {
    res.json({ children: listChildren(db) });
  });

  app.post("/api/children", (req, res) => {
    try {
      res.status(201).json(createChild(db, parseChildInput(req.body)));
    } catch (error) {
      sendServiceError(res, error, ChildValidationError, 400, "Failed to create child");
    }
  });

  app.patch("/api/children/:id", (req, res) => {
    try {
      updateChild(db, req.params.id, parseChildUpdateInput(req.body));
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, ChildValidationError, 400, "Failed to update child");
    }
  });
}
