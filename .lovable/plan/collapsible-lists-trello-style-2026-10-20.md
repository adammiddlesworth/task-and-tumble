# Collapsible lists (Trello-style)

## What you get
- A collapse button (narrow arrows icon) in each list header, plus "Collapse list" in the list's ... menu.
- A collapsed list shrinks to a thin strip (about 40px wide) showing the list title written vertically and the card count.
- Click the strip to expand it again.
- Collapsed lists stay in place, can still be dragged to reorder, and cards dragged onto a collapsed strip drop into that list.
- Collapsed state is saved, so it stays the same after a refresh and on your other devices.

## Technical details
- Migration: add `lists.collapsed boolean not null default false` (existing owner RLS covers it).
- `ListColumn`: when `list.collapsed`, render a narrow `w-10` column with `[writing-mode:vertical-rl]` title + count; keep `useSortable` so list drag and card drop targets still work; hide the card area and add-card form.
- Board route: `onToggleCollapse` updates the list in the board query cache, then persists via the browser client (same pattern as rename).
