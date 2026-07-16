# Manual QA Checklist

## Local App

- App loads in browser without console-breaking errors
- Dashboard shows Sample Child 1, Sample Child 2, and Sample Child 3
- Unassigned and assigned chores render in the correct lanes
- Point totals render for each child

## Chores

- Open add chore modal from the Unassigned lane add button
- Add an unassigned chore
- Add an assigned chore
- Add a chore with weekday schedule
- Open a chore detail modal
- Edit a chore title, description, points, or kid schedule
- Delete a chore from a card and confirm it disappears

## Assignment And Completion

- Assign an unassigned chore to a child from the chore detail/assignment flow
- Assign one chore to multiple children on different weekdays
- Complete an assigned chore
- Confirm the child point total increases
- Uncomplete the same chore
- Confirm the child point total returns to the prior value
- Verify an unassigned chore cannot be completed

## Management

- Open Manage from the top bar
- Add a person and confirm a new lane appears
- Rename a person and confirm the lane updates
- Open the avatar picker and change a person's avatar
- Add a reward and confirm it appears in the reward list
- Edit a reward name, description, or cost
- Deactivate a reward and confirm it moves to inactive management state
- Cycle the visual theme and confirm the board updates

## Rewards

- Open rewards from a child lane
- Confirm affordable rewards are enabled
- Confirm unaffordable rewards are disabled
- Redeem an affordable reward
- Confirm the child total drops by the reward cost
- Confirm the reward modal closes after success

## History And Debug Tools

- Open recent history and confirm ledger events are listed
- Open debug tools and confirm health/database details render
- Enable simulated time
- Change to a different weekday and confirm scheduled chores refresh accordingly
- Reset simulated time

## Persistence

- Refresh the page and confirm the current state remains
- Restart the local server and confirm the current state remains
