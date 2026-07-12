# Remaining Roadmap

The app has moved past the original MVP release-plan checklist. Shipped release notes now live in GitHub Releases; this file tracks only future ideas and unimplemented work.

## Future Ideas

### Kiosk Safety

- Add a hidden or lightweight admin mode for destructive actions.
- Consider a parent-only gesture or PIN if real household use shows accidental edits are a problem.
- Review delete/edit confirmations after daily use on the target kiosk.

### Assignment Interaction

- Evaluate whether tablet drag-and-drop is better than the current assignment controls.
- If it feels reliable on the target device, add drag from unassigned chores into child lanes.
- Keep the tap/select assignment flow as a fallback even if drag-and-drop is added.

### Data Management

- Add export/import support for household data.
- Add clearer backup and restore guidance around the SQLite database.
- Consider a simple in-app backup action if manual file backup proves awkward.

### Scheduling And Time

- Add explicit in-app timezone configuration if relying on container/server `TZ` is not enough.
- Continue testing local date boundaries around recurring chores and weekly rotations.

### Home Assistant Polish

- Validate iframe behavior on the actual wall tablet.
- Tune spacing, touch targets, and visual density based on the kiosk viewport.
- Document any Home Assistant-specific quirks that show up during real deployment.

## Risks To Watch

- Tablet drag-and-drop may feel worse than expected.
- Local date behavior depends on the configured runtime timezone.
- No-auth kiosk usage means destructive actions need careful UX.
- Future point-related features should keep using ledger entries rather than bypassing the audit trail.
