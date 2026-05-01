# Remaining Roadmap

## Current State

The local MVP is now in good shape:

- Dashboard loads from a real API
- SQLite persistence is working
- Chores can be added and deleted
- Unassigned chores can be assigned
- Assigned chores can be completed and uncompleted
- Point totals are derived from the ledger
- Rewards can be redeemed with affordability checks
- Unit/integration tests exist for core domain logic
- Playwright covers the happy path

The remaining work is mostly deployment, polish, and a few feature-completion passes.

## Recommended Next Releases

## Release 0.8: Docker Deployable

Goal:

- Make the app easy to run outside the dev environment.

Scope:

- Multi-stage `Dockerfile`
- `docker-compose.yml`
- Persistent volume for SQLite
- Production static serving
- Config documentation for `PORT`, `DATA_DIR`, `DATABASE_PATH`, and `TZ`
- Docker run instructions

Exit criteria:

- `docker build` succeeds
- `docker compose up` works
- Data survives container restart
- `/api/health` responds in container

## Release 0.9: Synology + Home Assistant Setup

Goal:

- Make the app easy to deploy in the intended household environment.

Scope:

- Synology Container Manager instructions
- Volume mount guidance for persistent DB storage
- Port mapping guidance
- Home Assistant iframe/Webpage card instructions
- Notes on trusted-home/no-auth assumptions

Exit criteria:

- README is enough for a fresh deployment
- Home Assistant can embed the app successfully

## Release 1.0: Kiosk UX Polish

Goal:

- Make the app feel finished on a wall tablet.

Scope:

- Better touch-target polish
- Faster and clearer success/error feedback
- More polished reward redemption flow
- More obvious disabled/blocked states
- Better empty states and visual hierarchy
- Smooth modal open/close feel

Exit criteria:

- App feels quick and legible on tablet
- No confusing state transitions
- Reward flow feels satisfying but fast

## Release 1.1: Chore Detail + Edit

Goal:

- Round out chore management so parents are not forced to delete/recreate chores.

Scope:

- Chore detail modal
- Edit title, description, points, assignee, schedule
- Keep existing completion/ledger rules intact

Exit criteria:

- Existing chores can be edited safely
- Schedule changes reflect correctly on dashboard

## Release 1.2: History View

Goal:

- Expose the audit trail that already exists in the ledger.

Scope:

- Recent activity modal/page
- Child-focused history filter
- Reward and chore entries shown in readable language

Exit criteria:

- Parents can see recent point changes without inspecting the DB

## Release 1.3: Better Assignment UX

Goal:

- Replace the practical assignment fallback with the more natural kiosk interaction.

Scope:

- Drag unassigned chore to child lane
- Keep current tap/select fallback if drag proves unreliable

Exit criteria:

- Assignment is fast and natural on the target device

## Release 1.4: Admin and Safety Pass

Goal:

- Reduce accidental destructive actions in the trusted-home environment.

Scope:

- Hidden or lightweight admin mode for delete/edit
- Stronger confirmations where needed
- Maybe parent-only gesture or PIN later if wanted

Exit criteria:

- Shared kiosk use feels safe enough for daily household use

## Release 1.5: Data Management

Goal:

- Remove the remaining seed-data dependency for day-to-day usage.

Scope:

- Child management UI
- Reward create/edit UI
- Optional export/import or backup guidance

Exit criteria:

- Household can manage core data from the UI

## Open Decisions

These do not block Docker, but they affect polish and future scope:

- Keep tap-to-assign as the primary interaction, or add drag-and-drop now?
- Add chore edit before history, or history before edit?
- Keep children/rewards seeded for v1, or expose management UI sooner?
- Add a hidden admin mode before Synology deployment, or after real household testing?

## Priority Order

Recommended order from here:

1. Docker packaging
2. Synology and Home Assistant deployment docs
3. Kiosk UX polish
4. Chore detail/edit
5. History view
6. Better assignment UX
7. Admin/safety pass
8. Child and reward management UI

## Risks To Watch

- Tablet drag-and-drop may feel worse than expected
- Local date behavior should eventually support explicit timezone config
- No-auth kiosk means destructive actions need careful UX
- The ledger is already correct enough to trust, so future work should avoid bypassing it
