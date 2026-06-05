import type { DatabaseConnection } from "../db/connection.js";

export type ChildPointTotal = {
  childId: string;
  name: string;
  avatarKey: string | null;
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
  assignments: ChoreAssignment[];
  unassignedScheduleDays: number[];
};

export type ChoreAssignment = {
  childId: string;
  days: number[];
};

export type VisibleTask = {
  id: string;
  title: string;
  description: string;
  assigneeChildId: string;
  isCompletedToday: boolean;
};

export type DashboardChild = {
  id: string;
  name: string;
  avatarKey: string | null;
  totalPoints: number;
  tasks: VisibleTask[];
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
  created_at: string;
  updated_at: string;
};

type ScheduleRow = {
  choreId: string;
  dayOfWeek: number;
};

type AssignmentRow = {
  choreId: string;
  childId: string;
  dayOfWeek: number;
};

type CompletionRow = {
  choreId: string;
  childId: string;
};

type TaskRow = {
  id: string;
  title: string;
  description: string;
  assigneeChildId: string;
  status: string;
  completionDateLocal: string | null;
  createdAt: string;
  updatedAt: string;
};

type InternalVisibleChore = VisibleChore & {
  createdAt: string;
  updatedAt: string;
};

type InternalVisibleTask = VisibleTask & {
  createdAt: string;
  updatedAt: string;
  status: string;
};

export function getChildPointTotals(db: DatabaseConnection): ChildPointTotal[] {
  return db
    .prepare(
      `
        SELECT
          c.id as childId,
          c.name as name,
          c.avatar_key as avatarKey,
          COALESCE(SUM(le.point_delta), 0) as totalPoints
        FROM children c
        LEFT JOIN ledger_entries le ON le.child_id = c.id
        GROUP BY c.id, c.name, c.avatar_key, c.sort_order
        ORDER BY c.sort_order ASC, c.name ASC
      `
    )
    .all() as ChildPointTotal[];
}

function getVisibleChoreRecordsForDate(
  db: DatabaseConnection,
  currentDateLocal: string,
  dayOfWeek: number
): InternalVisibleChore[] {
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
  const assignmentRows = db
    .prepare(
      `
        SELECT
          chore_id as choreId,
          child_id as childId,
          day_of_week as dayOfWeek
        FROM chore_assignments
      `
    )
    .all() as AssignmentRow[];

  const completionRows = db
    .prepare(
      `
        SELECT
          chore_id as choreId,
          child_id as childId
        FROM chore_completions
        WHERE completion_date_local = ?
          AND status = 'completed'
      `
    )
    .all(currentDateLocal) as CompletionRow[];

  const scheduleMap = scheduleRows.reduce<Map<string, number[]>>((map, row) => {
    const existing = map.get(row.choreId) ?? [];
    existing.push(row.dayOfWeek);
    map.set(row.choreId, existing);
    return map;
  }, new Map());

  const assignmentsByChoreId = assignmentRows.reduce<Map<string, ChoreAssignment[]>>(
    (map, row) => {
      const assignments = map.get(row.choreId) ?? [];
      const existing = assignments.find((assignment) => assignment.childId === row.childId);

      if (existing) {
        existing.days.push(row.dayOfWeek);
      } else {
        assignments.push({ childId: row.childId, days: [row.dayOfWeek] });
      }

      map.set(row.choreId, assignments);
      return map;
    },
    new Map()
  );

  for (const assignments of assignmentsByChoreId.values()) {
    assignments.sort((left, right) => left.childId.localeCompare(right.childId));
    for (const assignment of assignments) {
      assignment.days.sort((left, right) => left - right);
    }
  }

  const completedToday = completionRows.reduce<Set<string>>((set, row) => {
    set.add(`${row.choreId}:${row.childId}`);
    return set;
  }, new Set());

  const allChores = db
    .prepare(
      `
        SELECT
          ch.id,
          ch.title,
          ch.description,
          ch.point_value,
          ch.created_at,
          ch.updated_at
        FROM chores ch
        WHERE ch.is_active = 1
        ORDER BY ch.created_at ASC
      `
    )
    .all() as ChoreRow[];

  return allChores.flatMap<InternalVisibleChore>((chore) => {
    const assignments = assignmentsByChoreId.get(chore.id) ?? [];
    const unassignedScheduleDays = scheduleMap.get(chore.id) ?? [];

    if (assignments.length === 0) {
      if (!unassignedScheduleDays.includes(dayOfWeek)) {
        return [];
      }

      return [
        {
          id: chore.id,
          title: chore.title,
          description: chore.description,
          pointValue: chore.point_value,
          assigneeChildId: null,
          isCompletedToday: false,
          scheduledDays: unassignedScheduleDays,
          assignments,
          unassignedScheduleDays,
          createdAt: chore.created_at,
          updatedAt: chore.updated_at
        }
      ];
    }

    return assignments
      .filter((assignment) => assignment.days.includes(dayOfWeek))
      .map((assignment) => ({
        id: chore.id,
        title: chore.title,
        description: chore.description,
        pointValue: chore.point_value,
        assigneeChildId: assignment.childId,
        isCompletedToday: completedToday.has(`${chore.id}:${assignment.childId}`),
        scheduledDays: assignment.days,
        assignments,
        unassignedScheduleDays,
        createdAt: chore.created_at,
        updatedAt: chore.updated_at
      }));
  });
}

