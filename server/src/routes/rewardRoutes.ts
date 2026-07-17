import type { Express } from "express";
import type { DatabaseConnection } from "../db/connection.js";
import {
  createReward,
  deactivateReward,
  listActiveRewards,
  listAllRewards,
  parseRedeemRewardInput,
  parseRewardInput,
  redeemReward,
  RewardValidationError,
  updateReward
} from "../services/rewards.js";
import { sendServiceError } from "./routeUtils.js";

export function registerRewardRoutes(app: Express, db: DatabaseConnection) {
  app.get("/api/rewards", (req, res) => {
    const includeInactive =
      req.query.includeInactive === "1" || req.query.includeInactive === "true";

    res.json({ rewards: includeInactive ? listAllRewards(db) : listActiveRewards(db) });
  });

  app.post("/api/rewards", (req, res) => {
    try {
      res.status(201).json(createReward(db, parseRewardInput(req.body)));
    } catch (error) {
      sendServiceError(res, error, RewardValidationError, 400, "Failed to create reward");
    }
  });

  app.patch("/api/rewards/:id", (req, res) => {
    try {
      updateReward(db, req.params.id, parseRewardInput(req.body));
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, RewardValidationError, 400, "Failed to update reward");
    }
  });

  app.delete("/api/rewards/:id", (req, res) => {
    try {
      deactivateReward(db, req.params.id);
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, RewardValidationError, 400, "Failed to deactivate reward");
    }
  });

  app.post("/api/rewards/:id/redeem", (req, res) => {
    try {
      res.json(redeemReward(db, req.params.id, parseRedeemRewardInput(req.body).childId));
    } catch (error) {
      sendServiceError(res, error, RewardValidationError, 400, "Failed to redeem reward");
    }
  });
}
