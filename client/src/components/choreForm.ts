import type { ChoreAssignment, ChoreRotation, CreateChoreInput, VisibleChore } from "../types";

export const allDays = [0, 1, 2, 3, 4, 5, 6];

export function isChoreDraftValid(title: string, pointValue: string, rotation: ChoreRotation | null) {
  return (
    title.trim().length > 0 &&
    Number(pointValue) > 0 &&
    (!rotation || (rotation.childIds.length >= 2 && rotation.days.length > 0))
  );
}

export function buildChoreInput({
  title,
  description,
  pointValue,
  assignments,
  unassignedScheduleDays,
  rotation
}: {
  title: string;
  description: string;
  pointValue: string;
  assignments: ChoreAssignment[];
  unassignedScheduleDays: number[];
  rotation: ChoreRotation | null;
}): CreateChoreInput {
  return {
    title,
    description,
    pointValue: Number(pointValue),
    assignments: rotation ? [] : assignments,
    unassignedScheduleDays: assignments.length === 0 && !rotation ? unassignedScheduleDays : [],
    rotation
  };
}

export function getInitialDetailAssignments(
  chore: VisibleChore,
  initialAssignmentChildId: string | null | undefined,
  currentDayOfWeek: number
) {
  if (!initialAssignmentChildId) {
    return chore.assignments;
  }

  const existing = chore.assignments.find(
    (assignment) => assignment.childId === initialAssignmentChildId
  );

  if (existing) {
    return chore.assignments.map((assignment) =>
      assignment.childId === initialAssignmentChildId &&
      !assignment.days.includes(currentDayOfWeek)
        ? { ...assignment, days: [...assignment.days, currentDayOfWeek].sort((a, b) => a - b) }
        : assignment
    );
  }

  return [
    ...chore.assignments,
    { childId: initialAssignmentChildId, days: [currentDayOfWeek] }
  ].sort((left, right) => left.childId.localeCompare(right.childId));
}

export function getInitialUnassignedScheduleDays(chore: VisibleChore) {
  return chore.unassignedScheduleDays.length > 0 ? chore.unassignedScheduleDays : allDays;
}
