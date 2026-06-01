import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { ChoreAssignment, CreateChoreInput, DashboardChild } from "../types";
import { useModalDismiss } from "./modalDismiss";
import { ChoreAssignmentEditor } from "./ChoreAssignmentEditor";

type AddChoreModalProps = {
  children: DashboardChild[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CreateChoreInput) => Promise<void>;
};

const allDays = [0, 1, 2, 3, 4, 5, 6];

export function AddChoreModal({
  children,
  submitting,
  error,
  onClose,
  onSubmit
}: AddChoreModalProps) {
  const [title, setTitle] = useState("");
  const { backdropProps, closeButtonProps } = useModalDismiss(onClose);
  const [description, setDescription] = useState("");
  const [pointValue, setPointValue] = useState("5");
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
  const [unassignedScheduleDays, setUnassignedScheduleDays] = useState<number[]>(allDays);

  const canSubmit = useMemo(() => title.trim().length > 0 && Number(pointValue) > 0, [
    title,
    pointValue
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await onSubmit({
      title,
      description,
      pointValue: Number(pointValue),
      assignments,
      unassignedScheduleDays: assignments.length === 0 ? unassignedScheduleDays : []
    });
  };

  return (
    <div className="modal-backdrop" {...backdropProps}>
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
          <button className="modal-close" type="button" aria-label="Close" {...closeButtonProps}>
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

          <label className="field">
            <span>Points</span>
            <input
              type="number"
              min="1"
              value={pointValue}
              onChange={(event) => setPointValue(event.target.value)}
            />
          </label>

          <ChoreAssignmentEditor
            children={children}
            assignments={assignments}
            unassignedScheduleDays={unassignedScheduleDays}
            onChangeAssignments={setAssignments}
            onChangeUnassignedScheduleDays={setUnassignedScheduleDays}
          />

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
