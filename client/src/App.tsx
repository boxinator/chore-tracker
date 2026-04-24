import { useEffect, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import type {
  CreateChoreInput,
  DashboardResponse,
  HealthResponse,
  RedeemRewardResult,
  Reward,
  RewardsResponse
} from "./types";

async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    cache: "no-store",
    ...init
  });
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [rewardModalChildId, setRewardModalChildId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemRewardResult | null>(null);

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
  }, []);

  const fetchRewards = async () => {
    const response = await apiFetch("/api/rewards");

    if (!response.ok) {
      throw new Error(`Rewards failed with ${response.status}`);
    }

    const payload = (await response.json()) as RewardsResponse;
    setRewards(payload.rewards);
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

    await fetchData();
  };

  const handleAssignChore = async (id: string, childId: string) => {
    const response = await apiFetch(`/api/chores/${id}/assign`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ childId })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? `Assign chore failed with ${response.status}`);
      return;
    }

    await fetchData();
  };

  const handleToggleComplete = async (id: string, done: boolean) => {
    const endpoint = done ? "uncomplete" : "complete";
    const response = await apiFetch(`/api/chores/${id}/${endpoint}`, {
      method: "POST"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? `Update chore failed with ${response.status}`);
      return;
    }

    await fetchData();
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
      onDeleteChore={handleDeleteChore}
      onAssignChore={handleAssignChore}
      onToggleComplete={handleToggleComplete}
      rewardModalChildId={rewardModalChildId}
      rewards={rewards}
      rewardsLoading={rewardsLoading}
      rewardsError={rewardsError}
      redeemResult={redeemResult}
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
  );
}
