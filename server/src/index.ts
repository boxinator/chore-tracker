import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { setupDatabase } from "./db/index.js";
import { getDashboardData } from "./services/dashboard.js";

const db = setupDatabase(config.databasePath);
const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    app: "chore-tracker-server",
    databasePath: config.databasePath
  });
});

app.get("/api/dashboard", (_req, res) => {
  const now = new Date();
  const currentDateLocal = now.toISOString().slice(0, 10);
  const dayOfWeek = now.getDay();

  res.json(getDashboardData(db, currentDateLocal, dayOfWeek));
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(config.clientDistDir));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }

    res.sendFile(path.join(config.clientDistDir, "index.html"));
  });
}

app.listen(config.port, () => {
  console.log(`Chore Tracker server listening on http://localhost:${config.port}`);
});
