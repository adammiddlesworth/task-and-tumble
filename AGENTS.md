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
- Data access uses the browser Supabase client with owner-only RLS (via `owns_board()`); query options live in `src/lib/data.ts` so caches stay consistent.
- Ordering uses float `position` columns (`positionBetween`) so a drag updates exactly one row.
- Multi-row board operations (seeding, weekly reset, archive completed) are Postgres functions so they run atomically.
- Card detail is a child route of the board route rendering a dialog, so the URL reflects the open card.
