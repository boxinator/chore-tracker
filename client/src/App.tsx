import { useEffect, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import type { DashboardResponse, HealthResponse } from "./types";

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  return (
    <DashboardPage
      health={health}
      dashboardData={dashboardData}
      loading={loading}
      error={error}
    />
  );
}
