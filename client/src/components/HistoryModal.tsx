import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { AdjustmentInput, DashboardChild, HistoryEntry } from "../types";
import { useModalDismiss } from "./modalDismiss";

type HistoryModalProps = {
  entries: HistoryEntry[];
  loading: boolean;
  error: string | null;
  children: DashboardChild[];
  submitting: boolean;
  onAdjust: (input: AdjustmentInput) => Promise<void>;
  onClose: () => void;
};

function describeEvent(entry: HistoryEntry) {
  switch (entry.eventType) {
    case "chore_complete":
      return `${entry.childName} completed ${entry.sourceName}`;
    case "chore_uncomplete":
      return `${entry.childName} undid ${entry.sourceName}`;
    case "reward_redeem":
      return `${entry.childName} redeemed ${entry.sourceName}`;
    case "manual_adjustment":
      return `${entry.childName}: ${entry.sourceName}`;
    default:
      return `${entry.childName} updated ${entry.sourceName}`;
  }
}

function formatDelta(pointDelta: number) {
  return `${pointDelta > 0 ? "+" : ""}${pointDelta}`;
}

export function HistoryModal({
  entries,
  loading,
  error,
  children,
  submitting,
  onAdjust,
  onClose
}: HistoryModalProps) {
  const { backdropProps, closeButtonProps } = useModalDismiss(onClose);
  const [formOpen, setFormOpen] = useState(false);
  const [childId, setChildId] = useState(children[0]?.id ?? "");
  const [operation, setOperation] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const selectedChild = useMemo(
    () => children.find((child) => child.id === childId) ?? null,
    [childId, children]
  );
  const numericAmount = Number(amount);
  const signedAmount = operation === "add" ? numericAmount : numericAmount * -1;
  const canSubmit =
    Boolean(selectedChild) &&
    Number.isInteger(numericAmount) &&
    numericAmount > 0 &&
    reason.trim().length >= 3;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    try {
      await onAdjust({
        childId,
        operation,
        amount: numericAmount,
        reason: reason.trim()
      });
      setAmount("");
      setReason("");
      setFormOpen(false);
    } catch {
      // The parent displays the API error while this form preserves the user's input.
    }
  };

  return (
    <div className="modal-backdrop" {...backdropProps}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="modal-eyebrow">Recent Activity</p>
            <h2 id="history-modal-title">Points history</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Close" {...closeButtonProps}>
            <X aria-hidden="true" />
          </button>
        </header>

        {!formOpen && (
          <button className="primary-button history-adjust-button" type="button" onClick={() => setFormOpen(true)}>
            <Plus aria-hidden="true" />
            Adjust points
          </button>
        )}

        {formOpen && (
          <form className="modal-form history-adjust-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="field-row">
              <label className="field">
                <span>Child</span>
                <select value={childId} onChange={(event) => setChildId(event.target.value)}>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Points</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
            </div>
            <div className="segmented-control history-operation" aria-label="Adjustment operation">
              <button className={`segment-button${operation === "add" ? " is-active" : ""}`} type="button" onClick={() => setOperation("add")}>Add</button>
              <button className={`segment-button${operation === "subtract" ? " is-active" : ""}`} type="button" onClick={() => setOperation("subtract")}>Subtract</button>
            </div>
            <label className="field">
              <span>Reason</span>
              <textarea maxLength={200} required value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            {selectedChild && numericAmount > 0 && (
              <p className="history-equation">
                {selectedChild.totalPoints} {operation === "add" ? "+" : "-"} {numericAmount} = {selectedChild.totalPoints + signedAmount}
              </p>
            )}
            <div className="modal-actions">
              <button className="secondary-button" type="button" disabled={submitting} onClick={() => setFormOpen(false)}>Cancel</button>
              <button className="primary-button" type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Saving..." : "Save adjustment"}
              </button>
            </div>
          </form>
        )}

        <div className="history-panel">
          {loading && <p className="empty-copy">Loading recent activity...</p>}
          {!loading && error && <p className="form-error">{error}</p>}
          {!loading && !error && entries.length === 0 && (
            <p className="empty-copy">No point activity yet.</p>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="history-list">
              {entries.map((entry) => (
                <article key={entry.id} className="history-entry">
                  <div className="history-copy">
                    <strong>{describeEvent(entry)}</strong>
                    <p>{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                  <span
                    className={`history-delta${entry.pointDelta < 0 ? " is-negative" : ""}`}
                  >
                    {formatDelta(entry.pointDelta)} pts
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
