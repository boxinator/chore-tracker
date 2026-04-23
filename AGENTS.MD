# Chore System for Home Assistant Kiosk

## Goal

Build a minimal chore-and-rewards web app intended to be embedded inside Home Assistant via iframe/Webpage card. The app should be optimized for kiosk/tablet use, require no auth, and prioritize a simple tap-friendly UI over feature breadth.

## Product Summary

The app is a family chore board with three core capabilities:

1. Show unassigned chores and chores assigned to each child.
2. Award points when chores are completed.
3. Let a child redeem points for rewards from a catalog.

The app is not a general task manager. It is a lightweight family kiosk app with persistent state, a points ledger, and recurring day-based chores.

## Non-Goals for v1

* Authentication or user accounts
* Parent approval workflow
* Multi-home or multi-family support
* Fine-grained permissions
* Complex schedules beyond day-of-week recurrence
* One-time reward restrictions
* Push notifications
* Rich analytics or reporting

## Core Users

### Kids

* View their assigned chores and point totals
* Mark chores complete or undo completion if done accidentally
* Redeem rewards using their points

### Parents

* Add chores
* Delete chores
* Assign chores by drag-and-drop
* Review point changes via log/history
* Later extend/edit the system

## Primary Use Context

* Runs as an embedded app inside Home Assistant
* Displayed on a wall tablet or kiosk device
* No login; anyone at the kiosk can interact
* Assumes trusted in-home usage

## Product Principles

* Minimal UI
* Large touch targets
* Fast interactions
* Low-friction editing for chores
* Visible point totals
* Satisfying but fast feedback animations
* State must be durable and auditable

## Core Concepts

### Child

A child has:

* id
* display name
* current point total (derived from ledger)
* assigned chores

### Chore Definition

A chore is a reusable definition with:

* id
* title
* description
* point value
* optional assignee
* optional day-of-week schedule
* created_at
* updated_at
* archived/deleted state if soft delete is later desired

### Reward Definition

A reward is a catalog item with:

* id
* name
* description
* cost
* active flag

For v1, rewards always remain available. No one-time/per-child restriction logic is included.

### Ledger Entry

All point changes must be represented as immutable ledger entries.
This includes:

* chore completion (+ points)
* chore uncompletion reversal (- points)
* reward redemption (- points)
* reward reversal if added later (+ points)

Point totals are derived from ledger entries, not edited directly.

### Daily Chore Instance State

Recurring chores need per-day completion state.
The app should distinguish between:

* a chore definition
* whether that chore is complete for the current scheduled day

## Main Dashboard View

This is the primary screen of the app.

### Purpose

Display:

* unassigned chores
* each child’s point total
* each child’s assigned chores
* reward entry point per child

### Layout

Recommended layout:

* one lane/column for unassigned chores
* one lane/column per child

Each child column shows:

* child name
* current point total
* reward button
* assigned chore cards

The unassigned column shows:

* all chores with no assignee

### Dashboard Actions

* Tap a chore card to open chore details
* Drag an unassigned chore onto a child to assign it
* Delete a chore with a trash icon
* Add a chore with a plus icon
* Check/uncheck a chore from its card
* Tap a child’s reward button to redeem a reward for that child

### Drag and Drop Scope for v1

Required:

* unassigned chore -> child

Optional for later:

* child -> different child
* child -> unassigned

For v1, only the required assignment flow needs to exist unless implementation cost is negligible.

## Chore Card UX

Each chore card should show at minimum:

* title
* point value
* completion checkbox
* optional schedule indicator if scheduled
* optional delete affordance if visible inline

### Completed State

When a chore is completed:

* it remains visible
* it is greyed out
* it can be unchecked to reverse completion

### Completion Behavior

* Anyone can mark any chore complete because this is a shared kiosk
* Points always go to the chore assignee
* Completion requires an assignee; if a chore is unassigned, the app should block completion or prompt assignment first

Recommended v1 rule:

* Unassigned chores cannot be completed until assigned

## Chore Detail View / Modal

Opened by tapping a chore card.

Should show:

* title
* description
* point value
* assignee or unassigned state
* selected weekdays if scheduled
* current completion state for today

Possible actions:

* close
* edit later if included in v1.1
* delete

## Add Chore Flow

Triggered by plus icon.

### Fields

* title (required)
* description (optional but supported)
* point value (required)
* assignee (optional)
* schedule (optional)

### Schedule Picker

Day-level granularity only for v1.

UI:

* seven selectable bubbles for days of week
* user can select any number of days
* zero selected days means unscheduled / always available

## Scheduling Rules

### v1 Scheduling Model

A chore may have zero or more weekdays selected.

Interpretation:

* No selected days: chore is always active
* One or more selected days: chore is active on those weekdays only

### Visibility Rules

For scheduled chores:

* On an active scheduled day, the chore is shown
* If not completed, it remains shown
* If completed, it remains shown but greyed out for the rest of that day
* On the next valid scheduled day, it reappears as incomplete

Example:

