import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  AdjustmentInput,
  Child,
  ChildInput,
  CreateChoreInput,
  CreateTaskInput,
  DashboardResponse,
  HistoryEntry,
  RedeemRewardResult,
  Reward,
  ProgressGoal,
  RewardInput,
  UpdateChoreInput,
  VisibleChore,
  VisibleTask
} from "../types";
import { AddChoreModal } from "../components/AddChoreModal";
import { BoardLane } from "../components/BoardLane";
import { ChoreDetailModal } from "../components/ChoreDetailModal";
import { QuestBackground } from "../components/QuestBackground";
import { RewardModal } from "../components/RewardModal";
import { SpaceBackground } from "../components/SpaceBackground";
import { PeriodNavigator } from "../components/PeriodNavigator";
import { GlobalNav } from "../components/GlobalNav";

type LaneItem = {
  id: string;
  kind: "chore" | "task";
  title: string;
  description: string;
  points: number;
  labels: string[];
  done?: boolean;
  assigneeChildId: string | null;
  scheduledDays: number[];
  assignments: VisibleChore["assignments"];
  unassignedScheduleDays: number[];
};

type Lane = {
  id: string;
  name: string;
  avatarKey?: string | null;
  accent: string;
  subtitle: string;
  items: LaneItem[];
  emptyMessage: string;
  showRewards?: boolean;
};

