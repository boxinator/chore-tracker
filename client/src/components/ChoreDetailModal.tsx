import { useMemo, useState } from "react";
import type { DashboardChild, UpdateChoreInput, VisibleChore } from "../types";

type ChoreDetailModalProps = {
  chore: VisibleChore;
  children: DashboardChild[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onDelete: (choreId: string) => Promise<void>;
  onSubmit: (choreId: string, input: UpdateChoreInput) => Promise<void>;
};

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

export function ChoreDetailModal({
  chore,
  children,
  submitting,
  error,
  onClose,
  onDelete,
  onSubmit
}: ChoreDetailModalProps) {
  const [title, setTitle] = useState(chore.title);
  const [description, setDescription] = useState(chore.description);
  const [pointValue, setPointValue] = useState(String(chore.pointValue));
  const [assigneeChildId, setAssigneeChildId] = useState(chore.assigneeChildId ?? "");
  const [scheduleDays, setScheduleDays] = useState<number[]>(chore.scheduledDays);

  const canSubmit = useMemo(() => title.trim().length > 0 && Number(pointValue) > 0, [
    pointValue,
    title
  ]);

  const toggleDay = (day: number) => {
    setScheduleDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort()
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await onSubmit(chore.id, {
      title,
      description,
      pointValue: Number(pointValue),
      assigneeChildId: assigneeChildId || null,
      scheduleDays
    });
  };

  const handleDelete = async () => {
    await onDelete(chore.id);
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chore-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="modal-eyebrow">Chore Details</p>
            <h2 id="chore-detail-title">{chore.title}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </header>

        <div className="detail-summary">
          <span className="points-pill">{chore.pointValue} pts</span>
          <span className={`detail-state${chore.isCompletedToday ? " is-done" : ""}`}>
            {chore.isCompletedToday ? "Completed today" : "Ready for today"}
          </span>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Points</span>
              <input
                type="number"
                min="1"
                value={pointValue}
                onChange={(event) => setPointValue(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Assignee</span>
              <select
                value={assigneeChildId}
                onChange={(event) => setAssigneeChildId(event.target.value)}
              >
                <option value="">Unassigned</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field">
            <span>Schedule</span>
            <div className="weekday-picker">
              {weekdayLabels.map((label, day) => {
                const selected = scheduleDays.includes(day);
                return (
                  <button
                    key={`${label}-${day}`}
                    className={`weekday-button${selected ? " is-selected" : ""}`}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={selected}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <footer className="modal-actions modal-actions-spread">
            <button
              className="icon-text-button danger-button"
              type="button"
              disabled={submitting}
              onClick={() => void handleDelete()}
            >
              Delete
            </button>

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={onClose}>
                Close
              </button>
              <button className="primary-button" type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
