import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "docs", "screenshots");
const tmpDir = path.join(outputDir, ".tmp");
const sampleDatabasePath = path.join(rootDir, "data", "sample.db");
const databasePath =
  process.env.SCREENSHOT_DATABASE_PATH ??
  path.join(tmpDir, "readme-screenshots.db");
const baseURL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:5173";
const useExistingServer = process.env.SCREENSHOT_USE_EXISTING_SERVER === "1";

const allDays = [0, 1, 2, 3, 4, 5, 6];
const now = new Date();
const today = localDateString(now);

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoMinutesAgo(minutes) {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

function prepareDatabase() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.rmSync(databasePath, { force: true });
  fs.rmSync(`${databasePath}-shm`, { force: true });
  fs.rmSync(`${databasePath}-wal`, { force: true });
  fs.copyFileSync(sampleDatabasePath, databasePath);

  const db = new Database(databasePath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_key TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chores (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      point_value INTEGER NOT NULL,
      assignee_child_id TEXT REFERENCES children(id) ON DELETE SET NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chore_schedule_days (
      id TEXT PRIMARY KEY,
      chore_id TEXT NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6)
    );

    CREATE TABLE IF NOT EXISTS chore_assignments (
      id TEXT PRIMARY KEY,
      chore_id TEXT NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6)
    );

    CREATE TABLE IF NOT EXISTS chore_rotations (
      id TEXT PRIMARY KEY,
      chore_id TEXT NOT NULL UNIQUE REFERENCES chores(id) ON DELETE CASCADE,
      start_date_local TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chore_rotation_children (
      id TEXT PRIMARY KEY,
      rotation_id TEXT NOT NULL REFERENCES chore_rotations(id) ON DELETE CASCADE,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chore_rotation_days (
      id TEXT PRIMARY KEY,
      rotation_id TEXT NOT NULL REFERENCES chore_rotations(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6)
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      cost INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progress_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_points INTEGER NOT NULL,
      start_date_local TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'awarded')),
      awarded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      child_id TEXT NOT NULL REFERENCES children(id),
      child_name_snapshot TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_name_snapshot TEXT NOT NULL,
      point_delta INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      reversal_of_id TEXT REFERENCES ledger_entries(id),
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      assignee_child_id TEXT NOT NULL REFERENCES children(id),
      status TEXT NOT NULL CHECK (status IN ('open', 'completed')),
      completion_date_local TEXT,
      completed_at TEXT,
      uncompleted_at TEXT,
      completion_ledger_entry_id TEXT REFERENCES ledger_entries(id),
      uncompletion_ledger_entry_id TEXT REFERENCES ledger_entries(id),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chore_completions (
      id TEXT PRIMARY KEY,
      chore_id TEXT NOT NULL REFERENCES chores(id),
      child_id TEXT NOT NULL REFERENCES children(id),
      completion_date_local TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      reversed_at TEXT,
      status TEXT NOT NULL CHECK (status IN ('completed', 'reversed')),
      ledger_entry_id TEXT REFERENCES ledger_entries(id),
      reversal_ledger_entry_id TEXT REFERENCES ledger_entries(id)
    );
  `);
  db.pragma("foreign_keys = OFF");

  const clear = db.transaction(() => {
    for (const table of [
      "chore_completions",
      "ledger_entries",
      "tasks",
      "chore_rotation_days",
      "chore_rotation_children",
      "chore_rotations",
      "chore_assignments",
      "chore_schedule_days",
      "chores",
      "rewards",
      "progress_goals",
      "children"
    ]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  });

  clear();
  db.pragma("foreign_keys = ON");

  const timestamp = now.toISOString();
  const children = [
    { id: "child-maya", name: "Maya", avatar: "toon-head-07", sort: 1 },
    { id: "child-eli", name: "Eli", avatar: "adventurer-12", sort: 2 },
    { id: "child-nora", name: "Nora", avatar: "big-smile-09", sort: 3 }
  ];
  const chores = [
    {
      id: "chore-feed-rocket",
      title: "Feed Rocket",
      description: "Scoop breakfast, refill water, and check the bowl before school.",
      points: 6,
      assignments: [{ childId: "child-maya", days: allDays }]
    },
    {
      id: "chore-lunchboxes",
      title: "Pack lunchboxes",
      description: "Add a sandwich, fruit, snack, and water bottle for tomorrow.",
      points: 8,
      assignments: [
        { childId: "child-maya", days: [1, 3, 5] },
        { childId: "child-eli", days: [2, 4] }
      ]
    },
    {
      id: "chore-recycling",
      title: "Take out recycling",
      description: "Bring the blue bin to the curb and flatten boxes.",
      points: 10,
      assignments: [{ childId: "child-eli", days: allDays }]
    },
    {
      id: "chore-table",
      title: "Clear dinner table",
      description: "Move dishes to the sink and wipe crumbs.",
      points: 5,
      assignments: [{ childId: "child-nora", days: allDays }]
    },
    {
      id: "chore-reading",
      title: "Read 20 minutes",
      description: "Pick any book and log the pages.",
      points: 7,
      assignments: [{ childId: "child-nora", days: allDays }]
    },
    {
      id: "chore-rotation",
      title: "Set out breakfast bowls",
      description: "Rotate who gets breakfast dishes ready.",
      points: 4,
      assignments: [],
      rotation: {
        id: "rotation-breakfast-bowls",
        childIds: ["child-maya", "child-eli", "child-nora"],
        days: allDays,
        startDate: today
      }
    },
    {
      id: "chore-plants",
      title: "Water kitchen herbs",
      description: "Check the basil and mint on the windowsill.",
      points: 4,
      assignments: []
    },
    {
      id: "chore-entryway",
      title: "Reset entryway",
      description: "Line up shoes and hang backpacks.",
      points: 5,
      assignments: []
    }
  ];
  const tasks = [
    {
      id: "task-library-books",
      title: "Find library books",
      description: "Put books in the tote by the front door.",
      childId: "child-eli",
      status: "open"
    },
    {
      id: "task-card",
      title: "Make Grandma a card",
      description: "Use markers and write a short note.",
      childId: "child-nora",
      status: "completed",
      ledgerId: "ledger-task-card"
    }
  ];
  const rewards = [
    {
      id: "reward-movie",
      name: "Movie Night Pick",
      description: "Choose the family movie tonight.",
      cost: 20
    },
    {
      id: "reward-dessert",
      name: "Extra Dessert",
      description: "Pick dessert after dinner.",
      cost: 12
    },
    {
      id: "reward-screen",
      name: "30 Minutes Screen Time",
      description: "Extra game or tablet time.",
      cost: 18
    },
    {
      id: "reward-library",
      name: "Library Trip",
      description: "Choose the next library stop.",
      cost: 9
    }
  ];

  const insertChild = db.prepare(`
    INSERT INTO children (id, name, avatar_key, sort_order, created_at, updated_at)
    VALUES (@id, @name, @avatar, @sort, @createdAt, @updatedAt)
  `);
  const insertChore = db.prepare(`
    INSERT INTO chores (id, title, description, point_value, assignee_child_id, is_active, created_at, updated_at)
    VALUES (@id, @title, @description, @points, NULL, 1, @createdAt, @updatedAt)
  `);
  const insertSchedule = db.prepare(`
    INSERT INTO chore_schedule_days (id, chore_id, day_of_week)
    VALUES (@id, @choreId, @day)
  `);
  const insertAssignment = db.prepare(`
    INSERT INTO chore_assignments (id, chore_id, child_id, day_of_week)
    VALUES (@id, @choreId, @childId, @day)
  `);
  const insertRotation = db.prepare(`
    INSERT INTO chore_rotations (id, chore_id, start_date_local)
    VALUES (@id, @choreId, @startDate)
  `);
  const insertRotationChild = db.prepare(`
    INSERT INTO chore_rotation_children (id, rotation_id, child_id, sort_order)
    VALUES (@id, @rotationId, @childId, @sort)
  `);
  const insertRotationDay = db.prepare(`
    INSERT INTO chore_rotation_days (id, rotation_id, day_of_week)
    VALUES (@id, @rotationId, @day)
  `);
  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id,
      title,
      description,
      assignee_child_id,
      status,
      completion_date_local,
      completed_at,
      uncompleted_at,
      completion_ledger_entry_id,
      uncompletion_ledger_entry_id,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @title,
      @description,
      @childId,
      @status,
      @completionDate,
      @completedAt,
      NULL,
      @ledgerId,
      NULL,
      1,
      @createdAt,
      @updatedAt
    )
  `);
  const insertReward = db.prepare(`
    INSERT INTO rewards (id, name, description, cost, is_active, created_at, updated_at)
    VALUES (@id, @name, @description, @cost, 1, @createdAt, @updatedAt)
  `);
  const insertProgressGoal = db.prepare(`
    INSERT INTO progress_goals (
      id,
      name,
      target_points,
      start_date_local,
      status,
      awarded_at,
      created_at,
      updated_at
    ) VALUES (@id, @name, @targetPoints, @startDate, 'active', NULL, @createdAt, @updatedAt)
  `);
  const insertLedger = db.prepare(`
    INSERT INTO ledger_entries (
      id,
      event_type,
      child_id,
      child_name_snapshot,
      source_type,
      source_id,
      source_name_snapshot,
      point_delta,
      timestamp,
      reversal_of_id,
      metadata_json
    ) VALUES (
      @id,
      @eventType,
      @childId,
      @childName,
      @sourceType,
      @sourceId,
      @sourceName,
      @delta,
      @timestamp,
      @reversalOf,
      NULL
    )
  `);
  const insertCompletion = db.prepare(`
    INSERT INTO chore_completions (
      id,
      chore_id,
      child_id,
      completion_date_local,
      completed_at,
      reversed_at,
      status,
      ledger_entry_id,
      reversal_ledger_entry_id
    ) VALUES (
      @id,
      @choreId,
      @childId,
      @date,
      @completedAt,
      NULL,
      'completed',
      @ledgerId,
      NULL
    )
  `);

  const seed = db.transaction(() => {
    for (const child of children) {
      insertChild.run({ ...child, createdAt: timestamp, updatedAt: timestamp });
    }

    for (const chore of chores) {
      insertChore.run({ ...chore, createdAt: timestamp, updatedAt: timestamp });

      if (chore.rotation) {
        insertRotation.run({
          id: chore.rotation.id,
          choreId: chore.id,
          startDate: chore.rotation.startDate
        });
        chore.rotation.childIds.forEach((childId, index) => {
          insertRotationChild.run({
            id: `${chore.rotation.id}-${childId}`,
            rotationId: chore.rotation.id,
            childId,
            sort: index
          });
        });
        for (const day of chore.rotation.days) {
          insertRotationDay.run({
            id: `${chore.rotation.id}-day-${day}`,
            rotationId: chore.rotation.id,
            day
          });
        }
        continue;
      }

      if (chore.assignments.length === 0) {
        for (const day of allDays) {
          insertSchedule.run({
            id: `${chore.id}-day-${day}`,
            choreId: chore.id,
            day
          });
        }
        continue;
      }

      for (const assignment of chore.assignments) {
        for (const day of assignment.days) {
          insertAssignment.run({
            id: `${chore.id}-${assignment.childId}-day-${day}`,
            choreId: chore.id,
            childId: assignment.childId,
            day
          });
        }
      }
    }

    for (const reward of rewards) {
      insertReward.run({ ...reward, createdAt: timestamp, updatedAt: timestamp });
    }

    insertProgressGoal.run({
      id: "progress-goal-family",
      name: "Family Starship Launch",
      targetPoints: 90,
      startDate: today,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    const ledgerEntries = [
      {
        id: "ledger-maya-start",
        eventType: "bonus_seed",
        childId: "child-maya",
        childName: "Maya",
        sourceType: "system",
        sourceId: "seed",
        sourceName: "Starting balance",
        delta: 34,
        timestamp: isoMinutesAgo(80),
        reversalOf: null
      },
      {
        id: "ledger-eli-start",
        eventType: "bonus_seed",
        childId: "child-eli",
        childName: "Eli",
        sourceType: "system",
        sourceId: "seed",
        sourceName: "Starting balance",
        delta: 21,
        timestamp: isoMinutesAgo(75),
        reversalOf: null
      },
      {
        id: "ledger-nora-start",
        eventType: "bonus_seed",
        childId: "child-nora",
        childName: "Nora",
        sourceType: "system",
        sourceId: "seed",
        sourceName: "Starting balance",
        delta: 14,
        timestamp: isoMinutesAgo(70),
        reversalOf: null
      },
      {
        id: "ledger-feed-rocket",
        eventType: "chore_complete",
        childId: "child-maya",
        childName: "Maya",
        sourceType: "chore",
        sourceId: "chore-feed-rocket",
        sourceName: "Feed Rocket",
        delta: 6,
        timestamp: isoMinutesAgo(35),
        reversalOf: null
      },
      {
        id: "ledger-recycling",
        eventType: "chore_complete",
        childId: "child-eli",
        childName: "Eli",
        sourceType: "chore",
        sourceId: "chore-recycling",
        sourceName: "Take out recycling",
        delta: 10,
        timestamp: isoMinutesAgo(22),
        reversalOf: null
      },
      {
        id: "ledger-task-card",
        eventType: "task_complete",
        childId: "child-nora",
        childName: "Nora",
        sourceType: "task",
        sourceId: "task-card",
        sourceName: "Make Grandma a card",
        delta: 0,
        timestamp: isoMinutesAgo(16),
        reversalOf: null
      },
      {
        id: "ledger-movie",
        eventType: "reward_redeem",
        childId: "child-maya",
        childName: "Maya",
        sourceType: "reward",
        sourceId: "reward-movie",
        sourceName: "Movie Night Pick",
        delta: -20,
        timestamp: isoMinutesAgo(10),
        reversalOf: null
      },
      {
        id: "ledger-adjust",
        eventType: "points_adjustment",
        childId: "child-nora",
        childName: "Nora",
        sourceType: "manual_adjustment",
        sourceId: "manual",
        sourceName: "Bonus kindness points",
        delta: 5,
        timestamp: isoMinutesAgo(5),
        reversalOf: null
      }
    ];

    for (const entry of ledgerEntries) {
      insertLedger.run(entry);
    }

    for (const task of tasks) {
      insertTask.run({
        ...task,
        completionDate: task.status === "completed" ? today : null,
        completedAt: task.status === "completed" ? isoMinutesAgo(16) : null,
        ledgerId: task.ledgerId ?? null,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }

    insertCompletion.run({
      id: "completion-feed-rocket",
      choreId: "chore-feed-rocket",
      childId: "child-maya",
      date: today,
      completedAt: isoMinutesAgo(35),
      ledgerId: "ledger-feed-rocket"
    });
    insertCompletion.run({
      id: "completion-recycling",
      choreId: "chore-recycling",
      childId: "child-eli",
      date: today,
      completedAt: isoMinutesAgo(22),
      ledgerId: "ledger-recycling"
    });
  });

  seed();
  db.close();
}

function startServer() {
  if (useExistingServer) {
    return null;
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "dev"], {
    cwd: rootDir,
    env: {
      ...process.env,
      DATABASE_PATH: databasePath,
      VITE_PORT: "5173",
      API_PORT: "3001"
    },
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  if (process.env.SCREENSHOT_VERBOSE === "1") {
    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  } else {
    child.stdout.resume();
    child.stderr.resume();
  }

  return child;
}

async function stopServer(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true
      });
      killer.on("exit", resolve);
      killer.on("error", resolve);
    });
    return;
  }

  child.kill("SIGTERM");
}

