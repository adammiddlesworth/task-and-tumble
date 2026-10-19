import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { MoreHorizontal, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SortableCard } from "./CardFace";
import type { BoardData, Card, List } from "@/lib/data";

type Props = {
  list: List;
  cards: Card[];
  data: BoardData;
  goalCounts: Record<string, number>;
  onRename: (title: string) => void;
  onArchive: () => void;
  onAddCard: (title: string) => void;
};

export function ListColumn({ list, cards, data, goalCounts, onRename, onArchive, onAddCard }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `list:${list.id}`,
    data: { type: "list" },
  });
  const [title, setTitle] = useState(list.title);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const labelsFor = (cardId: string) => {
    const ids = new Set(data.cardLabels.filter((cl) => cl.card_id === cardId).map((cl) => cl.label_id));
    return data.labels.filter((l) => ids.has(l.id));
  };

  function commitTitle() {
    setEditing(false);
    if (title.trim() && title !== list.title) onRename(title.trim());
    else setTitle(list.title);
  }

  function add() {
    if (draft.trim()) onAddCard(draft.trim());
    setDraft("");
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex max-h-full w-[272px] shrink-0 snap-start flex-col rounded-xl bg-panel text-panel-foreground shadow-card ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-1 px-2 pt-2" {...attributes} {...listeners}>
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && commitTitle()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 rounded-md bg-card px-2 py-1 text-sm font-semibold outline-none ring-2 ring-ring"
          />
        ) : (
          <h3 onClick={() => setEditing(true)} className="flex-1 cursor-text px-2 py-1 font-sans text-sm font-semibold">
            {list.title} <span className="ml-1 font-normal text-muted-foreground">{cards.length}</span>
          </h3>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground hover:bg-muted" onPointerDown={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setEditing(true)}>Rename list</DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>Archive list</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-2 flex-col gap-2 overflow-y-auto px-2 py-2">
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} labels={labelsFor(c.id)} checklist={data.checklistStats[c.id]} goalCount={goalCounts[c.id]} />
          ))}
        </div>
      </SortableContext>
      <div className="px-2 pb-2">
        {adding ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  add();
                }
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Card title…"
              className="min-h-16 bg-card text-sm"
            />
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={add}>Add card</Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setAdding(false)}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <Plus className="h-4 w-4" /> Add a card
          </button>
        )}
      </div>
    </div>
  );
}
