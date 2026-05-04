import type { DatabaseConnection } from "./connection.js";

type ChildSeed = {
  id: string;
  name: string;
  sortOrder: number;
};

type ChoreSeed = {
  id: string;
  title: string;
  description: string;
  pointValue: number;
  assigneeChildId: string | null;
  scheduleDays: number[];
};

type RewardSeed = {
  id: string;
  name: string;
  description: string;
  cost: number;
};

const childSeedData: ChildSeed[] = [
  { id: "child-sample-1", name: "Sample Child 1", sortOrder: 1 },
  { id: "child-sample-2", name: "Sample Child 2", sortOrder: 2 },
  { id: "child-sample-3", name: "Sample Child 3", sortOrder: 3 }
];

const choreSeedData: ChoreSeed[] = [
  {
    id: "chore-feed-cat",
    title: "Feed the cat",
    description: "Morning kibble and fresh water.",
    pointValue: 4,
    assigneeChildId: "child-sample-1",
    scheduleDays: []
  },
  {
    id: "chore-laundry",
    title: "Put away laundry",
    description: "Fold and put everything in drawers.",
    pointValue: 7,
    assigneeChildId: "child-sample-2",
    scheduleDays: [1, 4]
  },
  {
    id: "chore-recycling",
    title: "Take out recycling",
    description: "Blue bin goes to the curb.",
    pointValue: 8,
    assigneeChildId: null,
    scheduleDays: [4]
  },
  {
    id: "chore-table",
    title: "Clear the table",
    description: "Wipe crumbs and bring dishes to the sink.",
    pointValue: 5,
    assigneeChildId: null,
    scheduleDays: []
  }
];

const rewardSeedData: RewardSeed[] = [
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
  }
];

export function seedDatabase(db: DatabaseConnection) {
  const now = new Date().toISOString();

  const insertChild = db.prepare(`
    INSERT INTO children (id, name, sort_order, created_at, updated_at)
    VALUES (@id, @name, @sortOrder, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at
  `);

  const insertChore = db.prepare(`
    INSERT INTO chores (
      id,
      title,
      description,
      point_value,
      assignee_child_id,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @title,
      @description,
      @pointValue,
      @assigneeChildId,
      1,
      @createdAt,
      @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      point_value = excluded.point_value,
      assignee_child_id = excluded.assignee_child_id,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at
  `);

  const insertScheduleDay = db.prepare(`
    INSERT INTO chore_schedule_days (id, chore_id, day_of_week)
    VALUES (@id, @choreId, @dayOfWeek)
  `);

  const deleteScheduleDaysForChore = db.prepare(`
    DELETE FROM chore_schedule_days
    WHERE chore_id = ?
  `);

  const insertReward = db.prepare(`
    INSERT INTO rewards (id, name, description, cost, is_active, created_at, updated_at)
    VALUES (@id, @name, @description, @cost, 1, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      cost = excluded.cost,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at
  `);

  const insertLedgerEntry = db.prepare(`
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
      @childNameSnapshot,
      @sourceType,
      @sourceId,
      @sourceNameSnapshot,
      @pointDelta,
      @timestamp,
      NULL,
      NULL
    )
    ON CONFLICT(id) DO UPDATE SET
      child_name_snapshot = excluded.child_name_snapshot,
      source_name_snapshot = excluded.source_name_snapshot,
      point_delta = excluded.point_delta,
      timestamp = excluded.timestamp
  `);

  const seedTransaction = db.transaction(() => {
    for (const child of childSeedData) {
      insertChild.run({
        ...child,
        createdAt: now,
        updatedAt: now
      });
    }

    for (const chore of choreSeedData) {
      insertChore.run({
        ...chore,
        createdAt: now,
        updatedAt: now
      });

      deleteScheduleDaysForChore.run(chore.id);

      chore.scheduleDays.forEach((dayOfWeek) => {
        insertScheduleDay.run({
          id: `${chore.id}-day-${dayOfWeek}`,
          choreId: chore.id,
          dayOfWeek
        });
      });
    }

    for (const reward of rewardSeedData) {
      insertReward.run({
        ...reward,
        createdAt: now,
        updatedAt: now
      });
    }

    insertLedgerEntry.run({
      id: "ledger-sample-1-setup",
      eventType: "bonus_seed",
      childId: "child-sample-1",
      childNameSnapshot: "Sample Child 1",
      sourceType: "system",
      sourceId: "seed",
      sourceNameSnapshot: "Seed Bonus",
      pointDelta: 15,
      timestamp: now
    });

    insertLedgerEntry.run({
      id: "ledger-sample-2-setup",
      eventType: "bonus_seed",
      childId: "child-sample-2",
      childNameSnapshot: "Sample Child 2",
      sourceType: "system",
      sourceId: "seed",
      sourceNameSnapshot: "Seed Bonus",
      pointDelta: 9,
      timestamp: now
    });
  });

  seedTransaction();
}
