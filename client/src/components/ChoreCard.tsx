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
  onAssign
}: ChoreCardProps) {
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
            <select
              className="assign-select"
              aria-label={`Assign ${title}`}
              defaultValue=""
              onChange={(event) => {
                const childId = event.target.value;
                if (!childId) {
                  return;
                }

                onAssign(id, childId);
                event.currentTarget.value = "";
              }}
            >
              <option value="">Assign</option>
              {assignOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
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
          <button className="text-button" type="button">
            Details
          </button>
        </div>
      </div>
    </article>
  );
}
