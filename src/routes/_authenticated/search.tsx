import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { searchQuery } from "@/lib/data";
import { CardRow, type CardWithBoard } from "@/components/CardRow";

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s['q'] === "string" ? s['q'] : "" }),
  head: () => ({
    meta: [
      { title: "Search — Command Center" },
      { name: "description", content: "Search cards and boards." },
      { property: "og:title", content: "Search — Command Center" },
      { property: "og:description", content: "Search cards and boards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data, isFetching } = useQuery(searchQuery(q));
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{q ? <>Results for “{q}”</> : "Search"}</h1>
      {!q && <p className="text-muted-foreground">Type in the search box above.</p>}
      {isFetching && <p className="text-sm text-muted-foreground">Searching…</p>}
      {data && (
        <div className="space-y-6">
          {data.boards.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.boards.map((b) => (
                <Link key={b.id} to="/board/$boardId" params={{ boardId: b.id }} data-board-bg={b.background} style={boardBgStyle(b.background)} className="board-text rounded-lg px-3 py-2 text-sm font-semibold">{b.title}</Link>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {data.cards.map((c) => <CardRow key={c.id} card={c as CardWithBoard} />)}
            {data.cards.length === 0 && data.boards.length === 0 && <p className="text-muted-foreground">No matches.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
