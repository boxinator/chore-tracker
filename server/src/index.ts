import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { setupDatabase } from "./db/index.js";
import { getCurrentLocalDateString } from "./utils/dates.js";
import {
  ChoreValidationError,
  assignChore,
  completeChore,
  createChore,
  deleteChore,
  parseAssignChoreInput,
  parseCreateChoreInput,
  uncompleteChore
} from "./services/chores.js";
import { getDashboardData } from "./services/dashboard.js";

const db = setupDatabase(config.databasePath);
const app = express();

app.use(express.json());
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

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
  const currentDateLocal = getCurrentLocalDateString(now);
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

app.patch("/api/chores/:id/assign", (req, res) => {
  try {
    const input = parseAssignChoreInput(req.body);
    assignChore(db, req.params.id, input.childId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ChoreValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to assign chore" });
  }
});

app.post("/api/chores/:id/complete", (req, res) => {
  try {
    const now = new Date();
    completeChore(db, req.params.id, getCurrentLocalDateString(now), now.getDay());
    res.status(204).send();
  } catch (error) {
    if (error instanceof ChoreValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to complete chore" });
  }
});

app.post("/api/chores/:id/uncomplete", (req, res) => {
  try {
    const now = new Date();
    uncompleteChore(db, req.params.id, getCurrentLocalDateString(now));
    res.status(204).send();
  } catch (error) {
    if (error instanceof ChoreValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to uncomplete chore" });
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
