import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "@tanstack/react-router";
import { Bot, CheckSquare, Target, CheckCircle2 } from "lucide-react";
import { DueBadge, StatusPill } from "@/components/badges";
import type { Card, Label } from "@/lib/data";

type Props = {
  card: Card;
  labels: Label[];
  checklist?: { done: number; total: number } | undefined;
  goalCount?: number | undefined;
  coverUrl?: string | undefined;
};

export function CardFaceView({ card, labels, checklist, goalCount, coverUrl }: Props) {
  return (
    <div className="space-y-1.5">
      {coverUrl && (
        <img src={coverUrl} alt="" draggable={false} className="-mx-3 -mt-2 mb-2 block h-32 w-[calc(100%+1.5rem)] max-w-none rounded-t-lg object-cover" />
      )}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((l) => (
            <span key={l.id} data-label={l.color} title={l.name} className="h-2 w-9 rounded-full" />
          ))}
        </div>
      )}
      <div className="flex items-start gap-1.5">
        {card.is_complete && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--due-complete)]" />}
        <p className={`text-sm leading-snug ${card.is_complete ? "text-muted-foreground line-through" : ""}`}>{card.title}</p>
      </div>
      {(card.due_date || checklist?.total || card.claude_enabled || goalCount || card.claude_status !== "off") && (
        <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          <DueBadge due={card.due_date} complete={card.is_complete} />
          {checklist && checklist.total > 0 && (
            <span data-due={checklist.done === checklist.total ? "complete" : undefined} className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px]">
              <CheckSquare className="h-3 w-3" /> {checklist.done}/{checklist.total}
            </span>
          )}
          {!!goalCount && (
            <span className="inline-flex items-center gap-1 text-[11px]">
              <Target className="h-3 w-3" /> {goalCount}
            </span>
          )}
          {card.claude_enabled && <Bot className="h-3.5 w-3.5 text-claude" aria-label="Claude enabled" />}
          <StatusPill status={card.claude_status} />
        </div>
      )}
    </div>
  );
}

export function SortableCard(props: Props) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.card.id,
    data: { type: "card", listId: props.card.list_id },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => navigate({ to: "/board/$boardId/card/$cardId", params: { boardId: props.card.board_id, cardId: props.card.id } })}
      className={`cursor-pointer overflow-hidden rounded-lg bg-card px-3 py-2 text-card-foreground shadow-card transition-shadow hover:shadow-lift ${isDragging ? "opacity-40" : ""}`}
    >
      <CardFaceView {...props} />
    </div>
  );
}
