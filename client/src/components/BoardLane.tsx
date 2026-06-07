import { ChevronDown, ChevronUp, Gift, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { ChoreCard } from "./ChoreCard";

type LaneItem = {
  id: string;
  kind: "chore" | "task";
  title: string;
  points: number;
  meta: string;
  assigneeChildId: string | null;
  done?: boolean;
};

type BoardLaneProps = {
  id: string;
  name: string;
  avatarKey?: string | null;
  accent: string;
  subtitle: string;
  items: LaneItem[];
  emptyMessage: string;
  showRewards?: boolean;
  onOpenRewards?: () => void;
  onOpenAddChore?: () => void;
  onOpenAvatarPicker?: () => void;
  onDelete?: (id: string, kind: "chore" | "task") => void;
  onToggleComplete?: (
    id: string,
    done: boolean,
    childId: string | null,
    kind: "chore" | "task"
  ) => void;
  onOpenDetails?: (id: string) => void;
  assignmentPendingChoreId?: string | null;
  highlightedChoreId?: string | null;
};

export function BoardLane({
  id,
  name,
  avatarKey,
  accent,
  subtitle,
  items,
  emptyMessage,
  showRewards = false,
  onOpenRewards,
  onOpenAddChore,
  onOpenAvatarPicker,
  onDelete,
  onToggleComplete,
  onOpenDetails,
  assignmentPendingChoreId,
  highlightedChoreId
}: BoardLaneProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [listScrollState, setListScrollState] = useState({
    canScrollDown: false,
    canScrollUp: false
  });
  const updateListScrollState = () => {
    const list = listRef.current;
    if (!list) {
      setListScrollState({ canScrollDown: false, canScrollUp: false });
      return;
    }

    const maxScrollTop = list.scrollHeight - list.clientHeight;
    setListScrollState({
      canScrollDown: list.scrollTop < maxScrollTop - 1,
      canScrollUp: list.scrollTop > 1
    });
  };
  const scrollLane = (direction: -1 | 1) => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    list.scrollBy({
      top: direction * Math.max(160, Math.round(list.clientHeight * 0.68)),
      behavior: "smooth"
    });
  };

  useEffect(() => {
    updateListScrollState();
    window.addEventListener("resize", updateListScrollState);
    return () => window.removeEventListener("resize", updateListScrollState);
  }, [items.length]);

  return (
    <section key={id} className="lane" style={{ ["--lane-accent" as string]: accent }}>
      <header className="lane-header">
        {showRewards && (
          <div className="lane-title-group">
            <button
              className="avatar-button"
              type="button"
              aria-label={`Change ${name} avatar`}
              onClick={onOpenAvatarPicker}
            >
              <Avatar avatarKey={avatarKey} name={name} size="md" interactive />
            </button>
            <div>
              <h2>{name}</h2>
              <p>{subtitle}</p>
            </div>
          </div>
        )}

        {!showRewards && (
          <div>
            <h2>{name}</h2>
            <p>{subtitle}</p>
          </div>
        )}
      </header>

      <div className="lane-list" ref={listRef} onScroll={updateListScrollState}>
        {items.map((item) => (
          <ChoreCard
            key={item.id}
            id={item.id}
            kind={item.kind}
            title={item.title}
            description={item.description}
            points={item.points}
            labels={item.labels}
            assigneeChildId={item.assigneeChildId}
            done={item.done}
            onDelete={onDelete}
            onToggleComplete={onToggleComplete}
            onOpenDetails={onOpenDetails}
            assignmentPending={assignmentPendingChoreId === item.id}
            highlighted={highlightedChoreId === item.id}
          />
        ))}

        {items.length === 0 && <p className="empty-copy">{emptyMessage}</p>}
      </div>

      {listScrollState.canScrollUp && (
        <button
          className="scroll-button lane-scroll-button lane-scroll-button-top"
          type="button"
          aria-label={`Scroll ${name} chores up`}
          onClick={() => scrollLane(-1)}
        >
          <ChevronUp aria-hidden="true" />
        </button>
      )}
      {listScrollState.canScrollDown && (
        <button
          className="scroll-button lane-scroll-button lane-scroll-button-bottom"
          type="button"
          aria-label={`Scroll ${name} chores down`}
          onClick={() => scrollLane(1)}
        >
          <ChevronDown aria-hidden="true" />
        </button>
      )}

      {showRewards && (
        <footer className="lane-footer">
          <button className="reward-button lane-reward-button" type="button" onClick={onOpenRewards}>
            <Gift aria-hidden="true" />
            Rewards
          </button>
        </footer>
      )}

      {!showRewards && onOpenAddChore && (
        <footer className="lane-footer">
          <button className="primary-button lane-add-button" type="button" onClick={onOpenAddChore}>
            <Plus aria-hidden="true" />
            Add
          </button>
        </footer>
      )}
    </section>
  );
}
