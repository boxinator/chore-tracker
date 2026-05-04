import { useMemo, useState } from "react";
import type { Child, ChildInput, Reward, RewardInput } from "../types";

type ManageModalProps = {
  children: Child[];
  rewards: Reward[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onCreateChild: (input: ChildInput) => Promise<void>;
  onUpdateChild: (childId: string, input: ChildInput) => Promise<void>;
  onCreateReward: (input: RewardInput) => Promise<void>;
  onUpdateReward: (rewardId: string, input: RewardInput) => Promise<void>;
  onDeactivateReward: (rewardId: string) => Promise<void>;
};

type TabKey = "children" | "rewards";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "children", label: "Kids" },
  { key: "rewards", label: "Rewards" }
];

export function ManageModal({
  children,
  rewards,
  loading,
  error,
  saving,
  onClose,
  onCreateChild,
  onUpdateChild,
  onCreateReward,
  onUpdateReward,
  onDeactivateReward
}: ManageModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("children");
  const [childDraftName, setChildDraftName] = useState("");
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildName, setEditingChildName] = useState("");
  const [rewardName, setRewardName] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [rewardCost, setRewardCost] = useState("10");
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editingRewardName, setEditingRewardName] = useState("");
  const [editingRewardDescription, setEditingRewardDescription] = useState("");
  const [editingRewardCost, setEditingRewardCost] = useState("10");

  const activeRewards = useMemo(() => rewards.filter((reward) => reward.isActive), [rewards]);
  const inactiveRewards = useMemo(() => rewards.filter((reward) => !reward.isActive), [rewards]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="modal-eyebrow">Manage</p>
            <h2 id="manage-modal-title">Household setup</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </header>

        <div className="segmented-control" role="tablist" aria-label="Management sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`segment-button${activeTab === tab.key ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}
        {loading && <p className="empty-copy">Loading management data...</p>}

        {!loading && activeTab === "children" && (
          <div className="manage-grid">
            <section className="manage-section">
              <header className="manage-section-header">
                <h3>Kids</h3>
                <p>Names and board columns update right away.</p>
              </header>

              <div className="manage-list">
                {children.map((child) => {
                  const editing = editingChildId === child.id;
                  return (
                    <article key={child.id} className="manage-item">
                      {!editing && (
                        <>
                          <div className="manage-copy">
                            <strong>{child.name}</strong>
                            <p>Column {child.sortOrder}</p>
                          </div>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              setEditingChildId(child.id);
                              setEditingChildName(child.name);
                            }}
                          >
                            Edit
                          </button>
                        </>
                      )}

                      {editing && (
                        <form
                          className="inline-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void onUpdateChild(child.id, { name: editingChildName })
                              .then(() => {
                                setEditingChildId(null);
                                setEditingChildName("");
                              })
                              .catch(() => undefined);
                          }}
                        >
                          <input
                            value={editingChildName}
                            onChange={(event) => setEditingChildName(event.target.value)}
                          />
                          <div className="inline-actions">
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => setEditingChildId(null)}
                            >
                              Cancel
                            </button>
                            <button className="primary-button" type="submit" disabled={saving}>
                              Save
                            </button>
                          </div>
                        </form>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="manage-section">
              <header className="manage-section-header">
                <h3>Add kid</h3>
                <p>New kids appear as a fresh column on the board.</p>
              </header>
              <form
                className="modal-form manage-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onCreateChild({ name: childDraftName })
                    .then(() => setChildDraftName(""))
                    .catch(() => undefined);
                }}
              >
                <label className="field">
                  <span>Name</span>
                  <input
                    value={childDraftName}
                    onChange={(event) => setChildDraftName(event.target.value)}
                  />
                </label>
                <div className="modal-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={saving || childDraftName.trim().length === 0}
                  >
                    Add Kid
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {!loading && activeTab === "rewards" && (
          <div className="manage-grid">
            <section className="manage-section">
              <header className="manage-section-header">
                <h3>Rewards</h3>
                <p>Active rewards show in each kid's reward list.</p>
              </header>

              <div className="manage-list">
                {activeRewards.map((reward) => {
                  const editing = editingRewardId === reward.id;
                  return (
                    <article key={reward.id} className="manage-item manage-item-stack">
                      {!editing && (
                        <>
                          <div className="manage-copy">
                            <strong>{reward.name}</strong>
                            <p>{reward.cost} pts · {reward.description || "No description yet"}</p>
                          </div>
                          <div className="inline-actions">
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => {
                                setEditingRewardId(reward.id);
                                setEditingRewardName(reward.name);
                                setEditingRewardDescription(reward.description);
                                setEditingRewardCost(String(reward.cost));
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="icon-text-button danger-button"
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                void onDeactivateReward(reward.id).catch(() => undefined)
                              }
                            >
                              Deactivate
                            </button>
                          </div>
                        </>
                      )}

                      {editing && (
                        <form
                          className="modal-form manage-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void onUpdateReward(reward.id, {
                              name: editingRewardName,
                              description: editingRewardDescription,
                              cost: Number(editingRewardCost)
                            })
                              .then(() => {
                                setEditingRewardId(null);
                                setEditingRewardName("");
                                setEditingRewardDescription("");
                                setEditingRewardCost("10");
                              })
                              .catch(() => undefined);
                          }}
                        >
                          <label className="field">
                            <span>Name</span>
                            <input
                              value={editingRewardName}
                              onChange={(event) => setEditingRewardName(event.target.value)}
                            />
                          </label>
                          <label className="field">
                            <span>Description</span>
                            <textarea
                              rows={3}
                              value={editingRewardDescription}
                              onChange={(event) =>
                                setEditingRewardDescription(event.target.value)
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Cost</span>
                            <input
                              type="number"
                              min="1"
                              value={editingRewardCost}
                              onChange={(event) => setEditingRewardCost(event.target.value)}
                            />
                          </label>
                          <div className="inline-actions">
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => setEditingRewardId(null)}
                            >
                              Cancel
                            </button>
                            <button className="primary-button" type="submit" disabled={saving}>
                              Save
                            </button>
                          </div>
                        </form>
                      )}
                    </article>
                  );
                })}

                {inactiveRewards.length > 0 && (
                  <div className="manage-inactive">
                    <strong>Inactive rewards</strong>
                    <div className="manage-list">
                      {inactiveRewards.map((reward) => (
                        <article key={reward.id} className="manage-item is-muted">
                          <div className="manage-copy">
                            <strong>{reward.name}</strong>
                            <p>{reward.cost} pts · Inactive</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="manage-section">
              <header className="manage-section-header">
                <h3>Add reward</h3>
                <p>New rewards become redeemable as soon as they're saved.</p>
              </header>
              <form
                className="modal-form manage-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onCreateReward({
                    name: rewardName,
                    description: rewardDescription,
                    cost: Number(rewardCost)
                  })
                    .then(() => {
                      setRewardName("");
                      setRewardDescription("");
                      setRewardCost("10");
                    })
                    .catch(() => undefined);
                }}
              >
                <label className="field">
                  <span>Name</span>
                  <input value={rewardName} onChange={(event) => setRewardName(event.target.value)} />
                </label>
                <label className="field">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={rewardDescription}
                    onChange={(event) => setRewardDescription(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Cost</span>
                  <input
                    type="number"
                    min="1"
                    value={rewardCost}
                    onChange={(event) => setRewardCost(event.target.value)}
                  />
                </label>
                <div className="modal-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={saving || rewardName.trim().length === 0 || Number(rewardCost) <= 0}
                  >
                    Add Reward
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
