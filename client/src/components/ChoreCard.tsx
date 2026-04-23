type ChoreCardProps = {
  id: string;
  title: string;
  points: number;
  meta: string;
  done?: boolean;
  onDelete?: (id: string) => void;
};

export function ChoreCard({
  id,
  title,
  points,
  meta,
  done = false,
  onDelete
}: ChoreCardProps) {
  return (
    <article className={`chore-card${done ? " is-done" : ""}`}>
      <div className="chore-topline">
        <button
          className="check-button"
          type="button"
          aria-label={done ? "Undo completed chore" : "Complete chore"}
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
