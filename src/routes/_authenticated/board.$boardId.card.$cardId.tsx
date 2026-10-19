import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Archive, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { boardQuery, cardQuery, logActivity, updateCard, type BoardData } from "@/lib/data";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DueBadge } from "@/components/badges";
import { MarkdownField } from "@/components/Markdown";
import { AiAssist } from "@/components/card/AiAssist";
import { YoutubeFields } from "@/components/card/YoutubeFields";
import { Checklists } from "@/components/card/Checklists";
import { LabelPicker } from "@/components/card/LabelPicker";
import { CoverBanner, CoverButton } from "@/components/card/CoverImage";

export const Route = createFileRoute("/_authenticated/board/$boardId/card/$cardId")({
  head: () => ({
    meta: [
      { title: "Card — Command Center" },
      { name: "description", content: "Card details in Command Center." },
      { property: "og:title", content: "Card — Command Center" },
      { property: "og:description", content: "Card details in Command Center." },
    ],
  }),
  component: CardModal,
});

function toLocalInput(iso: string | null) {
  return iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "";
}

function CardModal() {
  const { boardId, cardId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: board } = useQuery(boardQuery(boardId));
  const { data } = useQuery(cardQuery(cardId));
  const [title, setTitle] = useState("");
  useEffect(() => setTitle(data?.card.title ?? ""), [data?.card.title]);

  const close = () => navigate({ to: "/board/$boardId", params: { boardId } });

  if (!data || !board) return null;
  const card = data.card;
  const list = board.lists.find((l) => l.id === card.list_id);
  const save = (patch: Parameters<typeof updateCard>[2]) => updateCard(qc, card, patch).catch((e) => toast.error(e.message));
  const isPower = board.board.board_type === "power_list";
  const goalsList = board.lists.find((l) => l.title.toLowerCase().includes("goals"));
  const isGoal = goalsList && card.list_id === goalsList.id;
  const goalCards = goalsList ? board.cards.filter((c) => c.list_id === goalsList.id) : [];
  const linked = board.cards.filter((c) => c.goal_card_id === card.id);

  async function remove() {
    if (!confirm("Delete this card permanently?")) return;
    await supabase.from("cards").delete().eq("id", card.id);
    qc.setQueryData<BoardData>(["board", boardId], (d) => (d ? { ...d, cards: d.cards.filter((c) => c.id !== card.id) } : d));
    close();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
        {data.card.cover_url && <CoverBanner card={card} url={data.coverSignedUrl} />}
        <div className="space-y-5 p-6">
          <div>
            <DialogTitle className="sr-only">{card.title}</DialogTitle>
            <div className="flex items-start gap-3">
              <Checkbox
                className="mt-2"
                checked={card.is_complete}
                onCheckedChange={(v) => { save({ is_complete: !!v }); logActivity(card.id, v ? "marked complete" : "marked incomplete"); }}
                aria-label="Mark complete"
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title.trim() && title !== card.title && save({ title: title.trim() })}
                className="flex-1 rounded-md bg-transparent px-1 font-display text-2xl font-bold outline-none focus:bg-muted"
              />
            </div>
            <p className="ml-8 mt-1 text-xs text-muted-foreground">in <span className="font-medium">{list?.title}</span> · {board.board.title}</p>
          </div>

          <div className="ml-8 flex flex-wrap items-center gap-2">
            <CoverButton card={card} />
            <LabelPicker cardId={card.id} boardId={boardId} labels={board.labels} selected={data.labelIds} />
            <Input
              type="datetime-local"
              value={toLocalInput(card.due_date)}
              onChange={(e) => save({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="h-9 w-auto"
            />
            <DueBadge due={card.due_date} complete={card.is_complete} />
            {board.labels.filter((l) => data.labelIds.includes(l.id)).map((l) => (
              <span key={l.id} data-label={l.color} className="rounded px-2 py-0.5 text-xs font-medium text-[oklch(0.99_0_0)]">{l.name || " "}</span>
            ))}
          </div>

          {isPower && !isGoal && goalCards.length > 0 && (
            <div className="ml-8 flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Select value={card.goal_card_id ?? "none"} onValueChange={(v) => save({ goal_card_id: v === "none" ? null : v })}>
                <SelectTrigger className="h-9 w-72"><SelectValue placeholder="Link to a goal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No goal</SelectItem>
                  {goalCards.map((g) => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {isGoal && (
            <div className="ml-8 rounded-lg bg-muted/60 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-semibold"><Target className="h-4 w-4" /> {linked.length} linked task{linked.length === 1 ? "" : "s"}</div>
              {linked.map((c) => <div key={c.id} className={c.is_complete ? "text-muted-foreground line-through" : ""}>• {c.title}</div>)}
            </div>
          )}

          <div className="ml-8 space-y-1">
            <h3 className="font-sans text-sm font-semibold">Description</h3>
            <MarkdownField value={card.description} placeholder="Add a more detailed description… (markdown supported)" onSave={(v) => save({ description: v })} />
          </div>

          <div className="ml-8"><Checklists cardId={card.id} boardId={boardId} checklists={data.checklists} /></div>

          {board.board.board_type === "youtube" && (
            <div className="ml-8"><YoutubeFields cardId={card.id} details={data.youtube} /></div>
          )}

          <div className="ml-8"><AiAssist card={card} /></div>

          {data.activity.length > 0 && (
            <div className="ml-8 space-y-1">
              <h3 className="font-sans text-sm font-semibold">Activity</h3>
              {data.activity.map((a) => (
                <p key={a.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{a.actor === "claude" ? "Claude" : "You"}</span> {a.action} · {format(new Date(a.created_at), "MMM d, h:mm a")}
                </p>
              ))}
            </div>
          )}

          <div className="ml-8 flex gap-2 border-t pt-4">
            <Button size="sm" variant="secondary" onClick={() => { save({ archived: true }); qc.setQueryData<BoardData>(["board", boardId], (d) => d ? { ...d, cards: d.cards.filter((c) => c.id !== card.id) } : d); close(); toast.success("Card archived"); }}>
              <Archive className="mr-1 h-4 w-4" /> Archive
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
