# Chore Tracker Implementation Plan

## Purpose

Build a minimal, durable chore-and-rewards kiosk app that can first run locally in a browser, then be packaged for Docker/Synology deployment, then polished through small follow-up releases.

The implementation should preserve the original product direction:

- Simple family chore board optimized for Home Assistant iframe or wall-tablet use
- No authentication for v1
- Durable SQLite-backed state
- Ledger-derived point totals
- Day-of-week recurring chores
- Reward redemption flow
- Small, understandable codebase that can be extended later

## Desired Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS Modules or plain scoped CSS files
- Native HTML drag-and-drop with pointer/touch fallback if needed
- Fetch-based API client; no heavy client state library for v1

Rationale:

- React + TypeScript + Vite is fast to build, easy to maintain, and well-suited to a kiosk-style single-page app.
- The app state is small enough that local component state plus API refetching should be sufficient.
- Avoiding a large UI framework keeps the interface lightweight and easier to tune for tablet usage.

### Backend

- Node.js
- TypeScript
- Express
- SQLite
- `better-sqlite3` for simple synchronous DB access
- `zod` for request validation

Rationale:

- Express is simple and familiar for a tiny local API.
- SQLite is ideal for single-household durable storage and Docker volume mounting.
- `better-sqlite3` keeps DB code straightforward for this scale.
- Validation at API boundaries prevents malformed kiosk/client requests from corrupting state.

### Testing

- Vitest for backend unit/integration tests
- React Testing Library for focused frontend component tests where useful
- Playwright for end-to-end MVP flow testing

Rationale:

- Backend tests should cover the highest-risk behavior: ledger entries, completion reversal, reward redemption, and scheduling.
- Playwright should verify the full kiosk flow in a real browser before Dockerization.
- Frontend unit tests should be selective, not exhaustive.

### Tooling

- ESLint
- Prettier
- TypeScript strict mode
- npm scripts for development, build, test, lint, and e2e

### Deployment

- Multi-stage Docker build
- Single container serving both frontend and API
- SQLite database stored in a mounted `/data` volume
- Configurable port
- Health endpoint for container checks

Recommended runtime:

- Build frontend to static files
- Compile backend TypeScript
- Express serves `/api/*` and frontend static assets
- SPA fallback serves `index.html`

## Application Architecture

## Directory Shape

Proposed structure:

