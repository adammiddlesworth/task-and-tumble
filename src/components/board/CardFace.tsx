import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, CheckSquare, Target, CheckCircle2, PanelsTopLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DueBadge, StatusPill } from "@/components/badges";
import { Checkbox } from "@/components/ui/checkbox";
import { labelStyle, updateCard, type Card, type Label } from "@/lib/data";
import { CardQuickEdit } from "@/components/card/CardQuickEdit";

export type ChecklistItem = { id: string; text: string; is_done: boolean };

type Props = {
  card: Card;
  labels: Label[];
  checklist?: { done: number; total: number } | undefined;
  checklistItems?: ChecklistItem[] | undefined;
  goalCount?: number | undefined;
  coverUrl?: string | undefined;
  onToggleComplete?: () => void;
  onToggleChecklistItem?: ((itemId: string, done: boolean) => void) | undefined;
};

export function CardFaceView({ card, labels, checklist, checklistItems, goalCount, coverUrl, onToggleComplete, onToggleChecklistItem }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  return (
    <div className="space-y-1.5">
      {coverUrl && (
        <img src={coverUrl} alt="" draggable={false} className="-mx-3 -mt-2 mb-2 block h-32 w-[calc(100%+1.5rem)] max-w-none rounded-t-lg object-cover" />
      )}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((l) => (
            <span key={l.id} data-label={l.color} style={labelStyle(l.color)} title={l.name} className="h-2 w-9 rounded-full" />
          ))}
        </div>
      )}
      <div className="flex items-start gap-1.5">
        {onToggleComplete ? (
          <span
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className={`mt-0.5 shrink-0 ${card.is_complete ? "" : "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"}`}
          >
            <Checkbox checked={card.is_complete} onCheckedChange={() => onToggleComplete()} aria-label="Mark card complete" />
          </span>
        ) : (
          card.is_complete && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--due-complete)]" />
        )}
        <p className={`min-w-0 break-words pr-5 text-sm leading-snug ${card.is_complete ? "text-muted-foreground line-through" : ""}`}>{card.title}</p>
        {card.sourceCardId && <PanelsTopLeft className="h-3.5 w-3.5 shrink-0 text-claude" aria-label="Mirrored card" />}
      </div>
      {(card.due_date || checklist?.total || card.claude_enabled || goalCount || card.claude_status !== "off") && (
        <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          <DueBadge due={card.due_date} complete={card.is_complete} />
          {checklist && checklist.total > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              data-due={checklist.done === checklist.total ? "complete" : undefined}
              className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] hover:bg-nav-foreground/10"
              aria-expanded={expanded}
              title={expanded ? "Hide checklist" : "Show checklist"}
            >
              <CheckSquare className="h-3 w-3" /> {checklist.done}/{checklist.total}
            </button>
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
      {expanded && checklistItems && checklistItems.length > 0 && (
        <div
          className="space-y-1.5 rounded-md bg-muted/60 p-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {(showAll ? checklistItems : checklistItems.slice(0, 3)).map((it) => (
            <div key={it.id} className="flex items-start gap-2">
              <Checkbox
                checked={it.is_done}
                onCheckedChange={(v) => onToggleChecklistItem?.(it.id, !!v)}
                className="mt-0.5"
                aria-label={`Toggle "${it.text}" done`}
              />
              <span className={`text-[13px] leading-snug ${it.is_done ? "text-muted-foreground line-through" : ""}`}>{it.text}</span>
            </div>
          ))}
          {checklistItems.length > 3 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground">
              {showAll ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SortableCard(props: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.card.id,
    data: { type: "card", listId: props.card.list_id },
  });
  const toggleComplete = () => {
    updateCard(qc, props.card, { is_complete: !props.card.is_complete }).catch((e) => toast.error(e.message));
  };
  const toggleChecklistItem = (itemId: string, done: boolean) => {
    supabase.from("checklist_items").update({ is_done: done }).eq("id", itemId).then(() => {
      qc.invalidateQueries({ queryKey: ["board"] });
      qc.invalidateQueries({ queryKey: ["card"] });
    });
  };
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => navigate({ to: "/board/$boardId/card/$cardId", params: { boardId: props.card.board_id, cardId: props.card.id } })}
      className={`group relative cursor-pointer overflow-hidden rounded-lg bg-card px-3 py-2 text-card-foreground shadow-card transition-all hover:ring-2 hover:ring-primary ${isDragging ? "opacity-40" : ""}`}
    >
      <CardFaceView {...props} onToggleComplete={toggleComplete} onToggleChecklistItem={toggleChecklistItem} />
      <div className="absolute right-1 top-1"><CardQuickEdit card={props.card} /></div>
    </div>
  );
}
