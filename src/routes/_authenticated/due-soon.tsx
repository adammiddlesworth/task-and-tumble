import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow } from "date-fns";
import { dueSoonQuery } from "@/lib/data";
import { CardRow, type CardWithBoard } from "@/components/CardRow";

export const Route = createFileRoute("/_authenticated/due-soon")({
  head: () => ({
    meta: [
      { title: "Due Soon — Command Center" },
      { name: "description", content: "Everything due in the next 7 days across all boards." },
      { property: "og:title", content: "Due Soon — Command Center" },
      { property: "og:description", content: "Everything due in the next 7 days across all boards." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dueSoonQuery()),
  component: DueSoonPage,
});

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, MMM d");
}

function DueSoonPage() {
  const { data } = useSuspenseQuery(dueSoonQuery());
  const groups = new Map<string, CardWithBoard[]>();
  for (const c of data as CardWithBoard[]) {
    const k = format(new Date(c.due_date!), "yyyy-MM-dd");
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Due Soon</h1>
      <p className="mb-6 text-sm text-muted-foreground">Next 7 days, all boards</p>
      {groups.size === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Nothing due this week.</div>}
      <div className="space-y-6">
        {[...groups.entries()].map(([k, cards]) => (
          <section key={k}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">{dayLabel(new Date(k + "T00:00"))}</h2>
            <div className="space-y-2">{cards.map((c) => <CardRow key={c.id} card={c} />)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
