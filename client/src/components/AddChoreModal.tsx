import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { ChoreAssignment, ChoreRotation, CreateChoreInput, CreateTaskInput, DashboardChild } from "../types";
import { useModalDismiss } from "./modalDismiss";
import { ChoreAssignmentEditor } from "./ChoreAssignmentEditor";

type AddChoreModalProps = {
  children: DashboardChild[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CreateChoreInput) => Promise<void>;
  onSubmitTask: (input: CreateTaskInput) => Promise<void>;
};

const allDays = [0, 1, 2, 3, 4, 5, 6];
type AddMode = "chore" | "task";

export function AddChoreModal({
  children,
  submitting,
  error,
  onClose,
  onSubmit,
  onSubmitTask
}: AddChoreModalProps) {
  const [mode, setMode] = useState<AddMode>("chore");
  const [title, setTitle] = useState("");
  const { backdropProps, closeButtonProps } = useModalDismiss(onClose);
  const [description, setDescription] = useState("");
  const [pointValue, setPointValue] = useState("5");
  const [taskChildId, setTaskChildId] = useState(children[0]?.id ?? "");
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
  const [unassignedScheduleDays, setUnassignedScheduleDays] = useState<number[]>(allDays);
  const [rotation, setRotation] = useState<ChoreRotation | null>(null);

  const canSubmit = useMemo(() => {
    if (mode === "task") {
      return title.trim().length > 0 && taskChildId.length > 0;
    }

    return (
      title.trim().length > 0 &&
      Number(pointValue) > 0 &&
      (!rotation || (rotation.childIds.length >= 2 && rotation.days.length > 0))
    );
  }, [
    mode,
    title,
    pointValue,
    taskChildId,
    rotation
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    if (mode === "task") {
      await onSubmitTask({
        title,
        description,
        childId: taskChildId
      });
      return;
    }

    await onSubmit({
        title,
        description,
        pointValue: Number(pointValue),
        assignments: rotation ? [] : assignments,
        unassignedScheduleDays: assignments.length === 0 && !rotation ? unassignedScheduleDays : [],
        rotation
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
            <p className="modal-eyebrow">New Item</p>
            <h2 id="add-chore-title">Add {mode}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Close" {...closeButtonProps}>
            <X aria-hidden="true" />
          </button>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="segmented-control" role="tablist" aria-label="Item type">
            <button
              className={`segment-button${mode === "chore" ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={mode === "chore"}
              onClick={() => setMode("chore")}
            >
              Chore
            </button>
            <button
              className={`segment-button${mode === "task" ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={mode === "task"}
              onClick={() => setMode("task")}
            >
              Task
            </button>
          </div>

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

          {mode === "chore" && (
            <>
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
            </>
          )}

          {mode === "task" && (
            <label className="field">
              <span>Assigned to</span>
              <select
                value={taskChildId}
                onChange={(event) => setTaskChildId(event.target.value)}
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <p className="form-error">{error}</p>}

          <footer className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Saving..." : `Add ${mode === "task" ? "Task" : "Chore"}`}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
