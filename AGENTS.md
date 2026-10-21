<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- YouTube calendars read date-only target publish dates by canonical card ID; label filters use placement label mappings so mirrors remain synchronized.
- The Pomodoro timer is mounted in AppShell with deadline-based local state, so board navigation and delayed browser ticks do not reset or drift the countdown.
- Data access uses browser Supabase with `can_access_board()` and `can_access_card()` RLS; owners alone manage invitations and cross-board sharing, while board members edit content.
- Ordering uses float `position` columns (`positionBetween`) so a drag updates exactly one row.
- Multi-row board operations (seeding, weekly reset, archive completed) are Postgres functions so they run atomically.
- Card detail is a child route of the board route rendering a dialog, so the URL reflects the open card.
- Mirrors store only placements and reference canonical cards; reads merge shared content, while content edits target canonical IDs and location/archive actions target placement IDs.
- Move/copy/mirror operations use the atomic `card_destination` RPC; copies duplicate checklist rows and map labels to the destination board.
- Invitations are email-bound, expiring links accepted only by matching verified accounts; no automatic email delivery is implied.
- Cover objects are retained on replacement/removal because independent copies may still reference them.
- Signed image URLs are cached per storage path in the session-scoped QueryClient until before expiry, so routine board refreshes do not reload unchanged backgrounds or covers; clearing the client on sign-out also clears these URLs.
- Comments reference canonical card IDs and use database-assigned authors with author-only edit/delete policies, so mirrors share discussions without permitting impersonation.
- Starter-board regression tests execute the applied SQL in isolated PGlite databases, so onboarding rules are verified without creating real accounts or touching existing user data.
- Daily/weekly review cards are created idempotently by the `ensure_review_cards` RPC (client passes local date + local deadline), keyed by a unique (user, kind, date) row in `reviews`, so repeated board loads never duplicate cards.
