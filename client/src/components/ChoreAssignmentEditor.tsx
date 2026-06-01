import type { ChoreAssignment, DashboardChild } from "../types";

type ChoreAssignmentEditorProps = {
  children: DashboardChild[];
  assignments: ChoreAssignment[];
  unassignedScheduleDays: number[];
  onChangeAssignments: (assignments: ChoreAssignment[]) => void;
  onChangeUnassignedScheduleDays: (days: number[]) => void;
};

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];
const allDays = [0, 1, 2, 3, 4, 5, 6];

function normalizeDays(days: number[]) {
  return [...new Set(days)].sort((left, right) => left - right);
}

function toggleDay(days: number[], day: number) {
  return days.includes(day)
    ? days.filter((value) => value !== day)
    : normalizeDays([...days, day]);
}

function daysForChild(assignments: ChoreAssignment[], childId: string) {
  return assignments.find((assignment) => assignment.childId === childId)?.days ?? [];
}

export function ChoreAssignmentEditor({
  children,
  assignments,
  unassignedScheduleDays,
  onChangeAssignments,
  onChangeUnassignedScheduleDays
}: ChoreAssignmentEditorProps) {
  const hasAssignments = assignments.length > 0;

  const updateChildDays = (childId: string, days: number[]) => {
    const nextAssignments = assignments
      .filter((assignment) => assignment.childId !== childId)
      .concat(days.length > 0 ? [{ childId, days: normalizeDays(days) }] : [])
      .sort((left, right) => left.childId.localeCompare(right.childId));

    onChangeAssignments(nextAssignments);
  };

  return (
    <div className="field assignment-editor">
      <span>Kid schedule</span>
      <div className="assignment-grid">
        {children.map((child) => {
          const childDays = daysForChild(assignments, child.id);
          return (
            <div className="assignment-row" key={child.id}>
              <div className="assignment-row-header">
                <strong>{child.name}</strong>
                <button
                  className="secondary-button assignment-all-button"
                  type="button"
                  onClick={() =>
                    updateChildDays(child.id, childDays.length === allDays.length ? [] : allDays)
                  }
                >
                  {childDays.length === allDays.length ? "Clear" : "All"}
                </button>
              </div>
              <div className="weekday-picker">
                {weekdayLabels.map((label, day) => {
                  const selected = childDays.includes(day);
                  return (
                    <button
                      key={`${child.id}-${label}-${day}`}
                      className={`weekday-button${selected ? " is-selected" : ""}`}
                      type="button"
                      onClick={() => updateChildDays(child.id, toggleDay(childDays, day))}
                      aria-pressed={selected}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!hasAssignments && (
        <div className="unassigned-schedule">
          <span>Unassigned availability</span>
          <div className="weekday-picker">
            {weekdayLabels.map((label, day) => {
              const selected = unassignedScheduleDays.includes(day);
              return (
                <button
                  key={`unassigned-${label}-${day}`}
                  className={`weekday-button${selected ? " is-selected" : ""}`}
                  type="button"
                  onClick={() => onChangeUnassignedScheduleDays(toggleDay(unassignedScheduleDays, day))}
                  aria-pressed={selected}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
