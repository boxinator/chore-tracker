import { ClipboardCheck, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "../components/Avatar";
import { ChoreDetailModal } from "../components/ChoreDetailModal";
import { QuestBackground } from "../components/QuestBackground";
import { SpaceBackground } from "../components/SpaceBackground";
import { PeriodNavigator } from "../components/PeriodNavigator";
import { GlobalNav } from "../components/GlobalNav";
import type { DashboardChild, UpdateChoreInput, VisibleChore, WeekCalendarResponse } from "../types";

type Props = {
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onNavigate: (path: string) => void;
  onOpenManage: () => void;
  onUpdateChore: (id: string, input: UpdateChoreInput) => Promise<void>;
  onDeleteChore: (id: string) => Promise<void>;
};

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function initialWeekStart() {
  const requested = new URLSearchParams(window.location.search).get("start");
  return formatDate(getWeekStart(requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? parseDate(requested) : new Date()));
}

function dayHeading(value: string) {
  return parseDate(value).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function weekRange(start: string, end: string) {
  return `${parseDate(start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${parseDate(end).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function WeeklyPage({ apiFetch, onNavigate, onOpenManage, onUpdateChore, onDeleteChore }: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [data, setData] = useState<WeekCalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChore, setSelectedChore] = useState<VisibleChore | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const children = useMemo<DashboardChild[]>(
    () => (data?.children ?? []).map((child) => ({ ...child, totalPoints: 0, chores: [], tasks: [] })),
    [data]
  );
  const childMap = useMemo(() => new Map((data?.children ?? []).map((child) => [child.id, child])), [data]);

  const fetchWeek = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/calendar/week?start=${weekStart}`);
      if (!response.ok) throw new Error(`Weekly calendar failed with ${response.status}`);
      setData((await response.json()) as WeekCalendarResponse);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    url.pathname = "/weekly";
    url.searchParams.set("start", weekStart);
    window.history.replaceState({}, "", url);
    void fetchWeek();
  }, [weekStart]);

  const moveWeek = (offset: number) => {
    const next = parseDate(weekStart);
    next.setDate(next.getDate() + offset * 7);
    setWeekStart(formatDate(next));
  };

  return (
    <div className="app-shell weekly-shell">
      <SpaceBackground />
      <QuestBackground />
      <GlobalNav title="Weekly View" onOpenManage={onOpenManage}>
        <PeriodNavigator
            view="weekly"
            dailyLabel={dayHeading(weekStart)}
            weeklyLabel={data ? weekRange(data.weekStartLocal, data.weekEndLocal) : weekStart}
            isToday={weekStart === formatDate(getWeekStart(new Date()))}
            onPrevious={() => moveWeek(-1)}
            onNext={() => moveWeek(1)}
            onToday={() => setWeekStart(formatDate(getWeekStart(new Date())))}
            onChangeView={() => onNavigate(`/daily?date=${weekStart}`)}
        />
      </GlobalNav>

      <div className="status-inline" aria-live="polite">{!loading && error && <strong>Unavailable: {error}</strong>}</div>

      <main className="weekly-content">
        <section className="week-grid" aria-label="Weekly chore calendar">
          {loading && Array.from({ length: 7 }, (_, index) => <section className="week-day week-day-skeleton" key={index} aria-hidden="true" />)}
          {!loading && data?.days.map((day) => (
            <section className="week-day" key={day.dateLocal}>
              <header className="week-day-header"><h2>{dayHeading(day.dateLocal)}</h2><span>{day.chores.length}</span></header>
              <div className="week-card-list">
                {day.chores.length === 0 && <p className="empty-copy">No scheduled chores.</p>}
                {day.chores.map((chore) => {
                  const child = chore.assigneeChildId ? childMap.get(chore.assigneeChildId) : null;
                  return (
                    <button className={`week-card${chore.isCompletedToday ? " is-done" : ""}`} type="button" key={`${chore.id}:${chore.assigneeChildId ?? "unassigned"}`} onClick={() => { setDetailError(null); setSelectedChore(chore); }}>
                      <span className="week-card-title">{chore.title}</span>
                      <span className="week-card-meta">
                        <span className="week-card-owner">{child && <Avatar avatarKey={child.avatarKey} name={child.name} size="sm" />}{child?.name ?? "Unassigned"}</span>
                        <span><Zap aria-hidden="true" />{chore.pointValue}</span>
                      </span>
                      {chore.isCompletedToday && <span className="week-card-complete">Completed</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </section>

        {!loading && data && (
          <section className="ongoing-section">
            <header className="ongoing-header"><ClipboardCheck aria-hidden="true" /><div><h2>Ongoing Tasks</h2><p>One-off tasks without a scheduled day.</p></div></header>
            <div className="ongoing-task-list">
              {data.ongoingTasks.length === 0 && <p className="empty-copy">No ongoing tasks.</p>}
              {data.ongoingTasks.map((task) => <article className="ongoing-task" key={task.id}><strong>{task.title}</strong><span>{childMap.get(task.assigneeChildId)?.name ?? "Unknown child"}</span>{task.description && <p>{task.description}</p>}</article>)}
            </div>
          </section>
        )}
      </main>

      {selectedChore && data && (
        <ChoreDetailModal
          chore={selectedChore}
          children={children}
          submitting={submitting}
          error={detailError}
          currentDayOfWeek={parseDate(weekStart).getDay()}
          onClose={() => setSelectedChore(null)}
          onDelete={async (id) => {
            if (!window.confirm("Delete this chore?")) return;
            try { setSubmitting(true); await onDeleteChore(id); setSelectedChore(null); await fetchWeek(); }
            catch (err) { setDetailError(err instanceof Error ? err.message : "Unknown error"); }
            finally { setSubmitting(false); }
          }}
          onSubmit={async (id, input) => {
            try { setSubmitting(true); await onUpdateChore(id, input); setSelectedChore(null); await fetchWeek(); }
            catch (err) { setDetailError(err instanceof Error ? err.message : "Unknown error"); }
            finally { setSubmitting(false); }
          }}
        />
      )}
    </div>
  );
}
