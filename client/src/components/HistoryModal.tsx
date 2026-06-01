import { X } from "lucide-react";
import type { HistoryEntry } from "../types";
import { useModalDismiss } from "./modalDismiss";

type HistoryModalProps = {
  entries: HistoryEntry[];
  loading: boolean;
  error: string | null;
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
    default:
      return `${entry.childName} updated ${entry.sourceName}`;
  }
}

function formatDelta(pointDelta: number) {
  return `${pointDelta > 0 ? "+" : ""}${pointDelta}`;
}

export function HistoryModal({ entries, loading, error, onClose }: HistoryModalProps) {
  const { backdropProps, closeButtonProps } = useModalDismiss(onClose);

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
