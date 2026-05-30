import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { CreateChoreInput, DashboardChild } from "../types";

type AddChoreModalProps = {
  children: DashboardChild[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CreateChoreInput) => Promise<void>;
};

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

export function AddChoreModal({
  children,
  submitting,
  error,
  onClose,
  onSubmit
}: AddChoreModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pointValue, setPointValue] = useState("5");
  const [assigneeChildId, setAssigneeChildId] = useState("");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);

  const canSubmit = useMemo(() => title.trim().length > 0 && Number(pointValue) > 0, [
    title,
    pointValue
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

    await onSubmit({
      title,
      description,
      pointValue: Number(pointValue),
      assigneeChildId: assigneeChildId || null,
      scheduleDays
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-chore-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="modal-eyebrow">New Chore</p>
            <h2 id="add-chore-title">Add chore</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              rows={3}
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

          <footer className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Saving..." : "Add Chore"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
