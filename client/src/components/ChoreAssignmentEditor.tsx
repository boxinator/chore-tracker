import { useState } from "react";
import type { ChoreAssignment, ChoreRotation, DashboardChild } from "../types";

type ChoreAssignmentEditorProps = {
  children: DashboardChild[];
  assignments: ChoreAssignment[];
  unassignedScheduleDays: number[];
  rotation: ChoreRotation | null;
  onChangeAssignments: (assignments: ChoreAssignment[]) => void;
  onChangeUnassignedScheduleDays: (days: number[]) => void;
  onChangeRotation: (rotation: ChoreRotation | null) => void;
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

function getTodayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ChoreAssignmentEditor({
  children,
  assignments,
  unassignedScheduleDays,
  rotation,
  onChangeAssignments,
  onChangeUnassignedScheduleDays,
  onChangeRotation
}: ChoreAssignmentEditorProps) {
  const hasAssignments = assignments.length > 0;
  const [assignmentMode, setAssignmentMode] = useState<"fixed" | "rotation">(
    rotation ? "rotation" : "fixed"
  );

  const updateChildDays = (childId: string, days: number[]) => {
    const nextAssignments = assignments
      .filter((assignment) => assignment.childId !== childId)
      .concat(days.length > 0 ? [{ childId, days: normalizeDays(days) }] : [])
      .sort((left, right) => left.childId.localeCompare(right.childId));

    onChangeAssignments(nextAssignments);
  };
  const enableFixedMode = () => {
    setAssignmentMode("fixed");
    onChangeRotation(null);
  };
  const enableRotationMode = () => {
    setAssignmentMode("rotation");
    onChangeAssignments([]);
    onChangeUnassignedScheduleDays([]);
    onChangeRotation(
      rotation ?? {
        childIds: children.slice(0, 2).map((child) => child.id),
        days: [1],
        startDateLocal: getTodayLocal()
      }
    );
  };
  const updateRotation = (changes: Partial<ChoreRotation>) => {
    onChangeRotation({
      childIds: rotation?.childIds ?? children.slice(0, 2).map((child) => child.id),
      days: rotation?.days ?? [1],
      startDateLocal: rotation?.startDateLocal ?? getTodayLocal(),
      ...changes
    });
  };
  const toggleRotationChild = (childId: string) => {
    const childIds = rotation?.childIds ?? [];
    const nextChildIds = childIds.includes(childId)
      ? childIds.filter((value) => value !== childId)
      : [...childIds, childId];

    updateRotation({ childIds: nextChildIds });
  };
  const moveRotationChild = (childId: string, direction: -1 | 1) => {
    const childIds = [...(rotation?.childIds ?? [])];
    const index = childIds.indexOf(childId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= childIds.length) {
      return;
    }

    childIds[index] = childIds[nextIndex]!;
    childIds[nextIndex] = childId;
    updateRotation({ childIds });
  };

  return (
    <div className="field assignment-editor">
      <span>Kid schedule</span>
      <div className="segmented-control assignment-mode-control" role="tablist" aria-label="Assignment mode">
        <button
          className={`segment-button${assignmentMode === "fixed" ? " is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={assignmentMode === "fixed"}
          onClick={enableFixedMode}
        >
          Fixed
        </button>
        <button
          className={`segment-button${assignmentMode === "rotation" ? " is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={assignmentMode === "rotation"}
          onClick={enableRotationMode}
        >
          Weekly Rotation
        </button>
      </div>

      {assignmentMode === "rotation" && rotation && (
        <div className="rotation-editor">
          <label className="field">
            <span>Start week</span>
            <input
              type="date"
              value={rotation.startDateLocal}
              onChange={(event) => updateRotation({ startDateLocal: event.target.value })}
            />
          </label>

          <div className="field">
            <span>Active days</span>
            <div className="weekday-picker">
              {weekdayLabels.map((label, day) => {
                const selected = rotation.days.includes(day);
                return (
                  <button
                    key={`rotation-day-${label}-${day}`}
                    className={`weekday-button${selected ? " is-selected" : ""}`}
                    type="button"
                    onClick={() => updateRotation({ days: toggleDay(rotation.days, day) })}
                    aria-pressed={selected}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rotation-kids">
            <span>Rotation order</span>
            {children.map((child) => {
              const selected = rotation.childIds.includes(child.id);
              const orderIndex = rotation.childIds.indexOf(child.id);
              return (
                <div className="rotation-kid-row" key={child.id}>
                  <button
                    className={`rotation-kid-toggle${selected ? " is-selected" : ""}`}
                    type="button"
                    onClick={() => toggleRotationChild(child.id)}
                    aria-pressed={selected}
                  >
                    {selected ? `${orderIndex + 1}. ` : ""}{child.name}
                  </button>
                  {selected && (
                    <div className="rotation-order-actions" aria-label={`Move ${child.name}`}>
                      <button
                        className="secondary-button assignment-all-button"
                        type="button"
                        onClick={() => moveRotationChild(child.id, -1)}
                        disabled={orderIndex === 0}
                      >
                        Up
                      </button>
                      <button
                        className="secondary-button assignment-all-button"
                        type="button"
                        onClick={() => moveRotationChild(child.id, 1)}
                        disabled={orderIndex === rotation.childIds.length - 1}
                      >
                        Down
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {assignmentMode === "fixed" && (
        <>
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
        </>
      )}
    </div>
  );
}
