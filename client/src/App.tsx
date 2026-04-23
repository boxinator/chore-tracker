import { useEffect, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import type { CreateChoreInput, DashboardResponse, HealthResponse } from "./types";

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [healthResponse, dashboardResponse] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/dashboard")
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

  const handleSubmitChore = async (input: CreateChoreInput) => {
    try {
      setAddSubmitting(true);
      setAddError(null);

      const response = await fetch("/api/chores", {
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

    const response = await fetch(`/api/chores/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? `Delete chore failed with ${response.status}`);
      return;
    }

    await fetchData();
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
    />
  );
}
