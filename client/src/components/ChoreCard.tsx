type ChoreCardProps = {
  title: string;
  points: number;
  meta: string;
  done?: boolean;
};

export function ChoreCard({ title, points, meta, done = false }: ChoreCardProps) {
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
        <button className="text-button" type="button">
          Details
        </button>
      </div>
    </article>
  );
}

