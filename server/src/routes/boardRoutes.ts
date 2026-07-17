import type { Express } from "express";
import { config } from "../config.js";
import type { DatabaseConnection } from "../db/connection.js";
import { getWeekCalendarData } from "../services/calendar.js";
import { getDashboardData } from "../services/dashboard.js";
import { getCurrentLocalDateString } from "../utils/dates.js";
import { parseLocalDateParam } from "./routeUtils.js";

export function registerBoardRoutes(app: Express, db: DatabaseConnection) {
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      app: "chore-tracker-server",
      databasePath: config.databasePath
    });
  });

  app.get("/api/dashboard", (req, res) => {
    const now = new Date();
    const todayLocal = getCurrentLocalDateString(now);
    const requestedDate = typeof req.query.date === "string" ? req.query.date : todayLocal;
    const parsedDate = parseLocalDateParam(requestedDate);

    if (!parsedDate) {
      res.status(400).json({ error: "A valid dashboard date is required" });
      return;
    }

    res.json(getDashboardData(db, requestedDate, parsedDate.getDay(), requestedDate === todayLocal));
  });

  app.get("/api/calendar/week", (req, res) => {
    const start = typeof req.query.start === "string" ? req.query.start : "";

    if (!parseLocalDateParam(start)) {
      res.status(400).json({ error: "A valid week start date is required" });
      return;
    }

    res.json(getWeekCalendarData(db, start));
  });
}
