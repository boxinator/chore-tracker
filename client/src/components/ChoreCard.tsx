import { useState } from "react";
import { CheckCircle2, Send, Trash2, Zap } from "lucide-react";
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
  highlighted?: boolean;
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
  assignmentPending = false,
  highlighted = false
}: ChoreCardProps) {
  const [assignMenuOpen, setAssignMenuOpen] = useState(false);
  const canComplete = done || Boolean(onToggleComplete);
  const canAssign = !done && assignOptions && assignOptions.length > 0 && onAssign;

  return (
    <article className={`chore-card${done ? " is-done" : ""}${highlighted ? " is-highlighted" : ""}`}>
      <span className="points-ribbon">
        <Zap aria-hidden="true" />
        {points} pts
      </span>

      <button
        className="complete-pill"
        type="button"
        aria-label={done ? `Mark ${title} incomplete` : `Mark ${title} complete`}
        aria-pressed={done}
        disabled={!canComplete}
        onClick={() => onToggleComplete?.(id, done)}
      >
        <CheckCircle2 aria-hidden="true" />
        <span>Done</span>
      </button>

      <button
        className="chore-detail-button"
        type="button"
        aria-label={`Show details for ${title}`}
        onClick={() => onOpenDetails?.(id)}
      >
        <div className="chore-copy">
          <h3>{title}</h3>
          <p>{meta}</p>
        </div>
      </button>

      <div className="chore-footer">
        <div className="card-actions">
          {canAssign && (
            <button
              className={`icon-text-button${assignMenuOpen ? " is-active" : ""}`}
              type="button"
              aria-expanded={assignMenuOpen}
              disabled={assignmentPending}
              onClick={() => setAssignMenuOpen((current) => !current)}
            >
              <Send aria-hidden="true" />
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
              <Trash2 aria-hidden="true" />
            </button>
          )}
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
