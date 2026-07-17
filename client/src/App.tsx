import { useEffect, useRef, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { WeeklyPage } from "./pages/WeeklyPage";
import { ManageModal } from "./components/ManageModal";
import { AvatarPickerModal } from "./components/AvatarPickerModal";
import { apiFetch, getJson, sendEmpty, sendJson, sendJsonForResult } from "./api";
import {
  formatDailyLabel,
  formatDate,
  formatWeeklyLabel,
  getAutoRefreshTrigger,
  getDateParam,
  getWeekStart,
  parseDate,
  reloadKioskForCurrentPeriod
} from "./dateUtils";
import type {
  AdjustmentInput,
  Child,
  ChildInput,
  CreateChoreInput,
  CreateTaskInput,
  DashboardResponse,
  HistoryEntry,
  ProgressGoal,
  ProgressGoalInput,
  RedeemRewardResult,
  Reward,
  RewardInput,
  UpdateChoreInput
} from "./types";

type ThemeName = "default" | "space" | "quest";
const themeCycle: ThemeName[] = ["space", "quest", "default"];
const themeLabels = { default: "Default", space: "Space", quest: "Quest" };

export function App() {
  const [route, setRoute] = useState(`${window.location.pathname}${window.location.search}`);
  const todayLocal = formatDate(new Date());
  const currentPath = window.location.pathname;
  const dailyDate = getDateParam("date", todayLocal);
  const [theme, setTheme] = useState<ThemeName>(() => {
    const storedTheme = window.localStorage.getItem("chore-theme");
    return themeCycle.includes(storedTheme as ThemeName) ? (storedTheme as ThemeName) : "space";
  });
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [detailModalChoreId, setDetailModalChoreId] = useState<string | null>(null);
  const [detailAssignmentChildId, setDetailAssignmentChildId] = useState<string | null>(null);
  const [detailSubmitting, setDetailSubmitting] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [assignmentPendingChoreId, setAssignmentPendingChoreId] = useState<string | null>(null);
  const [highlightedChoreId, setHighlightedChoreId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageSaving, setManageSaving] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [managedChildren, setManagedChildren] = useState<Child[]>([]);
  const [managedRewards, setManagedRewards] = useState<Reward[]>([]);
  const [managedProgressGoal, setManagedProgressGoal] = useState<ProgressGoal | null>(null);
  const [avatarPickerChild, setAvatarPickerChild] = useState<Child | null>(null);
  const [avatarPickerSaving, setAvatarPickerSaving] = useState(false);
  const [avatarPickerError, setAvatarPickerError] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySubmitting, setHistorySubmitting] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [rewardModalChildId, setRewardModalChildId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemRewardResult | null>(null);
  const [progressGoalCompleting, setProgressGoalCompleting] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);
  const initialRefreshCheck = new Date();
  const handledAutoRefreshDate = useRef<string | null>(
    initialRefreshCheck >= getAutoRefreshTrigger(initialRefreshCheck) ? formatDate(initialRefreshCheck) : null
  );

  const handleToggleTheme = () => {
    setTheme((current) => {
      const next = themeCycle[(themeCycle.indexOf(current) + 1) % themeCycle.length];
      window.localStorage.setItem("chore-theme", next);
      return next;
    });
  };

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState({}, "", `/daily?date=${todayLocal}`);
      setRoute(`/daily?date=${todayLocal}`);
    }

    const handlePopState = () => setRoute(`${window.location.pathname}${window.location.search}`);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const checkForAutoRefresh = () => {
      const now = new Date();
      const triggerDate = formatDate(now);

      if (now >= getAutoRefreshTrigger(now) && handledAutoRefreshDate.current !== triggerDate) {
        handledAutoRefreshDate.current = triggerDate;
        setRefreshCountdown(60);
      }
    };

    const intervalId = window.setInterval(checkForAutoRefresh, 15_000);
    checkForAutoRefresh();

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (refreshCountdown === null) {
      return;
    }

    if (refreshCountdown <= 0) {
      reloadKioskForCurrentPeriod();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRefreshCountdown((current) => (current === null ? null : current - 1));
    }, 1_000);

    return () => window.clearTimeout(timeoutId);
  }, [refreshCountdown]);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setRoute(path);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => {
      setSuccessMessage((current) => (current === message ? null : current));
    }, 2200);
  };

  const flashChore = (choreId: string) => {
    setHighlightedChoreId(choreId);
    window.setTimeout(() => {
      setHighlightedChoreId((current) => (current === choreId ? null : current));
    }, 1400);
  };

  const fetchData = async (date = dailyDate) => {
    try {
      setDashboardData(await getJson<DashboardResponse>(`/api/dashboard?date=${date}`, "Dashboard"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPath === "/daily" || currentPath === "/") {
      void fetchData(dailyDate);
    }
  }, [route]);

  const fetchRewards = async () => {
    const payload = await getJson<{ rewards: Reward[] }>("/api/rewards", "Rewards");
    setRewards(payload.rewards);
  };

  const fetchChildren = async () => {
    const payload = await getJson<{ children: Child[] }>("/api/children", "Children");
    setManagedChildren(payload.children);
  };

  const fetchManagedRewards = async () => {
    const payload = await getJson<{ rewards: Reward[] }>("/api/rewards?includeInactive=1", "Rewards");
    setManagedRewards(payload.rewards);
  };

  const fetchManagedProgressGoal = async () => {
    const payload = await getJson<{ progressGoal: ProgressGoal | null }>(
      "/api/progress-goals/active",
      "Progress goal"
    );
    setManagedProgressGoal(payload.progressGoal);
  };

  const fetchHistory = async () => {
    const payload = await getJson<{ entries: HistoryEntry[] }>("/api/history/recent?limit=20", "History");
    setHistoryEntries(payload.entries);
  };

  const handleSubmitChore = async (input: CreateChoreInput) => {
    try {
      setAddSubmitting(true);
      setAddError(null);

      await sendJson("/api/chores", "POST", input, "Create chore");

      setAddModalOpen(false);
      await fetchData();
      showSuccess("Chore added");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleSubmitTask = async (input: CreateTaskInput) => {
    try {
      setAddSubmitting(true);
      setAddError(null);

      await sendJson("/api/tasks", "POST", input, "Create task");

      setAddModalOpen(false);
      await fetchData();
      showSuccess("Task added");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, kind: "chore" | "task") => {
    if (!window.confirm(`Delete this ${kind}?`)) {
      return;
    }

    try {
      await sendEmpty(`/api/${kind === "task" ? "tasks" : "chores"}/${id}`, "DELETE", `Delete ${kind}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return;
    }

    if (kind === "chore") {
      setDetailModalChoreId(null);
      setDetailAssignmentChildId(null);
      setDetailError(null);
    }

    await fetchData();
    showSuccess(kind === "task" ? "Task deleted" : "Chore deleted");
  };

  const handleUpdateChore = async (id: string, input: UpdateChoreInput) => {
    try {
      setDetailSubmitting(true);
      setDetailError(null);

      await sendJson(`/api/chores/${id}`, "PATCH", input, "Update chore");

      setDetailModalChoreId(null);
      setDetailAssignmentChildId(null);
      await fetchData();
      flashChore(id);
      showSuccess("Chore updated");
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDetailSubmitting(false);
    }
  };

  const handleToggleComplete = async (
    id: string,
    done: boolean,
    childId: string | null,
    kind: "chore" | "task"
  ) => {
    if (kind === "chore" && !childId) {
      setError("Assign this chore before completing it");
      return;
    }

    try {
      const endpoint = done ? "uncomplete" : "complete";
      await sendJson(
        `/api/${kind === "task" ? "tasks" : "chores"}/${id}/${endpoint}`,
        "POST",
        kind === "chore" ? { childId } : {},
        `Update ${kind}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return;
    }

    await fetchData();
    flashChore(id);
    if (kind === "task") {
      showSuccess(done ? "Task marked active again" : "Task completed");
      return;
    }

    showSuccess(done ? "Chore marked active again" : "Chore completed");
  };

  const handleOpenRewards = async (childId: string) => {
    try {
      setRewardsError(null);
      setRedeemResult(null);
      setRewardsLoading(true);
      setRewardModalChildId(childId);
      await fetchRewards();
    } catch (err) {
      setRewardsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRewardsLoading(false);
    }
  };

  const handleOpenHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      await fetchHistory();
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAdjustPoints = async (input: AdjustmentInput) => {
    try {
      setHistorySubmitting(true);
      setHistoryError(null);
      await sendJson("/api/ledger/adjustments", "POST", input, "Point adjustment");

      await Promise.all([fetchData(), fetchHistory()]);
      showSuccess("Points adjusted");
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setHistorySubmitting(false);
    }
  };

  const refreshManagementData = async () => {
    await Promise.all([fetchChildren(), fetchManagedRewards(), fetchManagedProgressGoal()]);
  };

  const handleOpenManage = async () => {
    try {
      setManageModalOpen(true);
      setManageLoading(true);
      setManageError(null);
      await refreshManagementData();
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setManageLoading(false);
    }
  };

  const handleCreateChild = async (input: ChildInput) => {
    try {
      setManageSaving(true);
      setManageError(null);

      await sendJson("/api/children", "POST", input, "Create child");

      await Promise.all([fetchData(), refreshManagementData()]);
      showSuccess("Kid added");
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setManageSaving(false);
    }
  };

  const handleUpdateChild = async (childId: string, input: ChildInput) => {
    try {
      setManageSaving(true);
      setManageError(null);

      await sendJson(`/api/children/${childId}`, "PATCH", input, "Update child");

      await Promise.all([fetchData(), refreshManagementData()]);
      showSuccess("Kid updated");
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setManageSaving(false);
    }
  };

  const handleSelectAvatar = async (avatarKey: string) => {
    if (!avatarPickerChild) {
      return;
    }

    try {
      setAvatarPickerSaving(true);
      setAvatarPickerError(null);

      await sendJson(`/api/children/${avatarPickerChild.id}`, "PATCH", { avatarKey }, "Update avatar");

      await Promise.all([fetchData(), refreshManagementData()]);
      setAvatarPickerChild(null);
      showSuccess("Avatar updated");
    } catch (err) {
      setAvatarPickerError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAvatarPickerSaving(false);
    }
  };

  const handleCreateReward = async (input: RewardInput) => {
    try {
      setManageSaving(true);
      setManageError(null);

      await sendJson("/api/rewards", "POST", input, "Create reward");

      await Promise.all([fetchRewards(), refreshManagementData()]);
      showSuccess("Reward added");
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setManageSaving(false);
    }
  };

  const handleUpdateReward = async (rewardId: string, input: RewardInput) => {
    try {
      setManageSaving(true);
      setManageError(null);

      await sendJson(`/api/rewards/${rewardId}`, "PATCH", input, "Update reward");

      await Promise.all([fetchRewards(), refreshManagementData()]);
      showSuccess("Reward updated");
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setManageSaving(false);
    }
  };

  const handleDeactivateReward = async (rewardId: string) => {
    try {
      setManageSaving(true);
      setManageError(null);

      await sendEmpty(`/api/rewards/${rewardId}`, "DELETE", "Deactivate reward");

      await Promise.all([fetchRewards(), refreshManagementData()]);
      showSuccess("Reward deactivated");
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setManageSaving(false);
    }
  };

  const handleCreateProgressGoal = async (input: ProgressGoalInput) => {
    try {
      setManageSaving(true);
      setManageError(null);

      await sendJson("/api/progress-goals", "POST", input, "Create progress goal");

      await Promise.all([fetchData(), refreshManagementData()]);
      showSuccess("Progress goal created");
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setManageSaving(false);
    }
  };

  const handleUpdateProgressGoal = async (goalId: string, input: ProgressGoalInput) => {
    try {
      setManageSaving(true);
      setManageError(null);

      await sendJson(`/api/progress-goals/${goalId}`, "PATCH", input, "Update progress goal");

      await Promise.all([fetchData(), refreshManagementData()]);
      showSuccess("Progress goal updated");
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setManageSaving(false);
    }
  };

  const handleAwardProgressGoal = async (goalId: string) => {
    try {
      setManageSaving(true);
      setManageError(null);

      await sendEmpty(`/api/progress-goals/${goalId}/award`, "POST", "Award progress goal");

      await Promise.all([fetchData(), refreshManagementData()]);
      showSuccess("Progress goal awarded");
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setManageSaving(false);
    }
  };

  const handleCompleteProgressGoal = async (goalId: string) => {
    try {
      setProgressGoalCompleting(true);
      setError(null);

      await sendEmpty(`/api/progress-goals/${goalId}/award`, "POST", "Complete progress goal");

      await Promise.all([fetchData(), fetchManagedProgressGoal()]);
      showSuccess("Goal completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setProgressGoalCompleting(false);
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!rewardModalChildId) {
      return;
    }

    try {
      setRewardsLoading(true);
      setRewardsError(null);

      setRedeemResult(await sendJsonForResult<RedeemRewardResult>(
        `/api/rewards/${rewardId}/redeem`,
        "POST",
        { childId: rewardModalChildId },
        "Redeem reward"
      ));
      await fetchData();
      showSuccess("Reward redeemed");
      window.setTimeout(() => {
        setRewardModalChildId(null);
        setRewardsError(null);
        setRedeemResult(null);
      }, 700);
    } catch (err) {
      setRewardsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRewardsLoading(false);
    }
  };

  const handleWeeklyUpdateChore = async (id: string, input: UpdateChoreInput) => {
    await sendJson(`/api/chores/${id}`, "PATCH", input, "Update chore");

    await fetchData();
    showSuccess("Chore updated");
  };

  const handleWeeklyDeleteChore = async (id: string) => {
    await sendEmpty(`/api/chores/${id}`, "DELETE", "Delete chore");

    await fetchData();
    showSuccess("Chore deleted");
  };

  return (
    <div className="app-root" data-theme={theme}>
    {currentPath === "/weekly" ? (
      <WeeklyPage
        apiFetch={apiFetch}
        onNavigate={navigate}
        onOpenManage={() => void handleOpenManage()}
        onUpdateChore={handleWeeklyUpdateChore}
        onDeleteChore={handleWeeklyDeleteChore}
      />
    ) : (
    <DashboardPage
      dashboardData={dashboardData}
      loading={loading}
      error={error}
      addModalOpen={addModalOpen}
      addSubmitting={addSubmitting}
      addError={addError}
      onOpenAddModal={() => {
        setAddError(null);
        setAddModalOpen(true);
      }}
      onCloseAddModal={() => {
        if (addSubmitting) {
          return;
        }

        setAddError(null);
        setAddModalOpen(false);
      }}
      onSubmitChore={handleSubmitChore}
      onSubmitTask={handleSubmitTask}
      detailModalChoreId={detailModalChoreId}
      detailAssignmentChildId={detailAssignmentChildId}
      detailSubmitting={detailSubmitting}
      detailError={detailError}
      highlightedChoreId={highlightedChoreId}
      successMessage={successMessage}
      onOpenDetails={(id) => {
        setError(null);
        setDetailError(null);
        setDetailAssignmentChildId(null);
        setDetailModalChoreId(id);
      }}
      onOpenManage={() => {
        void handleOpenManage();
      }}
      onOpenAvatarPicker={(child) => {
        setAvatarPickerChild(child);
        setAvatarPickerError(null);
      }}
      onCloseDetails={() => {
        if (detailSubmitting) {
          return;
        }

        setDetailError(null);
        setDetailAssignmentChildId(null);
        setDetailModalChoreId(null);
      }}
      onSubmitChoreUpdate={handleUpdateChore}
      onDeleteItem={handleDeleteItem}
      assignmentPendingChoreId={assignmentPendingChoreId}
      onToggleComplete={handleToggleComplete}
      historyEntries={historyEntries}
      historyLoading={historyLoading}
      historySubmitting={historySubmitting}
      historyError={historyError}
      onOpenHistory={() => {
        void handleOpenHistory();
      }}
      onAdjustPoints={handleAdjustPoints}
      rewardModalChildId={rewardModalChildId}
      rewards={rewards}
      rewardsLoading={rewardsLoading}
      rewardsError={rewardsError}
      redeemResult={redeemResult}
      isCurrentDay={dailyDate === todayLocal}
      dailyLabel={formatDailyLabel(dailyDate)}
      weeklyLabel={formatWeeklyLabel(dailyDate)}
      onPreviousDay={() => {
        const previous = parseDate(dailyDate);
        previous.setDate(previous.getDate() - 1);
        navigate(`/daily?date=${formatDate(previous)}`);
      }}
      onNextDay={() => {
        const next = parseDate(dailyDate);
        next.setDate(next.getDate() + 1);
        navigate(`/daily?date=${formatDate(next)}`);
      }}
      onToday={() => navigate(`/daily?date=${todayLocal}`)}
      onChangeView={(view) => {
        if (view === "weekly") {
          navigate(`/weekly?start=${formatDate(getWeekStart(parseDate(dailyDate)))}`);
        }
      }}
      onOpenRewards={handleOpenRewards}
      onCloseRewards={() => {
        if (rewardsLoading) {
          return;
        }

        setRewardModalChildId(null);
        setRewardsError(null);
        setRedeemResult(null);
      }}
      onRedeemReward={handleRedeemReward}
      progressGoalCompleting={progressGoalCompleting}
      onCompleteProgressGoal={handleCompleteProgressGoal}
    />
    )}
    {manageModalOpen && (
      <ManageModal
        children={managedChildren}
        rewards={managedRewards}
        progressGoal={managedProgressGoal}
        dashboardChildren={dashboardData?.children ?? []}
        loading={manageLoading}
        error={manageError}
        saving={manageSaving}
        historyEntries={historyEntries}
        historyLoading={historyLoading}
        historySubmitting={historySubmitting}
        historyError={historyError}
        onClose={() => {
          if (manageSaving) return;
          setManageModalOpen(false);
          setManageError(null);
        }}
        onOpenAvatarPicker={(child) => {
          setAvatarPickerChild(child);
          setAvatarPickerError(null);
        }}
        themeLabel={themeLabels[theme]}
        onToggleTheme={handleToggleTheme}
        onCreateChild={handleCreateChild}
        onUpdateChild={handleUpdateChild}
        onCreateReward={handleCreateReward}
        onUpdateReward={handleUpdateReward}
        onDeactivateReward={handleDeactivateReward}
        onCreateProgressGoal={handleCreateProgressGoal}
        onUpdateProgressGoal={handleUpdateProgressGoal}
        onAwardProgressGoal={handleAwardProgressGoal}
        onOpenHistory={() => void handleOpenHistory()}
        onAdjustPoints={handleAdjustPoints}
      />
    )}
    {refreshCountdown !== null && (
      <div className="modal-backdrop auto-refresh-backdrop" role="presentation">
        <section
          className="modal auto-refresh-modal"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="auto-refresh-title"
        >
          <div className="modal-header">
            <div>
              <p className="modal-eyebrow">Daily refresh</p>
              <h2 id="auto-refresh-title">Kiosk refreshing in {refreshCountdown} seconds</h2>
            </div>
          </div>
          <p>The kiosk will reload to show the new day's chores and clear its current state.</p>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={() => setRefreshCountdown(null)}>
              Cancel
            </button>
          </div>
        </section>
      </div>
    )}
    {avatarPickerChild && (
      <AvatarPickerModal
        childName={avatarPickerChild.name}
        selectedAvatarKey={avatarPickerChild.avatarKey}
        saving={avatarPickerSaving}
        error={avatarPickerError}
        onClose={() => {
          if (avatarPickerSaving) return;
          setAvatarPickerChild(null);
          setAvatarPickerError(null);
        }}
        onSelect={(avatarKey) => void handleSelectAvatar(avatarKey)}
      />
    )}
    </div>
  );
}
