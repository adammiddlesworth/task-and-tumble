import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Archive, ArrowRight, CalendarClock, Copy, ExternalLink, Image, Link2, PanelsTopLeft, SquarePen, Tag, Users } from "lucide-react";
import { toast } from "sonner";
import { boardQuery, cardQuery, updateCard, type Card } from "@/lib/data";
import { archivePlacement, canonicalCardId } from "@/lib/card-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CardDestination } from "@/components/card/CardDestination";
import { CardMembers } from "@/components/card/Members";
import { LabelPicker } from "@/components/card/LabelPicker";
import { CoverButton } from "@/components/card/CoverImage";
import { DatesForm } from "@/components/card/DueDatePopover";

type Panel = "menu" | "labels" | "members" | "cover" | "dates" | "move" | "copy" | "mirror";
const actions = [
  ["open", "Open card", ExternalLink], ["labels", "Edit labels", Tag], ["members", "Change members", Users], ["cover", "Change cover", Image],
  ["dates", "Edit dates", CalendarClock], ["move", "Move", ArrowRight], ["copy", "Copy card", Copy], ["link", "Copy link", Link2], ["mirror", "Mirror", PanelsTopLeft], ["archive", "Archive", Archive],
] as const;

export function CardQuickEdit({ card }: { card: Card }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("menu");
  const [title, setTitle] = useState(card.title);
  return <span onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) { setTitle(card.title); setPanel("menu"); } }}>
      <PopoverTrigger asChild><Button variant="secondary" size="icon" aria-label={`Edit ${card.title}`} title="Edit card" className="h-7 w-7 rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"><SquarePen className="h-3.5 w-3.5" /></Button></PopoverTrigger>
      {open && <PopoverContent side="right" align="start" collisionPadding={12} className="max-h-[85vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto p-3" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <QuickEditContents card={card} panel={panel} setPanel={setPanel} title={title} setTitle={setTitle} close={() => setOpen(false)} />
      </PopoverContent>}
    </Popover>
  </span>;
}

function QuickEditContents({ card, panel, setPanel, title, setTitle, close }: { card: Card; panel: Panel; setPanel: (p: Panel) => void; title: string; setTitle: (v: string) => void; close: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const sourceId = canonicalCardId(card);
  const { data } = useQuery(cardQuery(card.id));
  const { data: board } = useQuery(boardQuery(card.board_id));
  const sourceBoard = data?.card.board_id ?? card.sourceBoardId ?? card.board_id;
  const { data: sourceLabels = [] } = useQuery({ queryKey: ["source-labels", sourceBoard], queryFn: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.from("labels").select("*").eq("board_id", sourceBoard);
    if (error) throw error;
    return data;
  }});
  async function save() {
    try { await updateCard(qc, card, { title: title.trim() }); close(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save card"); }
  }
  async function act(action: (typeof actions)[number][0]) {
    if (action === "open") { close(); await navigate({ to: "/board/$boardId/card/$cardId", params: { boardId: card.board_id, cardId: card.id } }); }
    else if (action === "link") {
      try { await navigator.clipboard.writeText(`${window.location.origin}/board/${card.board_id}/card/${card.id}`); toast.success("Card link copied"); close(); }
      catch { toast.error("Could not copy the link"); }
    } else if (action === "archive") {
      try { await archivePlacement(card); await qc.invalidateQueries(); toast.success("Card archived"); close(); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Could not archive card"); }
    } else setPanel(action);
  }
  if (panel !== "menu") return <div className="space-y-4">
    <div className="flex items-center gap-2"><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Back to card actions" onClick={() => setPanel("menu")}><ArrowRight className="h-4 w-4 rotate-180" /></Button><h3 className="text-sm font-semibold">{actions.find((a) => a[0] === panel)?.[1]}</h3></div>
    {(panel === "move" || panel === "copy" || panel === "mirror") && <CardDestination card={card} mode={panel} onDone={close} />}
    {panel === "members" && <CardMembers cardId={sourceId} />}
    {panel === "labels" && data && <LabelPicker cardId={sourceId} boardId={sourceBoard} labels={sourceLabels} selected={data.labelIds} inline />}
    {panel === "cover" && data && <div className="space-y-3">{data.coverSignedUrl && <img alt="Card cover" src={data.coverSignedUrl} className="h-32 w-full rounded-md object-cover" />}<CoverButton card={data.card} allowRemove /></div>}
    {panel === "dates" && data && <DatesForm start={data.card.start_date ? new Date(data.card.start_date) : null} due={data.card.due_date ? new Date(data.card.due_date) : null} onSave={async (patch) => { try { await updateCard(qc, card, patch); close(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save dates"); } }} />}
    {!data && (panel === "labels" || panel === "cover" || panel === "dates") && <p className="text-sm text-muted-foreground">Loading…</p>}
  </div>;
  return <div className="space-y-3">
    <Textarea aria-label="Edit card title" value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-20" />
    <Button size="sm" disabled={!title.trim()} onClick={save}>Save</Button>
    <div className="border-t pt-2">{actions.map(([action, label, Icon]) => <Button key={action} variant="ghost" size="sm" className="flex w-full justify-start gap-2" onClick={() => act(action)}><Icon className="h-4 w-4" />{label}</Button>)}</div>
    {card.sourceCardId && <p className="text-xs text-muted-foreground">Mirrored card · {board?.board.title}</p>}
  </div>;
}