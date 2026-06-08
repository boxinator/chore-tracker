import type { DatabaseConnection } from "../db/connection.js";
import { getVisibleChoresForDate, type VisibleChore } from "./dashboard.js";

export type CalendarChild = {
  id: string;
  name: string;
  avatarKey: string | null;
};

export type CalendarTask = {
  id: string;
  title: string;
  description: string;
  assigneeChildId: string;
};

export type CalendarDay = {
  dateLocal: string;
  dayOfWeek: number;
  chores: VisibleChore[];
};

export type WeekCalendarData = {
  weekStartLocal: string;
  weekEndLocal: string;
  children: CalendarChild[];
  days: CalendarDay[];
  ongoingTasks: CalendarTask[];
};

function parseLocalDate(dateLocal: string) {
  const [year, month, day] = dateLocal.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekCalendarData(
  db: DatabaseConnection,
  weekStartLocal: string
): WeekCalendarData {
  const weekStart = parseLocalDate(weekStartLocal);
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + offset);
    const dateLocal = formatLocalDate(date);

    return {
      dateLocal,
      dayOfWeek: date.getDay(),
      chores: getVisibleChoresForDate(db, dateLocal, date.getDay())
    };
  });

  const children = db
    .prepare(
      `
        SELECT
          id,
          name,
          avatar_key as avatarKey
        FROM children
        ORDER BY sort_order ASC, name ASC
      `
    )
    .all() as CalendarChild[];

  const ongoingTasks = db
    .prepare(
      `
        SELECT
          id,
          title,
          description,
          assignee_child_id as assigneeChildId
        FROM tasks
        WHERE is_active = 1
          AND status = 'open'
        ORDER BY datetime(updated_at) DESC, datetime(created_at) ASC
      `
    )
    .all() as CalendarTask[];

  return {
    weekStartLocal: days[0]!.dateLocal,
    weekEndLocal: days[6]!.dateLocal,
    children,
    days,
    ongoingTasks
  };
}