export function getVisibleChoresForDate(
  db: DatabaseConnection,
  currentDateLocal: string,
  dayOfWeek: number
): VisibleChore[] {
  return getVisibleChoreRecordsForDate(db, currentDateLocal, dayOfWeek).map((chore) => ({
    id: chore.id,
    title: chore.title,
    description: chore.description,
    pointValue: chore.pointValue,
    assigneeChildId: chore.assigneeChildId,
    isCompletedToday: chore.isCompletedToday,
    scheduledDays: chore.scheduledDays,
    assignments: chore.assignments,
    unassignedScheduleDays: chore.unassignedScheduleDays
  }));
}

function getVisibleTasksForDate(
  db: DatabaseConnection,
  currentDateLocal: string
): InternalVisibleTask[] {
  const tasks = db
    .prepare(
      `
        SELECT
          id,
          title,
          description,
          assignee_child_id as assigneeChildId,
          status,
          completion_date_local as completionDateLocal,
          created_at as createdAt,
          updated_at as updatedAt
        FROM tasks
        WHERE is_active = 1
          AND (
            status = 'open'
            OR (status = 'completed' AND completion_date_local = ?)
          )
        ORDER BY
          CASE status WHEN 'open' THEN 0 ELSE 1 END ASC,
          datetime(updated_at) DESC,
          datetime(created_at) ASC
      `
    )
    .all(currentDateLocal) as TaskRow[];

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    assigneeChildId: task.assigneeChildId,
    isCompletedToday: task.status === "completed" && task.completionDateLocal === currentDateLocal,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    status: task.status
  }));
}

export function getDashboardData(
  db: DatabaseConnection,
  currentDateLocal: string,
  dayOfWeek: number
): DashboardData {
  const totals = getChildPointTotals(db);
  const visibleChores = getVisibleChoreRecordsForDate(db, currentDateLocal, dayOfWeek);
  const visibleTasks = getVisibleTasksForDate(db, currentDateLocal);

  const choresByChildId = visibleChores.reduce<Map<string, VisibleChore[]>>((map, chore) => {
    if (!chore.assigneeChildId) {
      return map;
    }

    const chores = map.get(chore.assigneeChildId) ?? [];
    chores.push({
      id: chore.id,
      title: chore.title,
      description: chore.description,
      pointValue: chore.pointValue,
      assigneeChildId: chore.assigneeChildId,
      isCompletedToday: chore.isCompletedToday,
      scheduledDays: chore.scheduledDays,
      assignments: chore.assignments,
      unassignedScheduleDays: chore.unassignedScheduleDays
    });
    map.set(chore.assigneeChildId, chores);
    return map;
  }, new Map());

  for (const chores of choresByChildId.values()) {
    chores.sort((left, right) =>
      visibleChores
        .find((chore) => chore.id === right.id)!
        .updatedAt.localeCompare(visibleChores.find((chore) => chore.id === left.id)!.updatedAt)
    );
  }

  const tasksByChildId = visibleTasks.reduce<Map<string, VisibleTask[]>>((map, task) => {
    const tasks = map.get(task.assigneeChildId) ?? [];
    tasks.push({
      id: task.id,
      title: task.title,
      description: task.description,
      assigneeChildId: task.assigneeChildId,
      isCompletedToday: task.isCompletedToday
    });
    map.set(task.assigneeChildId, tasks);
    return map;
  }, new Map());

  const unassignedChores = visibleChores
    .filter((chore) => chore.assigneeChildId === null)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((chore) => ({
      id: chore.id,
      title: chore.title,
      description: chore.description,
      pointValue: chore.pointValue,
      assigneeChildId: chore.assigneeChildId,
      isCompletedToday: chore.isCompletedToday,
      scheduledDays: chore.scheduledDays,
      assignments: chore.assignments,
      unassignedScheduleDays: chore.unassignedScheduleDays
    }));

  return {
    currentDateLocal,
    dayOfWeek,
    unassignedChores,
    children: totals.map((child) => ({
      id: child.childId,
      name: child.name,
      avatarKey: child.avatarKey,
      totalPoints: child.totalPoints,
      tasks: tasksByChildId.get(child.childId) ?? [],
      chores: choresByChildId.get(child.childId) ?? []
    }))
  };
}
