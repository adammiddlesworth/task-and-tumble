import { Link } from "@tanstack/react-router";
import { DueBadge, StatusPill } from "@/components/badges";
import { boardBgStyle, type Card } from "@/lib/data";
import { CardQuickEdit } from "@/components/card/CardQuickEdit";

export type CardWithBoard = Card & { boards: { title: string; background: string } | null; lists: { title: string } | null };

export function CardRow({ card, children }: { card: CardWithBoard; children?: React.ReactNode }) {
  return (
    <div className="group relative flex items-start gap-3 rounded-xl bg-card p-3 shadow-card hover:ring-2 hover:ring-primary">
      <span data-board-bg={card.boards?.background} style={boardBgStyle(card.boards?.background)} className="mt-1 h-8 w-1.5 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Link to="/board/$boardId/card/$cardId" params={{ boardId: card.board_id, cardId: card.id }} className="font-medium hover:underline">
          {card.title}
        </Link>
        <p className="text-xs text-muted-foreground">{card.boards?.title} · {card.lists?.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <DueBadge due={card.due_date} complete={card.is_complete} />
          <StatusPill status={card.claude_status} />
        </div>
        {children}
      </div>
      <CardQuickEdit card={card} />
    </div>
  );
}