* Trash chore scheduled for Monday and Thursday
* Completed Monday -> greyed out Monday
* Tuesday/Wednesday -> not shown
* Thursday -> shown again as incomplete

### Daily Boundary

Use local device/app timezone. Since the app is intended for the household kiosk, local timezone should be configurable once or inferred from the server environment.

## Reward Flow

Rewards are accessed from a button inside each child’s column/card area.
This means the target child is known before entering the reward flow.

### Reward Entry

* User taps reward button for a specific child
* Reward modal opens already scoped to that child

### Reward List Modal

Shows all active rewards.
For each reward show:

* name
* cost
* optional short description preview if space permits

Affordability behavior:

* affordable rewards are enabled
* unaffordable rewards are disabled
* rewards are not hidden

### Reward Detail View

When a reward is tapped, open a detail state/modal that shows:

* reward name
* full description
* current points
* cost
* resulting total

This should be displayed like an equation:

* current points - cost = new total

Example:

* 42 - 15 = 27

### Reward Confirmation Behavior

On confirm:

* create a negative ledger entry
* update displayed point total
* animate from original total to new total
* show a brief success state
* auto-close quickly

Animation goal:

* satisfying but fast
* do not linger long enough to slow kiosk usage

Recommended behavior:

* 300–700ms count/transition
* 300–700ms success state
* close automatically

## Points Model

### Source of Truth

Point totals are derived from the ledger.
Do not store mutable current balances as the primary source of truth.

### Allowed Point Events in v1

* chore completion: positive delta
* chore uncompletion reversal: negative delta
* reward redemption: negative delta

### Future Point Events

Possible later additions:

* manual adjustment
* bonus points
* reversal of reward redemption

## Logging / Audit Trail

A persistent log is required.

### Why

* Needed for reversals
* Needed to derive point totals
* Needed for later history view/debugging
* Needed because chore/reward names may change over time

### Log Entry Requirements

The user proposed logging:

* type: chore | reward
* username
* name of chore/reward
* point delta
* timestamp

Recommended production shape is stronger:

* id
* event_type: chore_complete | chore_uncomplete | reward_redeem | reward_reverse
* child_id
* child_name_snapshot
* source_type: chore | reward
* source_id
* source_name_snapshot
* point_delta
* related_chore_completion_id or reversal_of_id when applicable
* timestamp
* metadata JSON (optional)

### Reversal Policy

Use reversal entries, never destructive mutation.
If a completed chore is unchecked:

* do not delete the original completion ledger entry
* instead create a reversal ledger entry with opposite delta

This preserves auditability.

## Data Model Recommendation

A small database is appropriate.

### Why a DB is justified

The app needs:

* durability
* recurring chore state
* audit log
* point totals from ledger
* future extensibility

### Recommended v1 DB

SQLite

Reasons:

* simple
* file-backed
* ideal for single-household local deployment
* works well in Docker on Synology
* enough for this scale

## Suggested Schema

### children

* id
* name
* sort_order
* created_at
* updated_at

### chores

* id
* title
* description
* point_value
* assignee_child_id nullable
* is_active
* created_at
* updated_at

### chore_schedule_days

* id
* chore_id
* day_of_week (0-6 or mon-sun enum)

Alternative: store selected days as JSON if simplicity is preferred.

### chore_completions

Represents a completion state for a chore on a specific active date.

* id
* chore_id
* child_id
* completion_date_local
* completed_at
* reversed_at nullable
* status (completed | reversed)

This table helps with daily schedule state.

### rewards

* id
* name
* description
* cost
* is_active
* created_at
* updated_at

### ledger_entries

* id
* event_type
* child_id
* child_name_snapshot
* source_type
* source_id
* source_name_snapshot
* point_delta
* timestamp
* reversal_of_id nullable
* metadata_json nullable

## Derived Data

### Child Point Total

`SUM(ledger_entries.point_delta) GROUP BY child_id`

### Current Day Visible Chores

A chore is visible when:

* it is active
* and either:

  * it has no schedule
  * or today’s weekday is included in its schedule

### Current Day Completion State

A visible chore is considered completed for today if there is a non-reversed completion record for that chore for today.

## API Recommendation

Although the app is frontend-first, it should not be browser-storage-only because data must persist and coordinate around a durable log.

Use a very small local API.

### Suggested stack options

Preferred:

* Frontend: React + TypeScript + Vite
* Backend: lightweight Node/TypeScript API
* DB: SQLite

Good backend options:

* Express
* Fastify
* Hono

Any is fine; optimize for speed of implementation.

### Suggested API Surface

#### Children

* `GET /api/children`
* `POST /api/children` (optional if child management is in scope later)
* `PATCH /api/children/:id` (optional)

#### Chores

* `GET /api/chores/dashboard`

  * returns unassigned chores, children with chores, point totals, and current-day completion state
* `POST /api/chores`
* `DELETE /api/chores/:id`
* `PATCH /api/chores/:id/assign`
* `PATCH /api/chores/:id/unassign` (optional)
* `POST /api/chores/:id/complete`
* `POST /api/chores/:id/uncomplete`

