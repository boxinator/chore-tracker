import { ChoreCard } from "./ChoreCard";
import type { AssignChildOption } from "../types";

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
  onOpenRewards?: () => void;
  onDelete?: (id: string) => void;
  onToggleComplete?: (id: string, done: boolean) => void;
  assignOptions?: AssignChildOption[];
  onAssign?: (id: string, childId: string) => void;
  onOpenDetails?: (id: string) => void;
  assignmentPendingChoreId?: string | null;
};

export function BoardLane({
  id,
  name,
  accent,
  subtitle,
  items,
  emptyMessage,
  showRewards = false,
  onOpenRewards,
  onDelete,
  onToggleComplete,
  assignOptions,
  onAssign,
  onOpenDetails,
  assignmentPendingChoreId
}: BoardLaneProps) {
  return (
    <section key={id} className="lane" style={{ ["--lane-accent" as string]: accent }}>
      <header className="lane-header">
        <div>
          <h2>{name}</h2>
          <p>{subtitle}</p>
        </div>

        {showRewards && (
          <button className="reward-button" type="button" onClick={onOpenRewards}>
            Rewards
          </button>
        )}
      </header>

      <div className="lane-list">
        {items.map((item) => (
          <ChoreCard
            key={item.id}
            id={item.id}
            title={item.title}
            points={item.points}
            meta={item.meta}
            done={item.done}
            onDelete={onDelete}
            onToggleComplete={onToggleComplete}
            assignOptions={assignOptions}
            onAssign={onAssign}
            onOpenDetails={onOpenDetails}
            assignmentPending={assignmentPendingChoreId === item.id}
          />
        ))}

        {items.length === 0 && <p className="empty-copy">{emptyMessage}</p>}
      </div>
    </section>
  );
}
