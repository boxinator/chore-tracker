# Manual QA Checklist

## Local MVP

- App loads in browser without console-breaking errors
- Dashboard shows Sample Child 1, Sample Child 2, and Sample Child 3
- Unassigned and assigned chores render in the correct lanes
- Point totals render for each child

## Chores

- Open add chore modal from the top-right add button
- Add an unassigned chore
- Add an assigned chore
- Add a chore with weekday schedule
- Delete a chore from a card and confirm it disappears

## Assignment And Completion

- Assign an unassigned chore to a child
- Complete an assigned chore
- Confirm the child point total increases
- Uncomplete the same chore
- Confirm the child point total returns to the prior value
- Verify an unassigned chore cannot be completed

## Rewards

- Open rewards from a child lane
- Confirm affordable rewards are enabled
- Confirm unaffordable rewards are disabled
- Redeem an affordable reward
- Confirm the child total drops by the reward cost
- Confirm the reward modal closes after success

## Persistence

- Refresh the page and confirm the current state remains
- Restart the local server and confirm the current state remains
