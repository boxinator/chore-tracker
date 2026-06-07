import { CheckCircle2, ClipboardCheck, Pencil, Trash2, Zap } from "lucide-react";

type ChoreCardProps = {
  id: string;
  kind?: "chore" | "task";
  title: string;
  description: string;
  points: number;
  labels: string[];
  assigneeChildId?: string | null;
  done?: boolean;
  onDelete?: (id: string, kind: "chore" | "task") => void;
  onToggleComplete?: (
    id: string,
    done: boolean,
    childId: string | null,
    kind: "chore" | "task"
  ) => void;
  onOpenDetails?: (id: string) => void;
  assignmentPending?: boolean;
  highlighted?: boolean;
};

export function ChoreCard({
  id,
  kind = "chore",
  title,
  description,
  points,
  labels,
  assigneeChildId = null,
  done = false,
  onDelete,
  onToggleComplete,
  onOpenDetails,
  assignmentPending = false,
  highlighted = false
}: ChoreCardProps) {
  const isTask = kind === "task";
  const canComplete = isTask || done || Boolean(onToggleComplete && assigneeChildId);
  const canAssign = !isTask && !done && !assigneeChildId && Boolean(onOpenDetails);

  return (
    <article className={`chore-card${isTask ? " is-task" : ""}${done ? " is-done" : ""}${highlighted ? " is-highlighted" : ""}`}>
      {isTask ? (
        <span className="task-ribbon">
          <ClipboardCheck aria-hidden="true" />
          Task
        </span>
      ) : (
        <span className="points-ribbon">
          <Zap aria-hidden="true" />
          {points} pts
        </span>
      )}

      {isTask ? (
        <div className="chore-detail-button chore-task-content">
          <div className="chore-copy">
            <h3>{title}</h3>
            {description && <p className="chore-description">{description}</p>}
            <div className="chore-labels" aria-label="Schedule and status">
              {labels.map((label) => (
                <span key={label} className="chore-label">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <button
          className="chore-detail-button"
          type="button"
          aria-label={`Show details for ${title}`}
          onClick={() => onOpenDetails?.(id)}
        >
        <div className="chore-copy">
          <h3>{title}</h3>
          {description && <p className="chore-description">{description}</p>}
          <div className="chore-labels" aria-label="Schedule and status">
            {labels.map((label) => (
              <span key={label} className="chore-label">
                {label}
              </span>
            ))}
          </div>
        </div>
        </button>
      )}

      <div className="card-action-column">
        <button
          className="complete-pill"
          type="button"
          aria-label={done ? `Mark ${title} incomplete` : `Mark ${title} complete`}
          aria-pressed={done}
          disabled={!canComplete}
          onClick={() => onToggleComplete?.(id, done, assigneeChildId, kind)}
        >
          <CheckCircle2 aria-hidden="true" />
        </button>
        {canAssign && (
          <button
            className="icon-text-button"
            type="button"
            aria-label={`Edit ${title}`}
            disabled={assignmentPending}
            onClick={() => onOpenDetails?.(id)}
          >
            <Pencil aria-hidden="true" />
          </button>
        )}
        {onDelete && (
          <button
            className="icon-text-button danger-button"
            type="button"
            aria-label={`Delete ${title}`}
            onClick={() => onDelete(id, kind)}
          >
            <Trash2 aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