```text
.
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── modals/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── main.tsx
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── db/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   └── tests/
├── e2e/
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

Alternative:

- A single Vite-root app with `src/` and `server/` at the repo root is also acceptable if it keeps scripts simpler.
- The important boundary is that API/business logic remains server-owned and frontend stays API-driven.

## Data Model

Use SQLite with migrations or an idempotent schema initializer for v1.

### Tables

`children`

- `id`
- `name`
- `sort_order`
- `created_at`
- `updated_at`

`chores`

- `id`
- `title`
- `description`
- `point_value`
- `assignee_child_id`
- `is_active`
- `created_at`
- `updated_at`

`chore_schedule_days`

- `id`
- `chore_id`
- `day_of_week`

Use numeric weekday values. Pick one convention and document it clearly. Recommended: `0 = Sunday` through `6 = Saturday`, matching JavaScript `Date.getDay()`.

`chore_completions`

- `id`
- `chore_id`
- `child_id`
- `completion_date_local`
- `completed_at`
- `reversed_at`
- `status`
- `ledger_entry_id`
- `reversal_ledger_entry_id`

`rewards`

- `id`
- `name`
- `description`
- `cost`
- `is_active`
- `created_at`
- `updated_at`

`ledger_entries`

- `id`
- `event_type`
- `child_id`
- `child_name_snapshot`
- `source_type`
- `source_id`
- `source_name_snapshot`
- `point_delta`
- `timestamp`
- `reversal_of_id`
- `metadata_json`

## Seed Data

For MVP development, seed data should include:

- 2-3 children
- Several unassigned chores
- Several assigned chores
- At least one scheduled chore
- 3-5 rewards with mixed costs

Child and reward management UI can be deferred. Seed/config data is enough for MVP if documented.

## API Surface

### Required MVP Endpoints

`GET /api/health`

- Returns a simple status payload for local and Docker verification.

`GET /api/dashboard`

- Returns children, point totals, assigned visible chores, and unassigned visible chores.
- Applies active-day schedule filtering.
- Includes current-day completion state.

`POST /api/chores`

- Adds a chore with title, optional description, point value, optional assignee, and optional schedule days.

`DELETE /api/chores/:id`

- Soft-deactivates a chore by setting `is_active = 0`.

`PATCH /api/chores/:id/assign`

- Assigns an unassigned chore to a child.

`POST /api/chores/:id/complete`

- Validates the chore is assigned, active, visible today, and not already completed today.
- Creates a chore completion.
- Creates a positive ledger entry.
- Returns updated dashboard or updated child/chore state.

`POST /api/chores/:id/uncomplete`

- Finds today’s active completion.
- Marks it reversed.
- Creates a negative ledger reversal entry.
- Returns updated dashboard or updated child/chore state.

`GET /api/rewards`

- Returns all active rewards.

`POST /api/rewards/:id/redeem`

- Accepts child id in request body.
- Verifies affordability from ledger-derived total.
- Creates negative ledger entry.
- Returns previous total and new total.

`GET /api/history/recent`

- Optional for MVP if time permits.
- Useful for validating the audit trail and debugging.

## Backend Service Rules

### Point Totals

- Never store current point balance as primary source of truth.
- Always derive totals from `SUM(ledger_entries.point_delta)`.

### Chore Completion

- Completion requires an assignee.
- A scheduled chore can only be completed on an active scheduled day.
- An unscheduled chore is always visible and can be completed once per local day.
- Repeated complete calls for the same chore/date should be rejected or return an idempotent no-op response.

### Chore Uncompletion

- Never delete the original ledger entry.
- Reverse by creating a new ledger entry with the opposite point delta.
- Mark the completion as reversed.

### Reward Redemption

- Unaffordable rewards must be rejected by the backend even if the frontend disables them.
- Redemption creates only a ledger entry in v1. No inventory or one-time restriction logic.

### Local Date Handling

- Use the server’s local timezone for v1.
- Store `completion_date_local` as `YYYY-MM-DD`.
- Add a clear later task for configurable timezone if needed for Docker deployments.

## Frontend MVP Scope

## Main Dashboard

Required:

- Header with app title and add-chore icon button
- Board layout with one unassigned lane and one lane per child
- Child point totals
- Reward button for each child
- Visible chore cards by schedule/day
- Completed chores remain visible and greyed out
- Loading and error states
- Lightweight toast or inline error feedback

## Chore Cards

Required:

- Title
- Point value
- Completion checkbox
- Schedule indicator when scheduled
- Delete icon with confirmation
- Tap card body to open detail modal

Rules:

- Unassigned chores show checkbox disabled or blocked.
- Checkbox toggle calls complete/uncomplete endpoint.
- Delete requires confirmation.

## Add Chore Modal

Required fields:

- Title
- Description
- Point value
- Optional assignee
- Optional schedule days

Schedule picker:

- Seven large day buttons
- Zero selected days means always available

## Chore Detail Modal

Required:

- Title
- Description
- Point value
- Assignee or unassigned state
- Schedule days
- Today’s completion state
- Delete action

Editing existing chores can be deferred unless it is very cheap after add/delete exists.

## Drag Assignment

MVP required:

- Drag unassigned chore onto child column to assign.

Implementation notes:

- Use pointer-friendly drag/drop.
- If native drag-and-drop is unreliable on the target tablet, add a tap-based fallback later:
  - Tap assign button on unassigned card
  - Choose child from a simple modal

## Reward Flow

Required:

- Reward button opens modal scoped to selected child.
- Reward list shows all active rewards.
- Affordable rewards are enabled.
- Unaffordable rewards are visible but disabled.
- Tapping an affordable reward opens detail confirmation.
- Detail view shows equation: `current points - cost = new total`.
- Confirm creates ledger entry.
- Show fast success animation and update point total.

## MVP Acceptance Criteria

The local browser MVP is complete when:

- App starts locally with one command.
- Dashboard loads seeded children, chores, rewards, and point totals.
- A parent can add a chore with optional assignee and schedule.
- Unassigned chores can be assigned to a child.
- Assigned chores can be completed.
- Completion creates a positive ledger entry.
- Completed chores can be unchecked.
- Uncompletion creates a negative reversal ledger entry.
- Point totals are derived from ledger entries.
- Scheduled chores appear only on active weekdays.
- Completed scheduled chores reset on the next valid scheduled day.
- Rewards can be redeemed by a child with enough points.
- Unaffordable rewards are disabled and backend-protected.
- Data survives server restart.
- At least one Playwright test covers add chore -> assign -> complete -> redeem.

## Implementation Phases

## Phase 0: Project Scaffold

Goal:

- Create the initial TypeScript app structure, dev scripts, and baseline styling.

Tasks:

- Initialize npm project.
- Add React/Vite/TypeScript client.
- Add Express/TypeScript server.
- Add shared dev command.
- Add lint/test/build scripts.
- Add simple `/api/health`.
- Render a basic dashboard shell.

Verification:

- `npm run dev` starts frontend and backend.
- Browser can load app locally.
- `/api/health` returns ok.
- `npm run build` succeeds.

## Phase 1: Database and Domain Core

Goal:

- Establish durable state, schema, seed data, and core service functions.

Tasks:

- Add SQLite connection and schema initialization.
- Add seed data path for children/rewards/sample chores.
- Implement child total derivation from ledger.
- Implement visible chore query for current local date.
- Add backend tests for totals and schedule visibility.

Verification:

- Restarting server preserves database file.
- Seed data appears once, not duplicated every run.
- Tests pass for point totals and active weekday filtering.

## Phase 2: Dashboard API

Goal:

- Return all data needed by the kiosk dashboard.

Tasks:

- Implement `GET /api/dashboard`.
- Include children with point totals and assigned visible chores.
- Include unassigned visible chores.
- Include completion state for today.
- Add error handling middleware.

Verification:

- API payload supports the full dashboard without extra round trips.
- Backend tests cover assigned, unassigned, completed, and scheduled chores.

## Phase 3: Dashboard UI

Goal:

- Build the main kiosk board.

Tasks:

- Implement `DashboardPage`.
- Implement `ChildColumn`.
- Implement `UnassignedColumn`.
- Implement `ChoreCard`.
- Add responsive board layout.
- Add loading, empty, and error states.
- Add touch-friendly visual styling.

Verification:

- Seed data renders clearly on desktop/tablet widths.
- Completed chores are visually distinct.
- No text overlap or cramped tap targets.

## Phase 4: Add and Delete Chores

Goal:

- Let parents create and remove chores from the kiosk.

Tasks:

- Implement `POST /api/chores`.
- Implement `DELETE /api/chores/:id` as soft delete.
- Build `AddChoreModal`.
- Build day-of-week picker.
- Add delete confirmation.
- Refresh dashboard after mutations.

Verification:

- Chores can be added with and without assignee.
- Chores can be added with and without schedule.
- Deleted chores disappear but existing ledger history remains intact.

## Phase 5: Assignment and Completion

Goal:

- Complete the central chore workflow.

Tasks:

- Implement assign endpoint.
- Implement complete endpoint.
- Implement uncomplete endpoint.
- Add drag unassigned chore to child column.
- Add checkbox complete/uncomplete behavior.
- Add blocked/disabled state for unassigned completion.
- Add backend tests for ledger and reversal rules.

Verification:

- Unassigned chore can be assigned.
- Assigned chore completion updates point total.
- Unchecking creates reversal and updates point total.
- Double-tap/double-submit does not duplicate points.

## Phase 6: Rewards

Goal:

- Complete the points redemption flow.

Tasks:

- Implement rewards endpoint.
- Implement redeem endpoint.
- Build `RewardListModal`.
- Build `RewardDetailModal`.
- Add affordability states.
- Add quick success animation/count transition.
- Refresh dashboard after redemption.

Verification:

- Affordable reward redemption subtracts points.
- Unaffordable reward cannot be selected and is rejected by backend.
- Equation displays correctly.
- Point total visibly updates after redemption.

## Phase 7: End-to-End Verification

Goal:

- Prove the MVP works in a real browser.

Tasks:

- Add Playwright.
- Add deterministic test database setup.
- Test dashboard load.
- Test add chore.
- Test assign chore.
- Test complete/uncomplete.
- Test reward redemption.
- Add a short manual QA checklist.

Verification:

- `npm run test` passes.
- `npm run e2e` passes.
- Manual browser pass confirms kiosk flow feels usable.

## Phase 8: Dockerization

Goal:

- Package the verified app as a deployable container.

Tasks:

- Add production build script.
- Add multi-stage `Dockerfile`.
- Add `docker-compose.yml`.
- Configure app to use `DATA_DIR` or `DATABASE_PATH`.
- Expose configurable `PORT`.
- Serve frontend and API from the same Express process.
- Add `/api/health` container healthcheck.
- Document volume mount for SQLite persistence.

Verification:

- `docker build` succeeds.
- `docker compose up` starts the app.
- App is reachable in browser.
- Data persists after container restart.
- Health endpoint works.

## Phase 9: Synology and Home Assistant Deployment Notes

Goal:

- Make deployment understandable without requiring code knowledge.

Tasks:

- Document Docker Compose deployment.
- Document Synology Container Manager setup:
  - Image/build source
  - Port mapping
  - Volume mapping for `/data`
  - Restart policy
- Document Home Assistant iframe/Webpage card setup.
- Note trusted-home/no-auth assumption.

Verification:

- README includes local, Docker, Synology, and Home Assistant instructions.
- A fresh checkout can be run locally or via Docker using documented commands.

## Release Plan

## Release 0.1: Local Skeleton

Includes:

- App scaffold
- API healthcheck
- Dashboard shell
- Build/dev scripts

Exit criteria:

- Local browser app runs.
- Build succeeds.

## Release 0.2: Data-Backed Dashboard

Includes:

- SQLite schema
- Seed data
- Dashboard endpoint
- Render children, chores, and totals

Exit criteria:

- Seed dashboard renders from SQLite.
- Point totals are ledger-derived.

## Release 0.3: Chore Management

Includes:

- Add chore
- Delete chore
- Schedule picker
- Detail modal

Exit criteria:

- Chores can be created and removed through UI.
- Scheduled chores follow visibility rules.

## Release 0.4: Assignment and Completion

Includes:

- Drag assignment
- Complete/uncomplete
- Ledger entries and reversals
- Point total updates

Exit criteria:

- Full chore completion flow works end to end.
- Double-submit protection exists.

## Release 0.5: Rewards

Includes:

- Reward list
- Reward detail
- Redemption
- Affordability enforcement
- Success animation

Exit criteria:

- Child can spend points on rewards.
- Backend prevents overspending.

## Release 0.6: MVP Verification

Includes:

- Backend tests
- E2E tests
- Manual QA pass
- README local usage

Exit criteria:

- MVP is verified locally.
- Major original planning goals are met.

## Release 0.7: Docker Deployable

Includes:

- Dockerfile
- Compose file
- Persistent `/data` volume
- Production static serving
- Synology/Home Assistant docs

Exit criteria:

- App can be deployed via Docker.
- Data persists across container restarts.

## Post-MVP Polish Backlog

Prioritize after Dockerized MVP:

- Tap-to-assign fallback for tablets where drag/drop feels poor
- Simple recent activity/history modal
- Chore edit flow
- Reward create/edit flow
- Child management UI
- Configurable timezone
- Hidden parent/admin mode for destructive actions
- Better celebration animation for completed chores
- Larger Home Assistant iframe polish pass
- Export/import or backup instructions for SQLite file
- Optional manual point adjustment event type

## Risk Areas

### Touch Drag-and-Drop

Native drag-and-drop can be inconsistent on some tablet browsers. Keep the MVP requirement, but be ready to add tap-to-assign as the reliable fallback.

### Local Date Boundaries

Recurring chores depend on local dates. Server-local timezone is acceptable for v1, but Docker deployments may need an explicit `TZ` setting or app-level timezone config.

### Ledger Correctness

Ledger behavior is the integrity core of the app. Completion, uncompletion, and reward redemption should have backend tests before Dockerization.

### Kiosk Destructive Actions

No auth means deletes are available to anyone at the kiosk. Use confirmation in v1 and consider hidden parent mode later.

## Definition of Done for MVP

The MVP is ready for Dockerization when:

- Full chore and reward flow works locally in a browser.
- SQLite persistence is confirmed.
- Ledger-derived point totals are confirmed.
- Scheduled chore visibility is confirmed.
- Backend tests cover domain rules.
- Playwright covers the main happy path.
- Manual QA checklist is complete.
- README explains local setup.

## Definition of Done for Docker Release

The Docker release is ready when:

- Image builds from clean checkout.
- Container starts with a documented command.
- SQLite database is stored on a mounted volume.
- App survives container restart with data intact.
- Health endpoint works.
- README includes Docker, Synology, and Home Assistant iframe instructions.
