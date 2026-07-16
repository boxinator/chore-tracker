# Chore Tracker Architecture

This document describes the current engineering shape of Chore Tracker. It is meant for contributors who need to understand how the app is built, where behavior lives, and which invariants should be preserved.

## System Overview

Chore Tracker is a single-household web app with a React frontend, a small Express API, and a SQLite database. The production process serves both API routes and compiled frontend assets from one Node.js server.

Core architectural choices:

- The browser is API-driven; durable business state lives on the server.
- SQLite is the source of truth.
- Child point totals are derived from ledger entries, not stored as mutable balances.
- Chore completion is tracked per child and local date.
- One-off task completion is tracked separately but still appears in the ledger as zero-point audit entries.
- Chore and reward deletion are soft/deactivation flows so historical ledger context remains readable.
- The app does not implement authentication or authorization.

## Runtime Shape

Development:

- Vite serves the frontend on `5173`.
- Express serves the API on `3001`.
- Vite proxies API requests to Express.

Production:

- `npm run build` compiles the frontend into `client-dist` and the server into `dist/server`.
- `npm start` runs `node dist/server/index.js`.
- Express serves `/api/*` JSON routes.
- Express serves static frontend assets from `client-dist`.
- Non-API routes fall back to `index.html`.

Container runtime:

- The Docker image runs the same production Node process.
- `PORT` controls the server port inside the container.
- `DATA_DIR` defaults the SQLite database location.
- `DATABASE_PATH` can point directly at the SQLite file and overrides `DATA_DIR`.
- `TZ` should be set when weekday boundaries matter.
- The configured SQLite database must already be initialized, usually by copying `data/sample.db` to the runtime database path.

## Repository Layout

Important paths:

- `client/src/App.tsx`: top-level frontend state, API calls, modal orchestration, routing, theme state, and kiosk refresh handling.
- `client/src/pages/DashboardPage.tsx`: daily board composition.
- `client/src/pages/WeeklyPage.tsx`: weekly calendar composition.
- `client/src/components/`: reusable UI pieces and modals.
- `client/src/styles/`: global styles, tokens, component CSS, and themes.
- `client/src/types.ts`: frontend API/data contracts.
- `server/src/index.ts`: Express app, route registration, production static serving.
- `server/src/config.ts`: runtime configuration.
- `server/src/db/`: SQLite connection, schema initialization, and test helpers.
- `server/src/services/`: domain behavior for dashboard, calendar, chores, children, rewards, tasks, progress goals, ledger adjustments, and history.
- `e2e/`: Playwright coverage for browser-level flows.

## Frontend Architecture

The frontend keeps state local to `App.tsx` and fetches authoritative data from the API after mutations. There is no client-side state management library because the app has a small number of screens, shallow state ownership, and server-backed domain state.

Main frontend responsibilities:

- Load health, dashboard, weekly calendar, management, reward, and history data.
- Open and close modals.
- Submit create/edit/delete/complete/redeem/adjust requests.
- Refetch authoritative API data after successful mutations.
- Store selected visual theme in `localStorage`.
- Navigate between daily and weekly views using browser history.
- Prompt and reload the kiosk after the local daily boundary.

The board uses lanes:

- One unassigned lane for visible unassigned chores.
- One lane per child/person.
- Child lanes show avatar, point total, visible chores, visible tasks, and reward entry.

Chore scheduling and assignment are edited through the chore detail flow. A chore can have:

- No child assignments, with unassigned weekday availability.
- One or more child assignments, each with its own selected weekdays.
- A rotation rule that assigns the chore to one child at a time across selected weekdays.

## Backend Architecture

`server/src/index.ts` owns route wiring and delegates business behavior to service modules.

Service boundaries:

- `dashboard.ts`: builds the daily board payload, visible chore/task list, progress goal summary, and ledger-derived point totals.
- `calendar.ts`: builds the weekly calendar payload.
- `chores.ts`: validates chore input, creates/updates/deactivates chores, assigns chores, completes chores, and reverses completions.
- `children.ts`: creates, lists, and updates people/children.
- `tasks.ts`: creates/deactivates one-off tasks and records task completion state.
- `rewards.ts`: lists, creates, updates, deactivates, and redeems rewards.
- `progressGoals.ts`: manages the active shared progress goal.
- `ledgerAdjustments.ts`: creates manual point overrides as ledger entries.
- `history.ts`: reads recent ledger activity.

Input validation uses `zod` at service boundaries before database writes. Services throw typed validation errors that routes convert into `400` or `404` style responses where appropriate.

## Data Model

SQLite tables are initialized idempotently in `server/src/db/schema.ts`.

### `children`

Board lane owners.

Key fields:

- `id`
- `name`
- `avatar_key`
- `sort_order`
- `created_at`
- `updated_at`

### `chores`

Reusable chore definitions.

Key fields:

- `id`
- `title`
- `description`
- `point_value`
- `is_active`
- `created_at`
- `updated_at`

`assignee_child_id` still exists for migration compatibility, but active assignment behavior uses `chore_assignments` and rotation tables.

### `chore_schedule_days`

Weekdays when an unassigned chore is visible.

Key fields:

- `chore_id`
- `day_of_week`

Weekdays use `0 = Sunday` through `6 = Saturday`.

### `chore_assignments`

Per-child weekday assignment rows.

Key fields:

- `chore_id`
- `child_id`
- `day_of_week`

One chore can have rows for multiple children and multiple weekdays.

### `chore_rotations`

Rotation headers for chores that move across children.

Key fields:

- `id`
- `chore_id`
- `start_date_local`

