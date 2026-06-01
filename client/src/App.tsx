import { useEffect, useMemo, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import type {
  Child,
  ChildInput,
  ChildrenResponse,
  CreateChoreInput,
  DashboardResponse,
  HealthResponse,
  HistoryEntry,
  HistoryResponse,
  RedeemRewardResult,
  Reward,
  RewardInput,
  RewardsResponse,
  UpdateChoreInput
} from "./types";

type ThemeName = "default" | "space" | "quest";
const themeCycle: ThemeName[] = ["space", "quest", "default"];

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInputValue(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function App() {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const storedTheme = window.localStorage.getItem("chore-theme");
    return themeCycle.includes(storedTheme as ThemeName) ? (storedTheme as ThemeName) : "space";
  });
  const [health, setHealth] = useState<HealthResponse | null>(null);
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
  const [avatarPickerChild, setAvatarPickerChild] = useState<Child | null>(null);
  const [avatarPickerSaving, setAvatarPickerSaving] = useState(false);
  const [avatarPickerError, setAvatarPickerError] = useState<string | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [debugTimeEnabled, setDebugTimeEnabled] = useState(false);
  const [debugDateInput, setDebugDateInput] = useState("");
  const [debugTimeInput, setDebugTimeInput] = useState("");
  const [rewardModalChildId, setRewardModalChildId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemRewardResult | null>(null);

  const debugNowIso = useMemo(() => {
    if (!debugTimeEnabled || !debugDateInput || !debugTimeInput) {
      return null;
    }

    const debugNow = new Date(`${debugDateInput}T${debugTimeInput}`);
    return Number.isNaN(debugNow.getTime()) ? null : debugNow.toISOString();
  }, [debugDateInput, debugTimeEnabled, debugTimeInput]);

  const debugPreview = useMemo(() => {
    if (!debugNowIso) {
      return "Using real time";
    }

    return new Date(debugNowIso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }, [debugNowIso]);

  const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);

    if (debugNowIso) {
      headers.set("X-Debug-Now", debugNowIso);
    }

    return fetch(input, {
      cache: "no-store",
      ...init,
      headers
    });
  };

  const handleToggleTheme = () => {
    setTheme((current) => {
      const next = themeCycle[(themeCycle.indexOf(current) + 1) % themeCycle.length];
      window.localStorage.setItem("chore-theme", next);
      return next;
    });
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

  const fetchData = async () => {
    try {
      const [healthResponse, dashboardResponse] = await Promise.all([
        apiFetch("/api/health"),
        apiFetch("/api/dashboard")
      ]);

      if (!healthResponse.ok) {
        throw new Error(`Health check failed with ${healthResponse.status}`);
      }

      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard failed with ${dashboardResponse.status}`);
      }

      setHealth((await healthResponse.json()) as HealthResponse);
      setDashboardData((await dashboardResponse.json()) as DashboardResponse);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [debugNowIso]);

  const fetchRewards = async () => {
    const response = await apiFetch("/api/rewards");

    if (!response.ok) {
      throw new Error(`Rewards failed with ${response.status}`);
    }

    const payload = (await response.json()) as RewardsResponse;
    setRewards(payload.rewards);
  };

  const fetchChildren = async () => {
    const response = await apiFetch("/api/children");

    if (!response.ok) {
      throw new Error(`Children failed with ${response.status}`);
    }

    const payload = (await response.json()) as ChildrenResponse;
    setManagedChildren(payload.children);
  };

  const fetchManagedRewards = async () => {
    const response = await apiFetch("/api/rewards?includeInactive=1");

    if (!response.ok) {
      throw new Error(`Rewards failed with ${response.status}`);
    }

    const payload = (await response.json()) as RewardsResponse;
    setManagedRewards(payload.rewards);
  };

  const fetchHistory = async () => {
    const response = await apiFetch("/api/history/recent?limit=20");

    if (!response.ok) {
      throw new Error(`History failed with ${response.status}`);
    }

    const payload = (await response.json()) as HistoryResponse;
    setHistoryEntries(payload.entries);
  };

  const handleSubmitChore = async (input: CreateChoreInput) => {
    try {
      setAddSubmitting(true);
      setAddError(null);

      const response = await apiFetch("/api/chores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Create chore failed with ${response.status}`);
      }

      setAddModalOpen(false);
      await fetchData();
      showSuccess("Chore added");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDeleteChore = async (id: string) => {
    if (!window.confirm("Delete this chore?")) {
      return;
    }

    const response = await apiFetch(`/api/chores/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? `Delete chore failed with ${response.status}`);
      return;
    }

    setDetailModalChoreId(null);
    setDetailAssignmentChildId(null);
    setDetailError(null);
    await fetchData();
    showSuccess("Chore deleted");
  };

  const handleUpdateChore = async (id: string, input: UpdateChoreInput) => {
    try {
      setDetailSubmitting(true);
      setDetailError(null);

      const response = await apiFetch(`/api/chores/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Update chore failed with ${response.status}`);
      }

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

  const handleToggleComplete = async (id: string, done: boolean, childId: string | null) => {
    if (!childId) {
      setError("Assign this chore before completing it");
      return;
    }

    const endpoint = done ? "uncomplete" : "complete";
    const response = await apiFetch(`/api/chores/${id}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ childId })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? `Update chore failed with ${response.status}`);
      return;
    }

    await fetchData();
    flashChore(id);
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
      setHistoryModalOpen(true);
      setHistoryLoading(true);
      setHistoryError(null);
      await fetchHistory();
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshManagementData = async () => {
    await Promise.all([fetchChildren(), fetchManagedRewards()]);
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

      const response = await apiFetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Create child failed with ${response.status}`);
      }

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

      const response = await apiFetch(`/api/children/${childId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Update child failed with ${response.status}`);
      }

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

      const response = await apiFetch(`/api/children/${avatarPickerChild.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarKey })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Update avatar failed with ${response.status}`);
      }

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

      const response = await apiFetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Create reward failed with ${response.status}`);
      }

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

      const response = await apiFetch(`/api/rewards/${rewardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Update reward failed with ${response.status}`);
      }

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

      const response = await apiFetch(`/api/rewards/${rewardId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Deactivate reward failed with ${response.status}`);
      }

      await Promise.all([fetchRewards(), refreshManagementData()]);
      showSuccess("Reward deactivated");
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setManageSaving(false);
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!rewardModalChildId) {
      return;
    }

    try {
      setRewardsLoading(true);
      setRewardsError(null);

      const response = await apiFetch(`/api/rewards/${rewardId}/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ childId: rewardModalChildId })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Redeem reward failed with ${response.status}`);
      }

      setRedeemResult((await response.json()) as RedeemRewardResult);
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

  return (
    <div className="app-root" data-theme={theme}>
    <DashboardPage
      health={health}
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
      detailModalChoreId={detailModalChoreId}
      detailAssignmentChildId={detailAssignmentChildId}
      detailSubmitting={detailSubmitting}
      detailError={detailError}
      highlightedChoreId={highlightedChoreId}
      successMessage={successMessage}
      manageModalOpen={manageModalOpen}
      manageChildren={managedChildren}
      manageRewards={managedRewards}
      manageLoading={manageLoading}
      manageSaving={manageSaving}
      manageError={manageError}
      onOpenDetails={(id) => {
        setError(null);
        setDetailError(null);
        setDetailAssignmentChildId(null);
        setDetailModalChoreId(id);
      }}
      onOpenManage={() => {
        void handleOpenManage();
      }}
      onCloseManage={() => {
        if (manageSaving) {
          return;
        }

        setManageModalOpen(false);
        setManageError(null);
      }}
      avatarPickerChild={avatarPickerChild}
      avatarPickerSaving={avatarPickerSaving}
      avatarPickerError={avatarPickerError}
      onOpenAvatarPicker={(child) => {
        setAvatarPickerChild(child);
        setAvatarPickerError(null);
      }}
      onCloseAvatarPicker={() => {
        if (avatarPickerSaving) {
          return;
        }

        setAvatarPickerChild(null);
        setAvatarPickerError(null);
      }}
      onSelectAvatar={handleSelectAvatar}
      onCreateChild={handleCreateChild}
      onUpdateChild={handleUpdateChild}
      onCreateReward={handleCreateReward}
      onUpdateReward={handleUpdateReward}
      onDeactivateReward={handleDeactivateReward}
      onCloseDetails={() => {
        if (detailSubmitting) {
          return;
        }

        setDetailError(null);
        setDetailAssignmentChildId(null);
        setDetailModalChoreId(null);
      }}
      onSubmitChoreUpdate={handleUpdateChore}
      onDeleteChore={handleDeleteChore}
      assignmentPendingChoreId={assignmentPendingChoreId}
      onToggleComplete={handleToggleComplete}
      historyModalOpen={historyModalOpen}
      historyEntries={historyEntries}
      historyLoading={historyLoading}
      historyError={historyError}
      debugTimeEnabled={debugTimeEnabled}
      debugDateInput={debugDateInput}
      debugTimeInput={debugTimeInput}
      debugPreview={debugPreview}
      onOpenHistory={() => {
        void handleOpenHistory();
      }}
      onToggleDebugTime={() => {
        setDebugTimeEnabled((current) => {
          const next = !current;

          if (next && (!debugDateInput || !debugTimeInput)) {
            const now = new Date();
            setDebugDateInput(formatDateInputValue(now));
            setDebugTimeInput(formatTimeInputValue(now));
          }

          return next;
        });
      }}
      onChangeDebugDate={setDebugDateInput}
      onChangeDebugTime={setDebugTimeInput}
      onResetDebugTime={() => {
        setDebugTimeEnabled(false);
        setDebugDateInput("");
        setDebugTimeInput("");
      }}
      onCloseHistory={() => {
        if (historyLoading) {
          return;
        }

        setHistoryModalOpen(false);
        setHistoryError(null);
      }}
      rewardModalChildId={rewardModalChildId}
      rewards={rewards}
      rewardsLoading={rewardsLoading}
      rewardsError={rewardsError}
      redeemResult={redeemResult}
      theme={theme}
      onToggleTheme={handleToggleTheme}
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
    />
    </div>
  );
}
