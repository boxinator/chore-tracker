import { CalendarDays, ChevronLeft, ChevronRight, History, Settings, Wrench, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  Child,
  ChildInput,
  CreateChoreInput,
  CreateTaskInput,
  DashboardResponse,
  HealthResponse,
  HistoryEntry,
  RedeemRewardResult,
  Reward,
  RewardInput,
  UpdateChoreInput,
  VisibleChore,
  VisibleTask
} from "../types";
import { AddChoreModal } from "../components/AddChoreModal";
import { BoardLane } from "../components/BoardLane";
import { ChoreDetailModal } from "../components/ChoreDetailModal";
import { HistoryModal } from "../components/HistoryModal";
import { ManageModal } from "../components/ManageModal";
import { AvatarPickerModal } from "../components/AvatarPickerModal";
import { QuestBackground } from "../components/QuestBackground";
import { RewardModal } from "../components/RewardModal";
import { SpaceBackground } from "../components/SpaceBackground";

type LaneItem = {
  id: string;
  kind: "chore" | "task";
  title: string;
  description: string;
  points: number;
  meta: string;
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
  onSubmitTask: (input: CreateTaskInput) => Promise<void>;
  detailModalChoreId: string | null;
  detailAssignmentChildId: string | null;
  detailSubmitting: boolean;
  detailError: string | null;
  highlightedChoreId: string | null;
  successMessage: string | null;
  manageModalOpen: boolean;
  manageChildren: Child[];
  manageRewards: Reward[];
  manageLoading: boolean;
  manageSaving: boolean;
  manageError: string | null;
  theme: "default" | "space" | "quest";
  onToggleTheme: () => void;
  onOpenDetails: (id: string) => void;
  onOpenManage: () => void;
  onCloseManage: () => void;
  avatarPickerChild: Child | null;
  avatarPickerSaving: boolean;
  avatarPickerError: string | null;
  onOpenAvatarPicker: (child: Child) => void;
  onCloseAvatarPicker: () => void;
  onSelectAvatar: (avatarKey: string) => Promise<void>;
  onCreateChild: (input: ChildInput) => Promise<void>;
  onUpdateChild: (childId: string, input: ChildInput) => Promise<void>;
  onCreateReward: (input: RewardInput) => Promise<void>;
  onUpdateReward: (rewardId: string, input: RewardInput) => Promise<void>;
  onDeactivateReward: (rewardId: string) => Promise<void>;
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
  historyModalOpen: boolean;
  historyEntries: HistoryEntry[];
  historyLoading: boolean;
  historyError: string | null;
  debugTimeEnabled: boolean;
  debugDateInput: string;
  debugTimeInput: string;
  debugPreview: string;
  onOpenHistory: () => void;
  onToggleDebugTime: () => void;
  onChangeDebugDate: (value: string) => void;
  onChangeDebugTime: (value: string) => void;
  onResetDebugTime: () => void;
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
const themeLabels = {
  default: "Default",
  space: "Space",
  quest: "Quest"
};

function formatSchedule(days: number[]) {
  if (days.length === 0) {
    return "Always available";
  }

  return days.map((day) => weekdayLabels[day]).join(", ");
}

function toLaneItem(chore: VisibleChore): LaneItem {
  return {
    id: chore.id,
    kind: "chore",
    title: chore.title,
    description: chore.description,
    points: chore.pointValue,
    meta: chore.isCompletedToday ? "Completed today" : formatSchedule(chore.scheduledDays),
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
    meta: task.isCompletedToday ? "Completed today" : task.description || "Task",
    done: task.isCompletedToday,
    assigneeChildId: task.assigneeChildId,
    scheduledDays: [],
    assignments: [],
    unassignedScheduleDays: []
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
      avatarKey: child.avatarKey,
      accent: accentPalette[index % accentPalette.length],
      subtitle: `${child.totalPoints} pts`,
      items: [...child.tasks.map(toTaskLaneItem), ...child.chores.map(toLaneItem)],
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

type DebugDockProps = {
  health: HealthResponse | null;
  debugTimeEnabled: boolean;
  debugDateInput: string;
  debugTimeInput: string;
  debugPreview: string;
  onToggleDebugTime: () => void;
  onChangeDebugDate: (value: string) => void;
  onChangeDebugTime: (value: string) => void;
  onResetDebugTime: () => void;
};

function DebugDock({
  health,
  debugTimeEnabled,
  debugDateInput,
  debugTimeInput,
  debugPreview,
  onToggleDebugTime,
  onChangeDebugDate,
  onChangeDebugTime,
  onResetDebugTime
}: DebugDockProps) {
  const [minimized, setMinimized] = useState(true);

  if (minimized) {
    return (
      <aside className="debug-dock is-minimized" aria-label="Debug tools">
        <button
          className="debug-float-button"
          type="button"
          aria-label="Open debug tools"
          onClick={() => setMinimized(false)}
        >
          <Wrench aria-hidden="true" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="debug-dock" aria-label="Debug tools">
      <div className="debug-panel">
        <header className="debug-panel-header">
          <div className="debug-panel-title">
            <strong>Debug tools</strong>
            <span>Phase 14</span>
            <span>{debugPreview}</span>
          </div>
          <button
            className="modal-close"
            type="button"
            aria-label="Minimize debug tools"
            onClick={() => setMinimized(true)}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <label className="debug-toggle">
          <input type="checkbox" checked={debugTimeEnabled} onChange={onToggleDebugTime} />
          <span>Simulated time</span>
        </label>
        <div className="debug-time-row">
          <input
            className="debug-input"
            type="date"
            value={debugDateInput}
            disabled={!debugTimeEnabled}
            onChange={(event) => onChangeDebugDate(event.target.value)}
          />
          <input
            className="debug-input"
            type="time"
            value={debugTimeInput}
            disabled={!debugTimeEnabled}
            onChange={(event) => onChangeDebugTime(event.target.value)}
          />
          <button
            className="secondary-button debug-reset-button"
            type="button"
            onClick={onResetDebugTime}
          >
            Reset
          </button>
        </div>

        <div className="debug-health">
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
      </div>
    </aside>
  );
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
  onSubmitTask,
  detailModalChoreId,
  detailAssignmentChildId,
  detailSubmitting,
  detailError,
  highlightedChoreId,
  successMessage,
  manageModalOpen,
  manageChildren,
  manageRewards,
  manageLoading,
  manageSaving,
  manageError,
  theme,
  onToggleTheme,
  onOpenDetails,
  onOpenManage,
  onCloseManage,
  avatarPickerChild,
  avatarPickerSaving,
  avatarPickerError,
  onOpenAvatarPicker,
  onCloseAvatarPicker,
  onSelectAvatar,
  onCreateChild,
  onUpdateChild,
  onCreateReward,
  onUpdateReward,
  onDeactivateReward,
  onCloseDetails,
  onSubmitChoreUpdate,
  onDeleteItem,
  assignmentPendingChoreId,
  onToggleComplete,
  historyModalOpen,
  historyEntries,
  historyLoading,
  historyError,
  debugTimeEnabled,
  debugDateInput,
  debugTimeInput,
  debugPreview,
  onOpenHistory,
  onToggleDebugTime,
  onChangeDebugDate,
  onChangeDebugTime,
  onResetDebugTime,
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
  const boardRef = useRef<HTMLElement | null>(null);
  const [boardScrollState, setBoardScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
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
  }, [lanes.length, loading, error]);

  return (
    <div className="app-shell">
      <SpaceBackground />
      <QuestBackground />
      <header className="topbar">
        <div className="topbar-copy">
          <div className="title-block">
            <h1>Quest Board</h1>
          </div>
        </div>

        <div className="topbar-tools">
          <button
            className="text-button toolbar-button"
            type="button"
            aria-label="Manage"
            onClick={onOpenManage}
          >
            <Settings aria-hidden="true" />
            <span className="button-label-compact">Manage</span>
          </button>
          <div className="board-date" aria-label="Current board date">
            <CalendarDays aria-hidden="true" />
            {formatBoardDate(dashboardData)}
          </div>
        </div>
      </header>

      <div className="status-inline" aria-live="polite">
        {!loading && error && <strong>Unavailable: {error}</strong>}
        {!loading && !error && successMessage && <span className="success-toast">{successMessage}</span>}
        {debugTimeEnabled && <span className="status-meta">{debugPreview}</span>}
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
                onToggleComplete={onToggleComplete}
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

      {historyModalOpen && (
        <HistoryModal
          entries={historyEntries}
          loading={historyLoading}
          error={historyError}
          onClose={onCloseHistory}
        />
      )}

      {manageModalOpen && (
        <ManageModal
          children={manageChildren}
          rewards={manageRewards}
          loading={manageLoading}
          error={manageError}
          saving={manageSaving}
          onClose={onCloseManage}
          onOpenAvatarPicker={onOpenAvatarPicker}
          themeLabel={themeLabels[theme]}
          onToggleTheme={onToggleTheme}
          onCreateChild={onCreateChild}
          onUpdateChild={onUpdateChild}
          onCreateReward={onCreateReward}
          onUpdateReward={onUpdateReward}
          onDeactivateReward={onDeactivateReward}
        />
      )}

      {avatarPickerChild && (
        <AvatarPickerModal
          childName={avatarPickerChild.name}
          selectedAvatarKey={avatarPickerChild.avatarKey}
          saving={avatarPickerSaving}
          error={avatarPickerError}
          onClose={onCloseAvatarPicker}
          onSelect={(avatarKey) => {
            void onSelectAvatar(avatarKey);
          }}
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

      <div className="floating-tools" aria-label="Quick tools">
        <button
          className="floating-tool-button"
          type="button"
          aria-label="History"
          onClick={onOpenHistory}
        >
          <History aria-hidden="true" />
        </button>
        <DebugDock
          health={health}
          debugTimeEnabled={debugTimeEnabled}
          debugDateInput={debugDateInput}
          debugTimeInput={debugTimeInput}
          debugPreview={debugPreview}
          onToggleDebugTime={onToggleDebugTime}
          onChangeDebugDate={onChangeDebugDate}
          onChangeDebugTime={onChangeDebugTime}
          onResetDebugTime={onResetDebugTime}
        />
      </div>
    </div>
  );
}