async function waitForApp() {
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseURL}`);
}

async function screenshot(page, name, options = {}) {
  await page.screenshot({
    path: path.join(outputDir, name),
    animations: "disabled",
    ...options
  });
}

async function screenshotLocator(locator, name, options = {}) {
  const maxHeight = options.maxHeight ?? null;

  if (!maxHeight) {
    await locator.screenshot({
      path: path.join(outputDir, name),
      animations: "disabled"
    });
    return;
  }

  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Unable to locate screenshot target for ${name}`);
  }

  await locator.page().screenshot({
    path: path.join(outputDir, name),
    animations: "disabled",
    clip: {
      x: Math.max(0, Math.floor(box.x)),
      y: Math.max(0, Math.floor(box.y)),
      width: Math.ceil(box.width),
      height: Math.min(Math.ceil(box.height), maxHeight)
    }
  });
}

async function closeDialog(page) {
  const close = page.getByRole("button", { name: "Close" }).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

async function clickManageTab(dialog, name) {
  await dialog.getByRole("tab", { name }).click();
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  prepareDatabase();
  const server = startServer();

  try {
    await waitForApp();

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

    await page.addInitScript(() => {
      window.localStorage.setItem("chore-theme", "space");
    });

    await page.goto(`${baseURL}/daily?date=${today}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Quest Board" }).waitFor();
    const expandUnassigned = page.getByRole("button", { name: "Expand Unassigned" });
    if (await expandUnassigned.isVisible().catch(() => false)) {
      await expandUnassigned.click();
    }
    await screenshot(page, "space-board-overview.png");
    await screenshotLocator(page.locator(".board-shell"), "feature-kiosk-board.png", { maxHeight: 700 });

    await page.locator("section.lane").filter({ hasText: "Unassigned" }).locator(".lane-footer").getByRole("button", { name: "Add chore" }).click();
    const addDialog = page.locator(".modal").last();
    await addDialog.waitFor();
    await addDialog.locator("label.field").filter({ hasText: "Title" }).locator("input").fill("Practice piano");
    await addDialog.locator("label.field").filter({ hasText: "Description" }).locator("textarea").fill("Play two songs and mark the practice log.");
    await addDialog.locator("label.field").filter({ hasText: "Points" }).locator("input").fill("9");
    await screenshotLocator(addDialog, "use-add-chore.png", { maxHeight: 620 });
    await addDialog.getByRole("tab", { name: "Task" }).click();
    await addDialog.locator("label.field").filter({ hasText: "Title" }).locator("input").fill("Bring permission slip");
    await addDialog.locator("label.field").filter({ hasText: "Description" }).locator("textarea").fill("Put the signed field trip slip in your backpack.");
    await screenshotLocator(addDialog, "feature-tasks.png", { maxHeight: 520 });
    await closeDialog(page);

    await page.locator(".chore-card").filter({ hasText: "Pack lunchboxes" }).getByRole("button", { name: /Show details/ }).click();
    const detailDialog = page.getByRole("dialog", { name: "Pack lunchboxes" });
    await screenshotLocator(detailDialog, "feature-chore-scheduling.png", { maxHeight: 620 });
    await screenshotLocator(detailDialog, "use-assign-reschedule.png", { maxHeight: 620 });
    await closeDialog(page);

    await screenshotLocator(page.locator(".chore-card").filter({ hasText: "Feed Rocket" }), "use-complete-undo.png");

    await page.locator("section.lane").filter({ hasText: "Maya" }).getByRole("button", { name: "Rewards" }).click();
    const rewardDialog = page.getByRole("dialog", { name: /Maya/ });
    await screenshotLocator(rewardDialog, "feature-rewards.png", { maxHeight: 620 });
    await rewardDialog.getByRole("button", { name: /Library Trip/i }).click();
    await screenshotLocator(rewardDialog, "use-redeem-reward.png", { maxHeight: 620 });
    await closeDialog(page);

    await page.getByRole("button", { name: "Manage" }).click();
    const manageDialog = page.getByRole("dialog", { name: "Household setup" });
    await screenshotLocator(manageDialog, "feature-household-management.png", { maxHeight: 620 });
    await screenshotLocator(manageDialog, "use-manage-household.png", { maxHeight: 620 });

    await clickManageTab(manageDialog, "History");
    await manageDialog.locator(".history-entry").evaluateAll((entries) => {
      for (const [index, entry] of entries.entries()) {
        if (index >= 5) {
          entry.style.display = "none";
        }
      }
    });
    await screenshotLocator(manageDialog, "use-view-history.png", { maxHeight: 620 });
    fs.copyFileSync(
      path.join(outputDir, "use-view-history.png"),
      path.join(outputDir, "feature-points-ledger.png")
    );
    await closeDialog(page);

    await page.goto(`${baseURL}/weekly?start=${today}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Weekly View" }).waitFor();
    await screenshotLocator(page.locator(".weekly-content"), "feature-weekly-calendar.png", { maxHeight: 700 });
    fs.copyFileSync(
      path.join(outputDir, "feature-weekly-calendar.png"),
      path.join(outputDir, "use-weekly-calendar.png")
    );

    await browser.close();
  } finally {
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
