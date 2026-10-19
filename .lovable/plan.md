# Command Center — Personal Kanban with Claude Assist

Note: no backend is connected yet. Plan uses Lovable Cloud (database, sign-in, file storage, live updates). If you'd rather use your own existing project, connect it from the Cloud panel before approving.

## Phase 1 — Foundation
- Enable Lovable Cloud, email/password sign-in, sign-in page.
- Full data model from the brief (profiles, boards, lists, cards, youtube_details, labels, card_labels, checklists, checklist_items, card_activity) with owner-only access rules on every table.
- `claude_queue` view exactly as specified (queued, enabled, not archived, due within 3 days or no date, joined with board/list titles and YouTube details, ordered by due date).
- Live updates enabled on cards.
- First-login seeding: Power List (10 lists) + 4 YouTube boards (8-stage pipeline each), each with its own color.

## Phase 2 — Boards and cards
- Top nav: logo, Boards, Due Soon, Claude Review (count badge), search, avatar menu, dark mode toggle.
- Dashboard: board grid, create / rename / star.
- Board view: horizontal scrolling 272px lists (snap on mobile), add / rename / archive lists, inline add card, drag cards between lists and reorder lists with instant UI then save (one row updated per move via fractional positions).
- Card face: labels, title, due badge (gray/yellow/red/green), checklist progress, robot icon, Claude status pill (gray / blue pulsing / purple / red).
- Card modal at `/board/:id/card/:cardId`: title, markdown description, board labels, due date, checklists, complete / archive / delete.

## Phase 3 — Special features
- Power List: Weekly Reset (with confirmation), Archive Completed, goal linking with linked-task count on goal cards.
- YouTube boards: publish date, video type, working title, title options, hook, script (markdown), thumbnail concept, description, tags, video URL.
- AI Assist section on every card: toggle (sets queued), instructions, status, rendered output with copy button, last run time, Approve and Redo (with added notes). Activity logged.

## Phase 4 — Cross-board pages
- Global search across all boards.
- Due Soon: next 7 days, grouped by day.
- Claude Review: all ready_for_review cards with inline Approve / Redo.

## Design
Clean and focused: warm neutral base, rounded cards, soft shadows, hover lift, per-board background colors, full dark mode. Distinct display font (not Inter).

## Technical details
- TanStack Start routes: `/`, `/auth`, `/_authenticated/boards`, `/board/$boardId`, `/board/$boardId/card/$cardId`, `/due-soon`, `/review`, `/search`.
- @dnd-kit for drag-and-drop; react-markdown for rendering; TanStack Query with optimistic mutations; realtime subscription on cards invalidates queries.
- Seeding via an idempotent database function called after first sign-in.
- Weekly Reset / Archive Completed implemented as database functions so they run atomically.
- External Claude agent reads `claude_queue` and writes back to cards (status, output, last_run_at); an MCP or API endpoint for it can be added later.