#### Rewards

* `GET /api/rewards`
* `POST /api/rewards/:id/redeem`

#### History

* `GET /api/ledger?childId=...&limit=...`
* `GET /api/history/recent` (optional summary endpoint)

### API Rules

#### Complete chore

Input:

* chore_id

Server behavior:

* verify chore is active today
* verify chore has assignee
* verify not already completed for today
* create chore_completion row
* create positive ledger entry
* return updated child total and chore state

#### Uncomplete chore

Input:

* chore_id

Server behavior:

* find today’s active completion
* mark completion reversed
* create negative reversal ledger entry
* return updated child total and chore state

#### Redeem reward

Input:

* reward_id
* child_id inferred by route or explicit payload

Server behavior:

* verify child has enough points
* create negative ledger entry
* return previous total and new total for animation

## Frontend Architecture

## App Shell

Single-screen app with modal overlays.

### Main pieces

* `DashboardPage`
* `ChildColumn`
* `UnassignedColumn`
* `ChoreCard`
* `AddChoreModal`
* `ChoreDetailModal`
* `RewardListModal`
* `RewardDetailModal`
* optional `HistoryModal` later

### Component Responsibilities

#### DashboardPage

* fetches dashboard payload
* manages modal open/close state
* coordinates optimistic vs confirmed refresh behavior

#### ChildColumn

* displays child name and point total
* hosts reward button
* displays assigned chores
* handles drop target behavior

#### ChoreCard

* shows title, points, checkbox
* greyed-out state when completed
* opens detail on tap
* delete affordance

#### RewardListModal

* receives current child context
* shows all rewards
* disables unaffordable ones

#### RewardDetailModal

* shows description and equation
* confirms purchase
* runs satisfying-but-fast success animation

## Interaction Details

### Touch and Kiosk Considerations

* large hit targets
* minimal text density
* avoid hover-only interactions
* avoid deep navigation stacks
* support fast recovery from accidental taps

### Completion Interaction

Recommended:

* tap checkbox to toggle
* checkbox action should not require entering detail modal
* after toggle, card visually updates immediately after success response

### Delete Interaction

Since kiosk mode is shared and delete is destructive, consider one of:

* quick confirm dialog
* press-and-hold later

Recommended v1:

* small confirm dialog before delete

## UI Style Direction

* Minimal
* Bright, readable, kid-friendly without feeling cartoon-heavy
* Clear visual separation between children
* Prominent point totals
* Greyscale completion state for done chores
* Consistent iconography for add, delete, reward

## Suggested Visual Structure

### Header

* app title (optional)
* add chore button

### Body

Horizontal scrollable board if needed:

* Unassigned
* Child 1
* Child 2
* Child 3

On larger tablet screens, all columns visible at once if possible.

## Persistence and Deployment

### Deployment Target

* Docker on Synology / Container Manager
* embedded in Home Assistant via iframe/Webpage card

### App Hosting

Recommended:

* single container serving frontend + API together
* SQLite DB stored on mounted volume

### Why not frontend-only local storage

Not sufficient because:

* data should survive browser/device changes
* points/logs need durability
* future HA integration may need API access

## Home Assistant Embedding Considerations

* Keep app responsive inside iframe/container card
* Avoid auth complexity
* Ensure headers allow embedding
* Keep routing simple; prefer single-page app with hash routing or clean server support

## Error Handling

### v1 expectations

* show lightweight toast or inline error on failed actions
* prevent double-submit on complete/redeem
* gracefully handle stale UI with refresh after mutation

## Edge Cases

### Unassigned scheduled chore on active day

* visible in unassigned lane
* cannot be completed until assigned

### Completed scheduled chore same day

* remains visible, greyed out
* can be unchecked

### Reward redemption with insufficient points

* disabled in reward list, should not be confirmable

### Chore renamed later

* old ledger entries still show old snapshot name

### Rapid double tap on completion

* backend should enforce idempotency for today’s completion state

## History View (Likely v1.1 or optional v1)

The system needs a log, but the main dashboard is the priority.
A simple history view can come later.

Potential views:

* recent activity feed
* per-child ledger view

## Recommended Implementation Order

1. Basic schema and API
2. Dashboard payload endpoint
3. Child columns + unassigned column
4. Add chore modal
5. Drag unassigned chore to child assignment
6. Chore completion/uncompletion
7. Ledger-derived point totals
8. Reward list modal
9. Reward detail + confirm + animation
10. Optional history screen

## Open Questions / Deferred Decisions

* Should assigned chores be draggable between children in v1?
* Should chores be editable in v1 or only add/delete?
* Should child management exist in-app or be seeded/configured manually?
* Do rewards need create/edit UI in v1 or can they be seeded initially?
* Should there be a hidden admin mode for destructive actions?

## Strong Recommendation

Treat this as a small DB-backed kiosk web app, not a Home Assistant-native data model. Use Home Assistant purely as the display shell and optional future automation layer.

This architecture will be significantly easier to maintain and iterate than trying to encode the system into Home Assistant helpers/entities.
