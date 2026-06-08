import { ChevronLeft, ChevronRight } from "lucide-react";

type PeriodNavigatorProps = {
  view: "daily" | "weekly";
  dailyLabel: string;
  weeklyLabel: string;
  isToday: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (view: "daily" | "weekly") => void;
};

export function PeriodNavigator({
  view,
  dailyLabel,
  weeklyLabel,
  isToday,
  onPrevious,
  onNext,
  onToday,
  onChangeView
}: PeriodNavigatorProps) {
  return (
    <div className="period-tools">
      <div className="period-navigator" aria-label="Calendar period navigation">
        <button className="period-arrow" type="button" aria-label={`Previous ${view === "daily" ? "day" : "week"}`} onClick={onPrevious}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <select
          className="period-select"
          aria-label="Calendar view"
          value={view}
          onChange={(event) => onChangeView(event.target.value as "daily" | "weekly")}
        >
          <option value="daily">Daily · {dailyLabel}</option>
          <option value="weekly">Weekly · {weeklyLabel}</option>
        </select>
        <button className="period-arrow" type="button" aria-label={`Next ${view === "daily" ? "day" : "week"}`} onClick={onNext}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <button
        className={`text-button toolbar-button${isToday ? " is-active" : ""}`}
        type="button"
        aria-pressed={isToday}
        onClick={onToday}
      >
        Today
      </button>
    </div>
  );
}