type DashboardPageProps = {
  dashboardData: DashboardResponse | null;
  loading: boolean;
  error: string | null;
  addModalOpen: boolean;
  addSubmitting: boolean;
  addError: string | null;
  onOpenAddModal: () => void;
  onCloseAddModal: () => void;
  onSubmitChore: (input: CreateChoreInput) => Promise<void>;
  onSubmitTask: (input: CreateTaskInput) => Promise<void>;
  detailModalChoreId: string | null;
  detailAssignmentChildId: string | null;
  detailSubmitting: boolean;
  detailError: string | null;
  highlightedChoreId: string | null;
  successMessage: string | null;
  isCurrentDay: boolean;
  dailyLabel: string;
  weeklyLabel: string;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onChangeView: (view: "daily" | "weekly") => void;
  onOpenDetails: (id: string) => void;
  onOpenManage: () => void;
  onOpenAvatarPicker: (child: Child) => void;
  onCloseDetails: () => void;
  onSubmitChoreUpdate: (id: string, input: UpdateChoreInput) => Promise<void>;
  onDeleteItem: (id: string, kind: "chore" | "task") => Promise<void>;
  assignmentPendingChoreId: string | null;
  onToggleComplete: (
    id: string,
    done: boolean,
    childId: string | null,
    kind: "chore" | "task"
  ) => Promise<void>;
  historyEntries: HistoryEntry[];
  historyLoading: boolean;
  historySubmitting: boolean;
  historyError: string | null;
  onOpenHistory: () => void;
  onAdjustPoints: (input: AdjustmentInput) => Promise<void>;
  rewardModalChildId: string | null;
  rewards: Reward[];
  rewardsLoading: boolean;
  rewardsError: string | null;
  redeemResult: RedeemRewardResult | null;
  onOpenRewards: (childId: string) => void;
  onCloseRewards: () => void;
  onRedeemReward: (rewardId: string) => Promise<void>;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const accentPalette = ["var(--lane-1)", "var(--lane-2)", "var(--lane-3)"];
function formatScheduleLabels(days: number[]) {
  if (days.length === 0) {
    return ["Always available"];
  }

  if (days.length === 7) {
    return ["Daily"];
  }

  return days.map((day) => weekdayLabels[day]);
}

function toLaneItem(chore: VisibleChore): LaneItem {
  return {
    id: chore.id,
    kind: "chore",
    title: chore.title,
    description: chore.description,
    points: chore.pointValue,
    labels: [
      ...(chore.isCompletedToday ? ["Completed today"] : []),
      ...formatScheduleLabels(chore.scheduledDays)
    ],
    done: chore.isCompletedToday,
    assigneeChildId: chore.assigneeChildId,
    scheduledDays: chore.scheduledDays,
    assignments: chore.assignments,
    unassignedScheduleDays: chore.unassignedScheduleDays
  };
}

function toTaskLaneItem(task: VisibleTask): LaneItem {
  return {
    id: task.id,
    kind: "task",
    title: task.title,
    description: task.description,
    points: 0,
    labels: [task.isCompletedToday ? "Completed today" : "Task"],
    done: task.isCompletedToday,
    assigneeChildId: task.assigneeChildId,
    scheduledDays: [],
    assignments: [],
    unassignedScheduleDays: []
  };
}

function sortCompletedLast(items: LaneItem[]) {
  return items.sort((left, right) => Number(Boolean(left.done)) - Number(Boolean(right.done)));
}

function buildLanes(data: DashboardResponse | null): Lane[] {
  if (!data) {
    return [];
  }

  return [
    {
      id: "unassigned",
      name: "Unassigned",
      accent: "var(--lane-unassigned)",
      subtitle: `${data.unassignedChores.length} chores ready to assign`,
      items: data.unassignedChores.map(toLaneItem),
      emptyMessage: "Nothing waiting here."
    },
    ...data.children.map((child, index) => ({
      id: child.id,
      name: child.name,
      avatarKey: child.avatarKey,
      accent: accentPalette[index % accentPalette.length],
      subtitle: `${child.totalPoints} pts`,
      items: sortCompletedLast([
        ...child.tasks.map(toTaskLaneItem),
        ...child.chores.map(toLaneItem)
      ]),
      emptyMessage: "No visible chores today.",
      showRewards: true
    }))
  ];
}

function ProgressGoalBar({ goal }: { goal: ProgressGoal }) {
  const reached = goal.earnedPoints >= goal.targetPoints;

  return (
    <section className={`progress-goal-bar${reached ? " is-complete" : ""}`} aria-label="Family progress goal">
      <div className="progress-goal-copy">
        <span className="progress-goal-label">{reached ? "Goal reached" : "Family goal"}</span>
        <strong>{goal.name}</strong>
      </div>
      <div className="progress-goal-track" aria-hidden="true">
        <div
          className="progress-goal-fill"
          style={{ width: `${goal.percentComplete}%` }}
        />
      </div>
      <div className="progress-goal-points">
        <strong>{goal.earnedPoints}</strong>
        <span>/ {goal.targetPoints} pts</span>
      </div>
    </section>
  );
}

export function DashboardPage({
  dashboardData,
  loading,
  error,
  addModalOpen,
  addSubmitting,
  addError,
  onOpenAddModal,
  onCloseAddModal,
  onSubmitChore,
  onSubmitTask,
  detailModalChoreId,
  detailAssignmentChildId,
  detailSubmitting,
  detailError,
  highlightedChoreId,
  successMessage,
  isCurrentDay,
  dailyLabel,
  weeklyLabel,
  onPreviousDay,
  onNextDay,
  onToday,
  onChangeView,
  onOpenDetails,
  onOpenManage,
  onOpenAvatarPicker,
  onCloseDetails,
  onSubmitChoreUpdate,
  onDeleteItem,
  assignmentPendingChoreId,
  onToggleComplete,
  historyEntries,
  historyLoading,
  historySubmitting,
  historyError,
  onOpenHistory,
  onAdjustPoints,
  rewardModalChildId,
  rewards,
  rewardsLoading,
  rewardsError,
  redeemResult,
  onOpenRewards,
  onCloseRewards,
  onRedeemReward
}: DashboardPageProps) {
  const boardRef = useRef<HTMLElement | null>(null);
  const [boardScrollState, setBoardScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const [unassignedCollapsed, setUnassignedCollapsed] = useState(true);
  const lanes = buildLanes(dashboardData);
  const rewardChild = dashboardData?.children.find((child) => child.id === rewardModalChildId) ?? null;
  const allChores = lanes.flatMap((lane) => lane.items).filter((item) => item.kind === "chore");
  const detailLaneItem = allChores.find((item) => item.id === detailModalChoreId) ?? null;
  const detailChore = detailLaneItem
    ? {
        id: detailLaneItem.id,
        title: detailLaneItem.title,
        description: detailLaneItem.description,
        pointValue: detailLaneItem.points,
        assigneeChildId: detailLaneItem.assigneeChildId,
        isCompletedToday: detailLaneItem.done ?? false,
        scheduledDays: detailLaneItem.scheduledDays,
        assignments: detailLaneItem.assignments,
        unassignedScheduleDays: detailLaneItem.unassignedScheduleDays
      }
    : null;
  const scrollBoard = (direction: -1 | 1) => {
    const board = boardRef.current;
    if (!board) {
      return;
    }

    board.scrollBy({
      left: direction * Math.max(280, Math.round(board.clientWidth * 0.72)),
      behavior: "smooth"
    });
  };
  const updateBoardScrollState = () => {
    const board = boardRef.current;
    if (!board) {
      setBoardScrollState({ canScrollLeft: false, canScrollRight: false });
      return;
    }

    const maxScrollLeft = board.scrollWidth - board.clientWidth;
    setBoardScrollState({
      canScrollLeft: board.scrollLeft > 1,
      canScrollRight: board.scrollLeft < maxScrollLeft - 1
    });
  };

  useEffect(() => {
    updateBoardScrollState();
    window.addEventListener("resize", updateBoardScrollState);
    return () => window.removeEventListener("resize", updateBoardScrollState);
  }, [lanes.length, loading, error, unassignedCollapsed]);

  return (
    <div className="app-shell">
      <SpaceBackground />
      <QuestBackground />
      <GlobalNav title="Quest Board" onOpenManage={onOpenManage}>
        <PeriodNavigator
            view="daily"
            dailyLabel={dailyLabel}
            weeklyLabel={weeklyLabel}
            isToday={isCurrentDay}
            onPrevious={onPreviousDay}
            onNext={onNextDay}
            onToday={onToday}
            onChangeView={onChangeView}
        />
      </GlobalNav>

      <div className="status-stack">
        <div className="status-inline" aria-live="polite">
          {!loading && error && <strong>Unavailable: {error}</strong>}
          {!loading && !error && successMessage && <span className="success-toast">{successMessage}</span>}
        </div>

        {!loading && !error && dashboardData?.progressGoal && (
          <ProgressGoalBar goal={dashboardData.progressGoal} />
        )}
      </div>

      <div className="board-shell">
        {boardScrollState.canScrollLeft && (
          <button
            className="scroll-button board-scroll-button board-scroll-button-left"
            type="button"
            aria-label="Scroll lanes left"
            onClick={() => scrollBoard(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        )}
        <main className="board" aria-label="Chore board" ref={boardRef} onScroll={updateBoardScrollState}>
          {loading && (
            <>
              <section className="lane lane-skeleton" aria-hidden="true">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-subtitle" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
              </section>
              <section className="lane lane-skeleton" aria-hidden="true">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-subtitle" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
              </section>
            </>
          )}

          {!loading && !error && lanes.length === 0 && (
            <section className="lane lane-empty">
              <p className="empty-copy">No dashboard data found yet.</p>
            </section>
          )}

          {!loading &&
            !error &&
            lanes.map((lane) => (
              <BoardLane
                key={lane.id}
                id={lane.id}
                name={lane.name}
                avatarKey={lane.avatarKey}
                accent={lane.accent}
                subtitle={lane.subtitle}
                items={lane.items}
                emptyMessage={lane.emptyMessage}
                showRewards={lane.showRewards}
                collapsible={lane.id === "unassigned"}
                collapsed={lane.id === "unassigned" && unassignedCollapsed}
                onToggleCollapsed={
                  lane.id === "unassigned"
                    ? () => setUnassignedCollapsed((current) => !current)
                    : undefined
                }
                onOpenRewards={lane.showRewards ? () => onOpenRewards(lane.id) : undefined}
                onOpenAddChore={lane.id === "unassigned" ? onOpenAddModal : undefined}
                onOpenAvatarPicker={
                  lane.showRewards
                    ? () =>
                        onOpenAvatarPicker({
                          id: lane.id,
                          name: lane.name,
                          avatarKey: lane.avatarKey ?? null,
                          sortOrder: 0
                        })
                    : undefined
                }
                onDelete={onDeleteItem}
                onToggleComplete={isCurrentDay ? onToggleComplete : undefined}
                assignmentPendingChoreId={
                  lane.id === "unassigned" ? assignmentPendingChoreId : undefined
                }
                highlightedChoreId={highlightedChoreId}
                onOpenDetails={onOpenDetails}
              />
            ))}
        </main>
        {boardScrollState.canScrollRight && (
          <button
            className="scroll-button board-scroll-button board-scroll-button-right"
            type="button"
            aria-label="Scroll lanes right"
            onClick={() => scrollBoard(1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        )}
      </div>

      {addModalOpen && dashboardData && (
        <AddChoreModal
          children={dashboardData.children}
          submitting={addSubmitting}
          error={addError}
          onClose={onCloseAddModal}
          onSubmit={onSubmitChore}
          onSubmitTask={onSubmitTask}
        />
      )}

      {rewardChild && (
        <RewardModal
          child={rewardChild}
          rewards={rewards}
          submitting={rewardsLoading}
          error={rewardsError}
          redeemResult={redeemResult}
          onClose={onCloseRewards}
          onRedeem={onRedeemReward}
        />
      )}

      {detailChore && dashboardData && (
        <ChoreDetailModal
          chore={detailChore}
          children={dashboardData.children}
          submitting={detailSubmitting}
          error={detailError}
          initialAssignmentChildId={detailAssignmentChildId}
          currentDayOfWeek={dashboardData.dayOfWeek}
          onClose={onCloseDetails}
          onDelete={(id) => onDeleteItem(id, "chore")}
          onSubmit={onSubmitChoreUpdate}
        />
      )}

    </div>
  );
}
