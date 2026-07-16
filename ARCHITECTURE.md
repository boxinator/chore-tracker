# Chore Tracker Architecture

This document describes the current engineering shape of Chore Tracker. It is meant for contributors who need to understand how the app is built, where behavior lives, and which invariants should be preserved.

## System Overview

Chore Tracker is a single-household web app with a React frontend, a small Express API, and a SQLite database. The production process serves both API routes and compiled frontend assets from one Node.js server.

Core architectural choices:

- The browser is API-driven; durable business state lives on the server.
- SQLite is the source of truth.
- Child point totals are derived from ledger entries, not stored as mutable balances.
- Chore completion is tracked per child and local date.
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

## Repository Layout

Important paths:

- `client/src/App.tsx`: top-level frontend state, API calls, modal orchestration, theme/debug state.
- `client/src/pages/DashboardPage.tsx`: main board composition.
- `client/src/components/`: reusable UI pieces and modals.
- `client/src/styles/`: global styles, tokens, component CSS, and themes.
- `client/src/types.ts`: frontend API/data contracts.
- `server/src/index.ts`: Express app, route registration, production static serving.
- `server/src/config.ts`: runtime configuration.
- `server/src/db/`: SQLite connection, schema initialization, seed data, test helpers.
- `server/src/services/`: domain behavior for dashboard, chores, children, rewards, and history.
- `e2e/`: Playwright coverage for browser-level flows.

## Frontend Architecture

The frontend keeps state local to `App.tsx` and fetches authoritative data from the API after mutations. There is no client-side state management library.

Main frontend responsibilities:

- Load health and dashboard data.
- Open and close modals.
- Submit create/edit/delete/complete/redeem requests.
- Refetch dashboard data after successful mutations.
- Store selected visual theme in `localStorage`.
- Apply an optional `X-Debug-Now` header when simulated time is enabled.

The board uses lanes:

- One unassigned lane for visible unassigned chores.
- One lane per child/person.
- Child lanes show avatar, point total, visible chores, and reward entry.

Chore scheduling and assignment are edited through the chore detail flow. A chore can have:

- No child assignments, with unassigned weekday availability.
- One or more child assignments, each with its own selected weekdays.

## Backend Architecture

`server/src/index.ts` owns route wiring and delegates business behavior to service modules.

Service boundaries:

- `dashboard.ts`: builds the board payload, visible chore list, and ledger-derived point totals.
- `chores.ts`: validates chore input, creates/updates/deactivates chores, assigns chores, completes chores, and reverses completions.
- `children.ts`: creates, lists, and updates people/children.
- `rewards.ts`: lists, creates, updates, deactivates, and redeems rewards.
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

`assignee_child_id` still exists for migration compatibility, but active assignment behavior uses `chore_assignments`.

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

Immutable point events.

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

- A chore is visible only when active for the current local weekday.
- Unassigned chores use `chore_schedule_days`.
- Assigned chores use `chore_assignments`.

Completion:

- A chore can only be completed by a child assigned to that chore today.
- Completing a chore creates a `chore_completions` row and a positive `ledger_entries` row.
- Duplicate same-day completion is rejected by backend validation and database uniqueness.

Uncompletion:

- The original ledger entry is never deleted.
- The completion row is marked reversed.
- A negative reversal ledger entry is created and linked back to the original entry.

Reward redemption:

- Reward affordability is enforced server-side from ledger-derived totals.
- Redeeming a reward creates a negative ledger entry.
- Inactive rewards cannot be redeemed.

Date handling:

- Server-local date controls dashboard visibility and completion state.
- `completion_date_local` is stored as `YYYY-MM-DD`.
- Tests and debug tools can send `X-Debug-Now` to override effective current time for supported flows.

## API Surface

Current routes:

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/children`
- `POST /api/children`
- `PATCH /api/children/:id`
- `POST /api/chores`
- `PATCH /api/chores/:id`
- `DELETE /api/chores/:id`
- `PATCH /api/chores/:id/assign`
- `POST /api/chores/:id/complete`
- `POST /api/chores/:id/uncomplete`
- `GET /api/rewards`
- `POST /api/rewards`
- `PATCH /api/rewards/:id`
- `DELETE /api/rewards/:id`
- `POST /api/rewards/:id/redeem`
- `GET /api/history/recent`

Dashboard payloads are intentionally broad enough for the board to render without extra per-lane or per-card requests.

## Seeding And Schema Evolution

`setupDatabase` opens SQLite, initializes the schema, and runs seed data on startup.

Current schema evolution is handled with idempotent SQL in `initializeSchema`, including compatibility migration from older direct assignee/schedule rows into `chore_assignments`.

Seed data exists to make a fresh checkout immediately usable. Existing seed IDs may be updated by the seed routine.

## Testing

Test layers:

- Vitest covers service/domain behavior around dashboard queries, chores, children, rewards, and history.
- Playwright covers browser-level flows.
- `MANUAL_QA_CHECKLIST.md` covers a practical manual pass for deployment or larger UI changes.

High-risk areas to test when changing behavior:

- Ledger entries and point totals.
- Completion reversal.
- Scheduled chore visibility by weekday.
- Reward affordability enforcement.
- Database persistence across restart.

## Deployment Assumptions

The production app is a stateful single-process web service because SQLite lives on local or mounted storage.

Operational assumptions:

- Run only one writer process against the SQLite database unless you intentionally validate a different topology.
- Put the database on persistent storage.
- Back up the SQLite database and WAL files.
- Use a reverse proxy or network controls if access needs to be restricted.
- Set `TZ` explicitly in container deployments where weekday scheduling matters.