### `chore_rotation_children`

Ordered child list for a rotation.

Key fields:

- `rotation_id`
- `child_id`
- `sort_order`

### `chore_rotation_days`

Weekdays when a rotation is active.

Key fields:

- `rotation_id`
- `day_of_week`

### `tasks`

One-off work items assigned to a child.

Key fields:

- `id`
- `title`
- `description`
- `assignee_child_id`
- `status`
- `completion_date_local`
- `completion_ledger_entry_id`
- `uncompletion_ledger_entry_id`
- `is_active`

Task completion creates zero-point ledger entries so the history can describe the action without changing balances.

### `progress_goals`

Shared household goal tracked from earned ledger points.

Key fields:

- `id`
- `name`
- `target_points`
- `start_date_local`
- `status`
- `awarded_at`

Only the latest active goal is displayed on the board.

### `chore_completions`

Per-child, per-local-date completion state.

Key fields:

- `chore_id`
- `child_id`
- `completion_date_local`
- `status`
- `ledger_entry_id`
- `reversal_ledger_entry_id`

Active completions use `status = 'completed'`. Undoing a completion changes the row to `status = 'reversed'` and links to a reversal ledger entry.

### `rewards`

Reward catalog entries.

Key fields:

- `id`
- `name`
- `description`
- `cost`
- `is_active`

Deactivated rewards remain in the database for management/history context.

### `ledger_entries`

Immutable point and audit events.

Key fields:

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

Point totals are derived with `SUM(point_delta)` grouped by child.

## Domain Rules

Point totals:

- Never write a mutable current balance.
- Read totals from `ledger_entries`.

Chore visibility:

- A chore is visible only when active for the selected local weekday.
- Unassigned chores use `chore_schedule_days`.
- Directly assigned chores use `chore_assignments`.
- Rotating chores use rotation children, rotation days, and start date to resolve the child for a given local date.

Completion:

- A chore can only be completed by a child assigned to that chore on the selected day.
- Completing a chore creates a `chore_completions` row and a positive `ledger_entries` row.
- Duplicate same-day completion is rejected by backend validation and database uniqueness.

Uncompletion:

- The original ledger entry is never deleted.
- The completion row is marked reversed.
- A negative reversal ledger entry is created and linked back to the original entry.

Tasks:

- Tasks are assigned to exactly one child.
- Tasks do not carry point values.
- Completing and uncompleting tasks writes zero-point ledger entries for history.

Reward redemption:

- Reward affordability is enforced server-side from ledger-derived totals.
- Redeeming a reward creates a negative ledger entry.
- Inactive rewards cannot be redeemed.

Progress goals:

- The active goal calculates earned points from ledger entries on or after its `start_date_local`.
- Reward redemptions are excluded from progress.
- Awarded goals remain stored but no longer appear as active.

Date handling:

- Server-local date controls dashboard visibility and completion state.
- `completion_date_local` is stored as `YYYY-MM-DD`.
- Daily and weekly views accept date query parameters and ask the API for the selected period.

## API Surface

Current routes:

- `GET /api/health`
- `GET /api/dashboard?date=YYYY-MM-DD`
- `GET /api/calendar/week?start=YYYY-MM-DD`
- `GET /api/children`
- `POST /api/children`
- `PATCH /api/children/:id`
- `POST /api/chores`
- `PATCH /api/chores/:id`
- `DELETE /api/chores/:id`
- `PATCH /api/chores/:id/assign`
- `POST /api/chores/:id/complete`
- `POST /api/chores/:id/uncomplete`
- `POST /api/tasks`
- `DELETE /api/tasks/:id`
- `POST /api/tasks/:id/complete`
- `POST /api/tasks/:id/uncomplete`
- `GET /api/rewards`
- `POST /api/rewards`
- `PATCH /api/rewards/:id`
- `DELETE /api/rewards/:id`
- `POST /api/rewards/:id/redeem`
- `GET /api/progress-goals/active`
- `POST /api/progress-goals`
- `PATCH /api/progress-goals/:id`
- `POST /api/progress-goals/:id/award`
- `GET /api/history/recent`
- `POST /api/ledger/adjustments`

Dashboard payloads are intentionally broad enough for the board to render without extra per-lane or per-card requests.

## Database Initialization And Schema Evolution

`setupDatabase` opens SQLite, verifies that the configured database is initialized, and applies idempotent schema setup.

Runtime startup does not seed an empty database. Fresh installations should copy `data/sample.db` to the configured database path before starting the app.

Current schema evolution is handled with idempotent SQL in `initializeSchema`, including compatibility migration from older direct assignee/schedule rows into newer assignment and rotation structures where those migrations exist.

## Testing

Test layers:

- Vitest covers service/domain behavior around dashboard queries, chores, children, rewards, tasks, progress goals, and history.
- Playwright covers browser-level flows.
- `MANUAL_QA_CHECKLIST.md` covers a practical manual pass for deployment or larger UI changes.

High-risk areas to test when changing behavior:

- Ledger entries and point totals.
- Completion reversal.
- Scheduled and rotating chore visibility by weekday.
- Task completion audit entries.
- Reward affordability enforcement.
- Progress goal calculation.
- Database persistence across restart.

## Deployment Assumptions

The production app is a stateful single-process web service because SQLite lives on local or mounted storage.

Operational assumptions:

- Run only one writer process against the SQLite database unless you intentionally validate a different topology.
- Put the database on persistent storage.
- Back up the SQLite database and WAL files.
- Use a reverse proxy or network controls if access needs to be restricted.
- Set `TZ` explicitly in container deployments where weekday scheduling matters.
