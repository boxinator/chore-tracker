import { useEffect, useMemo, useState } from "react";

type HealthResponse = {
  status: string;
  timestamp: string;
  app: string;
  databasePath: string;
};

type ChildPointTotal = {
  childId: string;
  name: string;
  totalPoints: number;
};

type VisibleChore = {
  id: string;
  title: string;
  description: string;
  pointValue: number;
  assigneeChildId: string | null;
  isCompletedToday: boolean;
  scheduledDays: number[];
};

type PhaseOneResponse = {
  totals: ChildPointTotal[];
  visibleChores: VisibleChore[];
};

type LaneItem = {
  id: string;
  title: string;
  points: number;
  meta: string;
  done?: boolean;
};

type Lane = {
  id: string;
  name: string;
  accent: string;
  subtitle: string;
  items: LaneItem[];
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const accentPalette = ["var(--lane-1)", "var(--lane-2)", "var(--lane-3)"];

function formatSchedule(days: number[]) {
  if (days.length === 0) {
    return "Always available";
  }

  return days.map((day) => weekdayLabels[day]).join(", ");
}

function buildLanes(data: PhaseOneResponse | null): Lane[] {
  if (!data) {
    return [];
  }

  const choresByChildId = new Map<string, LaneItem[]>();
  const unassigned: LaneItem[] = [];

  for (const chore of data.visibleChores) {
    const item: LaneItem = {
      id: chore.id,
      title: chore.title,
      points: chore.pointValue,
      meta: chore.isCompletedToday ? "Completed today" : formatSchedule(chore.scheduledDays),
      done: chore.isCompletedToday
    };

    if (chore.assigneeChildId) {
      const chores = choresByChildId.get(chore.assigneeChildId) ?? [];
      chores.push(item);
      choresByChildId.set(chore.assigneeChildId, chores);
    } else {
      unassigned.push(item);
    }
  }

  return [
    {
      id: "unassigned",
      name: "Unassigned",
      accent: "var(--lane-unassigned)",
      subtitle: `${unassigned.length} chores ready to assign`,
      items: unassigned
    },
    ...data.totals.map((child, index) => ({
      id: child.childId,
      name: child.name,
      accent: accentPalette[index % accentPalette.length],
      subtitle: `${child.totalPoints} pts`,
      items: choresByChildId.get(child.childId) ?? []
    }))
  ];
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [phaseOneData, setPhaseOneData] = useState<PhaseOneResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthResponse, phaseOneResponse] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/dev/phase1")
        ]);

        if (!healthResponse.ok) {
          throw new Error(`Health check failed with ${healthResponse.status}`);
        }

        if (!phaseOneResponse.ok) {
          throw new Error(`Phase 1 preview failed with ${phaseOneResponse.status}`);
        }

        setHealth((await healthResponse.json()) as HealthResponse);
        setPhaseOneData((await phaseOneResponse.json()) as PhaseOneResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const lanes = useMemo(() => buildLanes(phaseOneData), [phaseOneData]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 1</p>
          <h1>Chore Tracker</h1>
          <p className="subtitle">
            SQLite is wired in, seeded, and already driving the board preview.
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
              <span>{health.databasePath}</span>
              <span>{new Date(health.timestamp).toLocaleString()}</span>
            </>
          ) : (
            <span>Waiting for local API</span>
          )}
        </div>
      </section>

      <main className="board" aria-label="Chore lanes preview">
        {!loading && !error && lanes.length === 0 && (
          <section className="lane lane-empty">
            <p className="empty-copy">No seeded data found yet.</p>
          </section>
        )}

        {lanes.map((column) => (
          <section
            key={column.id}
            className="lane"
            style={{ ["--lane-accent" as string]: column.accent }}
          >
            <header className="lane-header">
              <div>
                <h2>{column.name}</h2>
                <p>{column.subtitle}</p>
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
                      {item.done ? "v" : ""}
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

              {column.items.length === 0 && (
                <p className="empty-copy">
                  {column.id === "unassigned"
                    ? "Nothing waiting here."
                    : "No visible chores today."}
                </p>
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
