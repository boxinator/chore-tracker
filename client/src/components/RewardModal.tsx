import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, X, Zap } from "lucide-react";
import type { DashboardChild, RedeemRewardResult, Reward } from "../types";

type RewardModalProps = {
  child: DashboardChild;
  rewards: Reward[];
  submitting: boolean;
  error: string | null;
  redeemResult: RedeemRewardResult | null;
  onClose: () => void;
  onRedeem: (rewardId: string) => Promise<void>;
};

export function RewardModal({
  child,
  rewards,
  submitting,
  error,
  redeemResult,
  onClose,
  onRedeem
}: RewardModalProps) {
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const selectedReward = useMemo(
    () => rewards.find((reward) => reward.id === selectedRewardId) ?? null,
    [rewards, selectedRewardId]
  );

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="modal-eyebrow">Rewards</p>
            <h2 id="reward-modal-title">{child.name}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="reward-balance">{child.totalPoints} pts available</div>

        {!selectedReward && (
          <div className="reward-list">
            {rewards.map((reward) => {
              const affordable = child.totalPoints >= reward.cost;
              return (
                <button
                  key={reward.id}
                  className={`reward-card${affordable ? "" : " is-disabled"}`}
                  type="button"
                  disabled={!affordable}
                  onClick={() => setSelectedRewardId(reward.id)}
                >
                  <div>
                    <strong>{reward.name}</strong>
                    <p>{reward.description}</p>
                  </div>
                  <span className="points-pill">
                    <Zap aria-hidden="true" />
                    {reward.cost} pts
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selectedReward && (
          <div className="reward-detail">
            {!redeemResult && (
              <>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setSelectedRewardId(null)}
                >
                  <ArrowLeft aria-hidden="true" />
                  Back
                </button>
                <div className="reward-detail-copy">
                  <h3>{selectedReward.name}</h3>
                  <p>{selectedReward.description}</p>
                </div>
                <div className="reward-equation">
                  <span>{child.totalPoints}</span>
                  <span>-</span>
                  <span>{selectedReward.cost}</span>
                  <span>=</span>
                  <strong>{child.totalPoints - selectedReward.cost}</strong>
                </div>

                {error && <p className="form-error">{error}</p>}

                <div className="modal-actions">
                  <button className="secondary-button" type="button" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={submitting}
                    onClick={() => void onRedeem(selectedReward.id)}
                  >
                    {submitting ? "Redeeming..." : "Confirm"}
                  </button>
                </div>
              </>
            )}

            {redeemResult && (
              <div className="reward-success-panel">
                <p className="reward-success-label">Redeemed</p>
                <h3>
                  <CheckCircle2 aria-hidden="true" /> {selectedReward.name}
                </h3>
                <div className="reward-equation">
                  <span>{redeemResult.previousTotal}</span>
                  <span>-</span>
                  <span>{selectedReward.cost}</span>
                  <span>=</span>
                  <strong>{redeemResult.newTotal}</strong>
                </div>
                <p className="reward-success">Nice choice. New total is ready.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
