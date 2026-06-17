import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { setupDatabase } from "./db/index.js";
import { getCurrentLocalDateString } from "./utils/dates.js";
import {
  createReward,
  deactivateReward,
  listAllRewards,
  listActiveRewards,
  parseRewardInput,
  parseRedeemRewardInput,
  redeemReward,
  RewardValidationError,
  updateReward
} from "./services/rewards.js";
import {
  awardProgressGoal,
  createProgressGoal,
  getActiveProgressGoalWithProgress,
  parseProgressGoalInput,
  ProgressGoalValidationError,
  updateProgressGoal
} from "./services/progressGoals.js";
import {
  createManualAdjustment,
  HistoryValidationError,
  listRecentHistory,
  parseAdjustmentInput
} from "./services/history.js";
import {
  ChildValidationError,
  createChild,
  listChildren,
  parseChildInput,
  parseChildUpdateInput,
  updateChild
} from "./services/children.js";
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
} from "./services/chores.js";
import { getDashboardData } from "./services/dashboard.js";
import { getWeekCalendarData } from "./services/calendar.js";
import {
  TaskValidationError,
  completeTask,
  createTask,
  deleteTask,
  parseCreateTaskInput,
  uncompleteTask
} from "./services/tasks.js";

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

app.get("/api/dashboard", (req, res) => {
  const now = new Date();
  const todayLocal = getCurrentLocalDateString(now);
  const requestedDate = typeof req.query.date === "string" ? req.query.date : todayLocal;
  const parsedDate = new Date(`${requestedDate}T12:00:00`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || Number.isNaN(parsedDate.getTime())) {
    res.status(400).json({ error: "A valid dashboard date is required" });
    return;
  }

  res.json(getDashboardData(db, requestedDate, parsedDate.getDay(), requestedDate === todayLocal));
});

app.get("/api/calendar/week", (req, res) => {
  const start = typeof req.query.start === "string" ? req.query.start : "";
  const parsedStart = new Date(`${start}T12:00:00`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || Number.isNaN(parsedStart.getTime())) {
    res.status(400).json({ error: "A valid week start date is required" });
    return;
  }

  res.json(getWeekCalendarData(db, start));
});

app.get("/api/children", (_req, res) => {
  res.json({ children: listChildren(db) });
});

app.post("/api/children", (req, res) => {
  try {
    res.status(201).json(createChild(db, parseChildInput(req.body)));
  } catch (error) {
    if (error instanceof ChildValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to create child" });
  }
});

app.patch("/api/children/:id", (req, res) => {
  try {
    updateChild(db, req.params.id, parseChildUpdateInput(req.body));
    res.status(204).send();
  } catch (error) {
    if (error instanceof ChildValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to update child" });
  }
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

app.patch("/api/chores/:id", (req, res) => {
  try {
    const input = parseUpdateChoreInput(req.body);
    updateChore(db, req.params.id, input);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ChoreValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to update chore" });
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
    const childId = typeof req.body?.childId === "string" ? req.body.childId : "";
    completeChore(db, req.params.id, childId, getCurrentLocalDateString(now), now.getDay());
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
    const childId = typeof req.body?.childId === "string" ? req.body.childId : "";
    uncompleteChore(db, req.params.id, childId, getCurrentLocalDateString(now));
    res.status(204).send();
  } catch (error) {
    if (error instanceof ChoreValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to uncomplete chore" });
  }
});

app.post("/api/tasks", (req, res) => {
  try {
    res.status(201).json(createTask(db, parseCreateTaskInput(req.body)));
  } catch (error) {
    if (error instanceof TaskValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to create task" });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  try {
    deleteTask(db, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof TaskValidationError) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to delete task" });
  }
});

app.post("/api/tasks/:id/complete", (req, res) => {
  try {
    const now = new Date();
    completeTask(db, req.params.id, getCurrentLocalDateString(now));
    res.status(204).send();
  } catch (error) {
    if (error instanceof TaskValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to complete task" });
  }
});

app.post("/api/tasks/:id/uncomplete", (req, res) => {
  try {
    uncompleteTask(db, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof TaskValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to uncomplete task" });
  }
});

app.get("/api/rewards", (req, res) => {
  const includeInactive =
    req.query.includeInactive === "1" || req.query.includeInactive === "true";

  res.json({ rewards: includeInactive ? listAllRewards(db) : listActiveRewards(db) });
});

app.get("/api/progress-goals/active", (_req, res) => {
  res.json({ progressGoal: getActiveProgressGoalWithProgress(db) });
});

app.post("/api/progress-goals", (req, res) => {
  try {
    res.status(201).json(createProgressGoal(db, parseProgressGoalInput(req.body)));
  } catch (error) {
    if (error instanceof ProgressGoalValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to create progress goal" });
  }
});

app.patch("/api/progress-goals/:id", (req, res) => {
  try {
    updateProgressGoal(db, req.params.id, parseProgressGoalInput(req.body));
    res.status(204).send();
  } catch (error) {
    if (error instanceof ProgressGoalValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to update progress goal" });
  }
});

app.post("/api/progress-goals/:id/award", (req, res) => {
  try {
    awardProgressGoal(db, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ProgressGoalValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to award progress goal" });
  }
});

app.get("/api/history/recent", (req, res) => {
  const limitParam = req.query.limit;
  const limit =
    typeof limitParam === "string" && Number.isFinite(Number(limitParam))
      ? Number(limitParam)
      : 20;

  res.json({ entries: listRecentHistory(db, limit) });
});

app.post("/api/ledger/adjustments", (req, res) => {
  try {
    res.status(201).json(createManualAdjustment(db, parseAdjustmentInput(req.body)));
  } catch (error) {
    if (error instanceof HistoryValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to adjust points" });
  }
});

app.post("/api/rewards/:id/redeem", (req, res) => {
  try {
    const input = parseRedeemRewardInput(req.body);
    res.json(redeemReward(db, req.params.id, input.childId));
  } catch (error) {
    if (error instanceof RewardValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to redeem reward" });
  }
});

app.post("/api/rewards", (req, res) => {
  try {
    res.status(201).json(createReward(db, parseRewardInput(req.body)));
  } catch (error) {
    if (error instanceof RewardValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to create reward" });
  }
});

app.patch("/api/rewards/:id", (req, res) => {
  try {
    updateReward(db, req.params.id, parseRewardInput(req.body));
    res.status(204).send();
  } catch (error) {
    if (error instanceof RewardValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to update reward" });
  }
});

app.delete("/api/rewards/:id", (req, res) => {
  try {
    deactivateReward(db, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof RewardValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Failed to deactivate reward" });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(config.clientDistDir));

  app.get("/{*path}", (req, res, next) => {
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
