import type { Express } from "express";
import type { DatabaseConnection } from "../db/connection.js";
import { registerBoardRoutes } from "./boardRoutes.js";
import { registerChildrenRoutes } from "./childrenRoutes.js";
import { registerChoreRoutes } from "./choreRoutes.js";
import { registerHistoryRoutes } from "./historyRoutes.js";
import { registerProgressGoalRoutes } from "./progressGoalRoutes.js";
import { registerRewardRoutes } from "./rewardRoutes.js";
import { registerTaskRoutes } from "./taskRoutes.js";

export function registerApiRoutes(app: Express, db: DatabaseConnection) {
  registerBoardRoutes(app, db);
  registerChildrenRoutes(app, db);
  registerChoreRoutes(app, db);
  registerTaskRoutes(app, db);
  registerRewardRoutes(app, db);
  registerProgressGoalRoutes(app, db);
  registerHistoryRoutes(app, db);
}
