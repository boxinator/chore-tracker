import { ChoreCard } from "./ChoreCard";

type LaneItem = {
  id: string;
  title: string;
  points: number;
  meta: string;
  done?: boolean;
};

type BoardLaneProps = {
  id: string;
  name: string;
  accent: string;
  subtitle: string;
  items: LaneItem[];
  emptyMessage: string;
  showRewards?: boolean;
};

export function BoardLane({
  id,
  name,
  accent,
  subtitle,
  items,
  emptyMessage,
  showRewards = false
}: BoardLaneProps) {
  return (
    <section key={id} className="lane" style={{ ["--lane-accent" as string]: accent }}>
      <header className="lane-header">
        <div>
          <h2>{name}</h2>
          <p>{subtitle}</p>
        </div>

        {showRewards && (
          <button className="reward-button" type="button">
            Rewards
          </button>
        )}
      </header>

      <div className="lane-list">
        {items.map((item) => (
          <ChoreCard
            key={item.id}
            title={item.title}
            points={item.points}
            meta={item.meta}
            done={item.done}
          />
        ))}

        {items.length === 0 && <p className="empty-copy">{emptyMessage}</p>}
      </div>
    </section>
  );
}

