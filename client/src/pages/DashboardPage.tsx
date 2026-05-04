import type {
  AssignChildOption,
  CreateChoreInput,
  DashboardResponse,
  HealthResponse,
  HistoryEntry,
  RedeemRewardResult,
  Reward,
  UpdateChoreInput,
  VisibleChore
} from "../types";
import { AddChoreModal } from "../components/AddChoreModal";
import { BoardLane } from "../components/BoardLane";
import { ChoreDetailModal } from "../components/ChoreDetailModal";
import { HistoryModal } from "../components/HistoryModal";
import { RewardModal } from "../components/RewardModal";

type LaneItem = {
  id: string;
  title: string;
  description: string;
  points: number;
  meta: string;
  done?: boolean;
  assigneeChildId: string | null;
  scheduledDays: number[];
};

type Lane = {
  id: string;
  name: string;
  accent: string;
  subtitle: string;
  items: LaneItem[];
  emptyMessage: string;
  showRewards?: boolean;
};

type DashboardPageProps = {
  health: HealthResponse | null;
  dashboardData: DashboardResponse | null;
  loading: boolean;
  error: string | null;
  addModalOpen: boolean;
  addSubmitting: boolean;
  addError: string | null;
  onOpenAddModal: () => void;
  onCloseAddModal: () => void;
  onSubmitChore: (input: CreateChoreInput) => Promise<void>;
  detailModalChoreId: string | null;
  detailSubmitting: boolean;
  detailError: string | null;
  onOpenDetails: (id: string) => void;
  onCloseDetails: () => void;
  onSubmitChoreUpdate: (id: string, input: UpdateChoreInput) => Promise<void>;
  onDeleteChore: (id: string) => Promise<void>;
  onAssignChore: (id: string, childId: string) => Promise<void>;
  onToggleComplete: (id: string, done: boolean) => Promise<void>;
  historyModalOpen: boolean;
  historyEntries: HistoryEntry[];
  historyLoading: boolean;
  historyError: string | null;
  onOpenHistory: () => void;
  onCloseHistory: () => void;
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

function formatSchedule(days: number[]) {
  if (days.length === 0) {
    return "Always available";
  }

  return days.map((day) => weekdayLabels[day]).join(", ");
}

function toLaneItem(chore: VisibleChore): LaneItem {
  return {
    id: chore.id,
    title: chore.title,
    description: chore.description,
    points: chore.pointValue,
    meta: chore.isCompletedToday ? "Completed today" : formatSchedule(chore.scheduledDays),
    done: chore.isCompletedToday,
    assigneeChildId: chore.assigneeChildId,
    scheduledDays: chore.scheduledDays
  };
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
      accent: accentPalette[index % accentPalette.length],
      subtitle: `${child.totalPoints} pts`,
      items: child.chores.map(toLaneItem),
      emptyMessage: "No visible chores today.",
      showRewards: true
    }))
  ];
}

function formatBoardDate(data: DashboardResponse | null) {
  if (!data) {
    return "Waiting for today";
  }

  const [year, month, day] = data.currentDateLocal.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

export function DashboardPage({
  health,
  dashboardData,
  loading,
  error,
  addModalOpen,
  addSubmitting,
  addError,
  onOpenAddModal,
  onCloseAddModal,
  onSubmitChore,
  detailModalChoreId,
  detailSubmitting,
  detailError,
  onOpenDetails,
  onCloseDetails,
  onSubmitChoreUpdate,
  onDeleteChore,
  onAssignChore,
  onToggleComplete,
  historyModalOpen,
  historyEntries,
  historyLoading,
  historyError,
  onOpenHistory,
  onCloseHistory,
  rewardModalChildId,
  rewards,
  rewardsLoading,
  rewardsError,
  redeemResult,
  onOpenRewards,
  onCloseRewards,
  onRedeemReward
}: DashboardPageProps) {
  const lanes = buildLanes(dashboardData);
  const assignOptions: AssignChildOption[] =
    dashboardData?.children.map((child) => ({ id: child.id, name: child.name })) ?? [];
  const rewardChild = dashboardData?.children.find((child) => child.id === rewardModalChildId) ?? null;
  const allChores = lanes.flatMap((lane) => lane.items);
  const detailLaneItem = allChores.find((item) => item.id === detailModalChoreId) ?? null;
  const detailChore = detailLaneItem
    ? {
        id: detailLaneItem.id,
        title: detailLaneItem.title,
        description: detailLaneItem.description,
        pointValue: detailLaneItem.points,
        assigneeChildId: detailLaneItem.assigneeChildId,
        isCompletedToday: detailLaneItem.done ?? false,
        scheduledDays: detailLaneItem.scheduledDays
      }
    : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-copy">
          <div className="title-block">
            <p className="eyebrow">Phase 11</p>
            <h1>Chore Tracker</h1>
          </div>
          <p className="subtitle">
            A kiosk board for daily chores, point totals, and fast reward access.
          </p>
        </div>

        <div className="topbar-tools">
          <button className="text-button toolbar-button" type="button" onClick={onOpenHistory}>
            History
          </button>
          <div className="board-date" aria-label="Current board date">
            {formatBoardDate(dashboardData)}
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Add chore"
            onClick={onOpenAddModal}
          >
            +
          </button>
        </div>
      </header>

      <section className={`status-panel${error ? " is-error" : ""}`} aria-live="polite">
        <div className="status-copy">
          <span className="status-label">System</span>
          {loading && <strong>Loading dashboard...</strong>}
          {!loading && error && <strong>Unavailable: {error}</strong>}
          {!loading && !error && dashboardData && (
            <strong>
              {dashboardData.children.length} kids, {dashboardData.unassignedChores.length} unassigned
            </strong>
          )}
        </div>

        <div className="status-meta">
          {health ? (
            <>
              <span>{health.app}</span>
              <span>{health.databasePath}</span>
              <span>{new Date(health.timestamp).toLocaleString()}</span>
            </>
          ) : (
            <span>Waiting for local API</span>
          )}
        </div>
      </section>

      <main className="board" aria-label="Chore board">
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
              accent={lane.accent}
              subtitle={lane.subtitle}
              items={lane.items}
              emptyMessage={lane.emptyMessage}
              showRewards={lane.showRewards}
              onOpenRewards={lane.showRewards ? () => onOpenRewards(lane.id) : undefined}
              onDelete={onDeleteChore}
              onToggleComplete={onToggleComplete}
              assignOptions={lane.id === "unassigned" ? assignOptions : undefined}
              onAssign={lane.id === "unassigned" ? onAssignChore : undefined}
              onOpenDetails={onOpenDetails}
            />
          ))}
      </main>

      {addModalOpen && dashboardData && (
        <AddChoreModal
          children={dashboardData.children}
          submitting={addSubmitting}
          error={addError}
          onClose={onCloseAddModal}
          onSubmit={onSubmitChore}
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

      {historyModalOpen && (
        <HistoryModal
          entries={historyEntries}
          loading={historyLoading}
          error={historyError}
          onClose={onCloseHistory}
        />
      )}

      {detailChore && dashboardData && (
        <ChoreDetailModal
          chore={detailChore}
          children={dashboardData.children}
          submitting={detailSubmitting}
          error={detailError}
          onClose={onCloseDetails}
          onDelete={onDeleteChore}
          onSubmit={onSubmitChoreUpdate}
        />
      )}
    </div>
  );
}
