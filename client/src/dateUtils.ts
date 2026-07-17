export function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function getDateParam(name: string, fallback: string) {
  const value = new URLSearchParams(window.location.search).get(name);
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export function formatDailyLabel(value: string) {
  return parseDate(value).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function formatWeeklyLabel(value: string) {
  const start = getWeekStart(parseDate(value));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function getAutoRefreshTrigger(date: Date) {
  const trigger = new Date(date);
  trigger.setHours(0, 1, 0, 0);
  return trigger;
}

export function reloadKioskForCurrentPeriod() {
  const now = new Date();

  if (window.location.pathname === "/weekly") {
    window.history.replaceState({}, "", `/weekly?start=${formatDate(getWeekStart(now))}`);
  } else {
    window.history.replaceState({}, "", `/daily?date=${formatDate(now)}`);
  }

  window.location.reload();
}
