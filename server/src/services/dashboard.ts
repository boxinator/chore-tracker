import type { DatabaseConnection } from "../db/connection.js";

export type ChildPointTotal = {
  childId: string;
  name: string;
  totalPoints: number;
};

export type VisibleChore = {
  id: string;
  title: string;
  description: string;
  pointValue: number;
  assigneeChildId: string | null;
  isCompletedToday: boolean;
  scheduledDays: number[];
};

export type DashboardChild = {
  id: string;
  name: string;
  totalPoints: number;
  chores: VisibleChore[];
};

export type DashboardData = {
  currentDateLocal: string;
  dayOfWeek: number;
  unassignedChores: VisibleChore[];
  children: DashboardChild[];
};

type ChoreRow = {
  id: string;
  title: string;
  description: string;
  point_value: number;
  assignee_child_id: string | null;
  completion_id: string | null;
};

type ScheduleRow = {
  choreId: string;
  dayOfWeek: number;
};

export function getChildPointTotals(db: DatabaseConnection): ChildPointTotal[] {
  return db
    .prepare(
      `
        SELECT
          c.id as childId,
          c.name as name,
          COALESCE(SUM(le.point_delta), 0) as totalPoints
        FROM children c
        LEFT JOIN ledger_entries le ON le.child_id = c.id
        GROUP BY c.id, c.name, c.sort_order
        ORDER BY c.sort_order ASC, c.name ASC
      `
    )
    .all() as ChildPointTotal[];
}

export function getVisibleChoresForDate(
  db: DatabaseConnection,
  currentDateLocal: string,
  dayOfWeek: number
): VisibleChore[] {
  const scheduleRows = db
    .prepare(
      `
        SELECT
          chore_id as choreId,
          day_of_week as dayOfWeek
        FROM chore_schedule_days
      `
    )
    .all() as ScheduleRow[];

  const scheduleMap = scheduleRows.reduce<Map<string, number[]>>((map, row) => {
    const existing = map.get(row.choreId) ?? [];
    existing.push(row.dayOfWeek);
    map.set(row.choreId, existing);
    return map;
  }, new Map());

  const allChores = db
    .prepare(
      `
        SELECT
          ch.id,
          ch.title,
          ch.description,
          ch.point_value,
          ch.assignee_child_id,
          cc.id as completion_id
        FROM chores ch
        LEFT JOIN chore_completions cc
          ON cc.chore_id = ch.id
          AND cc.completion_date_local = ?
          AND cc.status = 'completed'
        WHERE ch.is_active = 1
        ORDER BY ch.created_at ASC
      `
    )
    .all(currentDateLocal) as ChoreRow[];

  return allChores
    .filter((chore) => {
      const scheduledDays = scheduleMap.get(chore.id) ?? [];

      if (scheduledDays.length === 0) {
        return true;
      }

      return scheduledDays.includes(dayOfWeek);
    })
    .map((chore) => ({
      id: chore.id,
      title: chore.title,
      description: chore.description,
      pointValue: chore.point_value,
      assigneeChildId: chore.assignee_child_id,
      isCompletedToday: chore.completion_id !== null,
      scheduledDays: scheduleMap.get(chore.id) ?? []
    }));
}

export function getDashboardData(
  db: DatabaseConnection,
  currentDateLocal: string,
  dayOfWeek: number
): DashboardData {
  const totals = getChildPointTotals(db);
  const visibleChores = getVisibleChoresForDate(db, currentDateLocal, dayOfWeek);

  const choresByChildId = visibleChores.reduce<Map<string, VisibleChore[]>>((map, chore) => {
    if (!chore.assigneeChildId) {
      return map;
    }

    const chores = map.get(chore.assigneeChildId) ?? [];
    chores.push(chore);
    map.set(chore.assigneeChildId, chores);
    return map;
  }, new Map());

  return {
    currentDateLocal,
    dayOfWeek,
    unassignedChores: visibleChores.filter((chore) => chore.assigneeChildId === null),
    children: totals.map((child) => ({
      id: child.childId,
      name: child.name,
      totalPoints: child.totalPoints,
      chores: choresByChildId.get(child.childId) ?? []
    }))
  };
}
