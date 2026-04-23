import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { setupDatabase } from "./db/index.js";
import {
  ChoreValidationError,
  createChore,
  deleteChore,
  parseCreateChoreInput
} from "./services/chores.js";
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

app.post("/api/chores", (req, res) => {
  try {
    const input = parseCreateChoreInput(req.body);
    const chore = createChore(db, input);
    res.status(201).json(chore);
  } catch (error) {
    if (error instanceof ChoreValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to create chore" });
  }
});

app.delete("/api/chores/:id", (req, res) => {
  try {
    deleteChore(db, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ChoreValidationError) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to delete chore" });
  }
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
