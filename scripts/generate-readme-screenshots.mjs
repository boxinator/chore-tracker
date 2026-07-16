import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "docs", "screenshots");
const databasePath =
  process.env.SCREENSHOT_DATABASE_PATH ??
  path.join(rootDir, "docs", "screenshots", ".tmp", "readme-screenshots.db");
const baseURL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:4173";

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

async function waitForApp() {
  const deadline = Date.now() + 60_000;

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

function seedDatabase() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.pragma("foreign_keys = OFF");

  const clear = db.transaction(() => {
    for (const table of [
      "chore_completions",
      "ledger_entries",
      "chore_assignments",
      "chore_schedule_days",
      "chores",
      "rewards",
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
  const insertReward = db.prepare(`
    INSERT INTO rewards (id, name, description, cost, is_active, created_at, updated_at)
    VALUES (@id, @name, @description, @cost, 1, @createdAt, @updatedAt)
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

    for (const entry of [
      {
        id: "ledger-maya-start",
        eventType: "bonus_seed",
        childId: "child-maya",
        childName: "Maya",
        sourceType: "system",
        sourceId: "seed",
        sourceName: "Starting balance",
        delta: 24,
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
        delta: 16,
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
        delta: 8,
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
      }
    ]) {
      insertLedger.run(entry);
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

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  await waitForApp();
  seedDatabase();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  await page.addInitScript(() => {
    window.localStorage.setItem("chore-theme", "space");
  });

  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Quest Board" }).waitFor();
  await screenshot(page, "space-board-overview.png");
  await screenshotLocator(page.locator(".board-shell"), "feature-kiosk-board.png");

  await page.getByRole("button", { name: "Add Chore" }).click();
  const addDialog = page.getByRole("dialog", { name: "Add chore" });
  await addDialog.getByLabel("Title").fill("Practice piano");
  await addDialog.getByLabel("Description").fill("Play two songs and mark the practice log.");
  await addDialog.getByLabel("Points").fill("9");
  await screenshotLocator(addDialog, "use-add-chore.png", { maxHeight: 620 });
  await closeDialog(page);

  await page.locator(".chore-card").filter({ hasText: "Pack lunchboxes" }).getByRole("button", { name: /Show details/ }).click();
  const detailDialog = page.getByRole("dialog", { name: "Pack lunchboxes" });
  await screenshotLocator(detailDialog, "feature-chore-scheduling.png", { maxHeight: 620 });
  await screenshotLocator(detailDialog, "use-assign-reschedule.png", { maxHeight: 620 });
  await closeDialog(page);

  await screenshotLocator(page.locator(".chore-card").filter({ hasText: "Feed Rocket" }), "use-complete-undo.png");

  await page.locator("section.lane").filter({ hasText: "Maya" }).getByRole("button", { name: "Rewards" }).click();
  const rewardDialog = page.getByRole("dialog", { name: "Maya" });
  await screenshotLocator(rewardDialog, "feature-rewards.png");
  await rewardDialog.getByRole("button", { name: /Library Trip/i }).click();
  await screenshotLocator(rewardDialog, "use-redeem-reward.png");
  await closeDialog(page);

  await page.getByRole("button", { name: "Manage" }).click();
  const manageDialog = page.getByRole("dialog", { name: "Household setup" });
  await screenshotLocator(manageDialog, "feature-household-management.png", { maxHeight: 620 });
  await screenshotLocator(manageDialog, "use-manage-household.png", { maxHeight: 620 });
  await closeDialog(page);

  await page.getByRole("button", { name: "History" }).click();
  const historyDialog = page.getByRole("dialog", { name: "Points history" });
  await historyDialog.locator(".history-entry").evaluateAll((entries) => {
    for (const [index, entry] of entries.entries()) {
      if (index >= 4) {
        entry.style.display = "none";
      }
    }
  });
  await historyDialog.locator("footer").evaluate((footer) => {
    footer.style.display = "none";
  });
  await screenshotLocator(historyDialog, "use-view-history.png");
  fs.copyFileSync(
    path.join(outputDir, "use-view-history.png"),
    path.join(outputDir, "feature-points-ledger.png")
  );
  await closeDialog(page);

  await page.getByRole("button", { name: "Open debug tools" }).click();
  await page.locator(".debug-health").evaluate((node) => {
    node.style.display = "none";
  });
  await screenshotLocator(page.locator(".debug-panel"), "feature-history-debugging.png");

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
