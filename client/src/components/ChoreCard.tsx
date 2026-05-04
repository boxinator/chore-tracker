import { useState } from "react";
import type { AssignChildOption } from "../types";

type ChoreCardProps = {
  id: string;
  title: string;
  points: number;
  meta: string;
  done?: boolean;
  onDelete?: (id: string) => void;
  onToggleComplete?: (id: string, done: boolean) => void;
  assignOptions?: AssignChildOption[];
  onAssign?: (id: string, childId: string) => void;
  onOpenDetails?: (id: string) => void;
  assignmentPending?: boolean;
};

export function ChoreCard({
  id,
  title,
  points,
  meta,
  done = false,
  onDelete,
  onToggleComplete,
  assignOptions,
  onAssign,
  onOpenDetails,
  assignmentPending = false
}: ChoreCardProps) {
  const [assignMenuOpen, setAssignMenuOpen] = useState(false);
  const canComplete = done || Boolean(onToggleComplete);
  const canAssign = !done && assignOptions && assignOptions.length > 0 && onAssign;

  return (
    <article className={`chore-card${done ? " is-done" : ""}`}>
      <div className="chore-topline">
        <button
          className="check-button"
          type="button"
          aria-label={done ? "Undo completed chore" : "Complete chore"}
          disabled={!canComplete}
          onClick={() => onToggleComplete?.(id, done)}
        >
          {done ? "v" : ""}
        </button>
        <div className="chore-copy">
          <h3>{title}</h3>
          <p>{meta}</p>
        </div>
      </div>

      <div className="chore-footer">
        <span className="points-pill">{points} pts</span>
        <div className="card-actions">
          {canAssign && (
            <button
              className={`icon-text-button${assignMenuOpen ? " is-active" : ""}`}
              type="button"
              aria-expanded={assignMenuOpen}
              disabled={assignmentPending}
              onClick={() => setAssignMenuOpen((current) => !current)}
            >
              {assignmentPending ? "Assigning..." : "Assign"}
            </button>
          )}
          {onDelete && (
            <button
              className="icon-text-button danger-button"
              type="button"
              aria-label={`Delete ${title}`}
              onClick={() => onDelete(id)}
            >
              Del
            </button>
          )}
          <button className="text-button" type="button" onClick={() => onOpenDetails?.(id)}>
            Details
          </button>
        </div>
      </div>

      {canAssign && assignMenuOpen && (
        <div className="assign-chooser" aria-label={`Choose assignee for ${title}`}>
          {assignOptions.map((option) => (
            <button
              key={option.id}
              className="assign-chip"
              type="button"
              disabled={assignmentPending}
              onClick={() => {
                setAssignMenuOpen(false);
                onAssign(id, option.id);
              }}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
