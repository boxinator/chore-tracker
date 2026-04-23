import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
  timestamp: string;
  app: string;
};

const previewColumns = [
  {
    id: "unassigned",
    name: "Unassigned",
    accent: "var(--lane-unassigned)",
    items: [
      { id: "c1", title: "Clear the table", points: 5, meta: "Always available" },
      { id: "c2", title: "Take out recycling", points: 8, meta: "Thu" }
    ]
  },
  {
    id: "sample-1",
    name: "Sample Child 1",
    accent: "var(--lane-1)",
    items: [
      { id: "c3", title: "Feed the cat", points: 4, meta: "Completed today", done: true },
      { id: "c4", title: "Put away laundry", points: 7, meta: "Mon, Thu" }
    ]
  },
  {
    id: "sample-2",
    name: "Sample Child 2",
    accent: "var(--lane-2)",
    items: [{ id: "c5", title: "Water plants", points: 6, meta: "Today" }]
  }
];

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/health");

        if (!response.ok) {
          throw new Error(`Health check failed with ${response.status}`);
        }

        const payload = (await response.json()) as HealthResponse;
        setHealth(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void fetchHealth();
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 0</p>
          <h1>Chore Tracker</h1>
          <p className="subtitle">
            A tap-friendly family kiosk for chores, points, and rewards.
          </p>
        </div>

        <button className="icon-button" type="button" aria-label="Add chore">
          +
        </button>
      </header>

      <section className="status-panel" aria-live="polite">
        <div className="status-copy">
          <span className="status-label">API</span>
          {loading && <strong>Checking server...</strong>}
          {!loading && error && <strong>Unavailable: {error}</strong>}
          {!loading && health && <strong>{health.status}</strong>}
        </div>

        <div className="status-meta">
          {health ? (
            <>
              <span>{health.app}</span>
              <span>{new Date(health.timestamp).toLocaleString()}</span>
            </>
          ) : (
            <span>Waiting for local API</span>
          )}
        </div>
      </section>

      <main className="board" aria-label="Chore lanes preview">
        {previewColumns.map((column) => (
          <section
            key={column.id}
            className="lane"
            style={{ ["--lane-accent" as string]: column.accent }}
          >
            <header className="lane-header">
              <div>
                <h2>{column.name}</h2>
                <p>{column.id === "unassigned" ? "Ready to assign" : "42 pts"}</p>
              </div>

              {column.id !== "unassigned" && (
                <button className="reward-button" type="button">
                  Rewards
                </button>
              )}
            </header>

            <div className="lane-list">
              {column.items.map((item) => (
                <article
                  key={item.id}
                  className={`chore-card${item.done ? " is-done" : ""}`}
                >
                  <div className="chore-topline">
                    <button
                      className="check-button"
                      type="button"
                      aria-label={item.done ? "Undo completed chore" : "Complete chore"}
                    >
                      {item.done ? "✓" : ""}
                    </button>
                    <div className="chore-copy">
                      <h3>{item.title}</h3>
                      <p>{item.meta}</p>
                    </div>
                  </div>

                  <div className="chore-footer">
                    <span className="points-pill">{item.points} pts</span>
                    <button className="text-button" type="button">
                      Details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

