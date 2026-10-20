import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { canonicalCardId } from "@/lib/card-actions";
import { publishDay } from "@/lib/board-calendar";
import { labelStyle, type BoardData, type Card } from "@/lib/data";
import { Button } from "@/components/ui/button";

export function BoardCalendar({ data, cards }: { data: BoardData; cards: Card[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const { scheduled, undated } = useMemo(() => {
    const scheduled = new Map<string, Card[]>();
    const undated: Card[] = [];
    for (const card of cards) {
      const day = publishDay(data.publishDates[canonicalCardId(card)]);
      if (!day) undated.push(card);
      else scheduled.set(day, [...(scheduled.get(day) ?? []), card]);
    }
    return { scheduled, undated };
  }, [cards, data.publishDates]);

  const renderCard = (card: Card) => {
    const labelIds = data.cardLabels.filter((row) => row.card_id === card.id).map((row) => row.label_id);
    const labels = data.labels.filter((label) => labelIds.includes(label.id));
    const list = data.lists.find((list) => list.id === card.list_id);
    return (
      <Button key={card.id} asChild variant="ghost" className="h-auto w-full justify-start whitespace-normal rounded-md bg-card p-2 text-left text-card-foreground shadow-card hover:bg-card hover:ring-1 hover:ring-primary">
        <Link to="/board/$boardId/card/$cardId" params={{ boardId: data.board.id, cardId: card.id }}>
          <div className="min-w-0 space-y-1.5">
            {labels.length > 0 && <div className="flex flex-wrap gap-1">{labels.map((label) => (
              <span key={label.id} title={label.name} data-label={label.color} style={labelStyle(label.color)} className="h-2 w-7 rounded-full" />
            ))}</div>}
            <p className={`break-words text-xs leading-snug ${card.is_complete ? "text-muted-foreground line-through" : ""}`}>{card.title}</p>
            {list && <p className="break-words text-[10px] font-normal text-muted-foreground">{list.title}</p>}
          </div>
        </Link>
      </Button>
    );
  };

  return (
    <section aria-label="Publish calendar" className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-y-auto bg-background text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="h-5 w-5 text-primary" />{format(month, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
          <Button variant="ghost" size="icon" title="Previous month" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon" title="Next month" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button>
        </div>
      </div>
      {cards.length === 0 && <p className="border-b px-4 py-3 text-sm text-muted-foreground">No cards match your filters.</p>}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-3 py-2 text-xs font-semibold text-muted-foreground">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                return <div key={key} aria-label={format(day, "MMMM d, yyyy")} className={`min-h-32 border-b border-r p-2 ${isSameMonth(day, month) ? "bg-background" : "bg-muted/40"}`}>
                  <time dateTime={key} className={`mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday(day) ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground"}`}>{format(day, "d")}</time>
                  <div className="space-y-2">{(scheduled.get(key) ?? []).map(renderCard)}</div>
                </div>;
              })}
            </div>
          </div>
        </div>
        <aside className="border-t bg-muted/30 p-3 lg:border-t-0 lg:border-l">
          <h3 className="mb-3 text-sm font-semibold">No publish date <span className="ml-1 text-muted-foreground">{undated.length}</span></h3>
          <div className="space-y-2">{undated.map(renderCard)}</div>
          {undated.length === 0 && <p className="text-xs text-muted-foreground">No undated cards.</p>}
        </aside>
      </div>
    </section>
  );
}