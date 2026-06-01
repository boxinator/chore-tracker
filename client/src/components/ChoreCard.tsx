import { CheckCircle2, Send, Trash2, Zap } from "lucide-react";

type ChoreCardProps = {
  id: string;
  title: string;
  points: number;
  meta: string;
  assigneeChildId?: string | null;
  done?: boolean;
  onDelete?: (id: string) => void;
  onToggleComplete?: (id: string, done: boolean, childId: string | null) => void;
  onOpenDetails?: (id: string) => void;
  assignmentPending?: boolean;
  highlighted?: boolean;
};

export function ChoreCard({
  id,
  title,
  points,
  meta,
  assigneeChildId = null,
  done = false,
  onDelete,
  onToggleComplete,
  onOpenDetails,
  assignmentPending = false,
  highlighted = false
}: ChoreCardProps) {
  const canComplete = done || Boolean(onToggleComplete && assigneeChildId);
  const canAssign = !done && !assigneeChildId && Boolean(onOpenDetails);

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
        onClick={() => onToggleComplete?.(id, done, assigneeChildId)}
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
              className="icon-text-button"
              type="button"
              disabled={assignmentPending}
              onClick={() => onOpenDetails?.(id)}
            >
              <Send aria-hidden="true" />
              Assign
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

    </article>
  );
}
