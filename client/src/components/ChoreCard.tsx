import { CheckCircle2, ClipboardCheck, Send, Trash2, Zap } from "lucide-react";

type ChoreCardProps = {
  id: string;
  kind?: "chore" | "task";
  title: string;
  points: number;
  meta: string;
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

      <button
        className="complete-pill"
        type="button"
        aria-label={done ? `Mark ${title} incomplete` : `Mark ${title} complete`}
        aria-pressed={done}
        disabled={!canComplete}
        onClick={() => onToggleComplete?.(id, done, assigneeChildId, kind)}
      >
        <CheckCircle2 aria-hidden="true" />
        <span>Done</span>
      </button>

      <button
        className="chore-detail-button"
        type="button"
        aria-label={`Show details for ${title}`}
        onClick={() => {
          if (!isTask) {
            onOpenDetails?.(id);
          }
        }}
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
              onClick={() => onDelete(id, kind)}
            >
              <Trash2 aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

    </article>
  );
}
