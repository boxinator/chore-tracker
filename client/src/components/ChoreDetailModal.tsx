import { useMemo, useState } from "react";
import { Trash2, X, Zap } from "lucide-react";
import type { ChoreAssignment, ChoreRotation, DashboardChild, UpdateChoreInput, VisibleChore } from "../types";
import { useModalDismiss } from "./modalDismiss";
import { ChoreAssignmentEditor } from "./ChoreAssignmentEditor";
import {
  buildChoreInput,
  getInitialDetailAssignments,
  getInitialUnassignedScheduleDays,
  isChoreDraftValid
} from "./choreForm";

type ChoreDetailModalProps = {
  chore: VisibleChore;
  children: DashboardChild[];
  submitting: boolean;
  error: string | null;
  initialAssignmentChildId?: string | null;
  currentDayOfWeek: number;
  onClose: () => void;
  onDelete: (choreId: string) => Promise<void>;
  onSubmit: (choreId: string, input: UpdateChoreInput) => Promise<void>;
};

export function ChoreDetailModal({
  chore,
  children,
  submitting,
  error,
  initialAssignmentChildId,
  currentDayOfWeek,
  onClose,
  onDelete,
  onSubmit
}: ChoreDetailModalProps) {
  const [title, setTitle] = useState(chore.title);
  const { backdropProps, closeButtonProps } = useModalDismiss(onClose);
  const [description, setDescription] = useState(chore.description);
  const [pointValue, setPointValue] = useState(String(chore.pointValue));
  const [assignments, setAssignments] = useState<ChoreAssignment[]>(() =>
    getInitialDetailAssignments(chore, initialAssignmentChildId, currentDayOfWeek)
  );
  const [unassignedScheduleDays, setUnassignedScheduleDays] = useState<number[]>(
    getInitialUnassignedScheduleDays(chore)
  );
  const [rotation, setRotation] = useState<ChoreRotation | null>(chore.rotation);

  const canSubmit = useMemo(() => isChoreDraftValid(title, pointValue, rotation), [
    pointValue,
    rotation,
    title
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await onSubmit(chore.id, buildChoreInput({
      title,
      description,
      pointValue,
      assignments,
      unassignedScheduleDays,
      rotation
    }));
  };

  const handleDelete = async () => {
    await onDelete(chore.id);
  };

  return (
    <div className="modal-backdrop" {...backdropProps}>
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
          <button className="modal-close" type="button" aria-label="Close" {...closeButtonProps}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="detail-summary">
          <span className="points-pill">
            <Zap aria-hidden="true" />
            {chore.pointValue} pts
          </span>
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
            rotation={rotation}
            onChangeAssignments={setAssignments}
            onChangeUnassignedScheduleDays={setUnassignedScheduleDays}
            onChangeRotation={setRotation}
          />

          {error && <p className="form-error">{error}</p>}

          <footer className="modal-actions modal-actions-spread">
            <button
              className="icon-text-button danger-button"
              type="button"
              disabled={submitting}
              onClick={() => void handleDelete()}
            >
              <Trash2 aria-hidden="true" />
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
