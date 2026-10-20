import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { boardsQuery, boardQuery, type Card } from "@/lib/data";
import { placeCard, type DestinationMode } from "@/lib/card-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CardDestination({ card, mode, onDone }: { card: Card; mode: DestinationMode; onDone: () => void }) {
  const qc = useQueryClient();
  const [boardId, setBoardId] = useState(card.board_id);
  const [listId, setListId] = useState(card.list_id);
  const [index, setIndex] = useState(0);
  const [title, setTitle] = useState(card.title);
  const [busy, setBusy] = useState(false);
  const { data: boards = [] } = useQuery(boardsQuery());
  const { data: dest, error } = useQuery(boardQuery(boardId));
  const actualList = dest?.lists.some((l) => l.id === listId) ? listId : dest?.lists[0]?.id;
  const items = dest?.cards.filter((c) => c.list_id === actualList && !(mode === "move" && c.id === card.id)) ?? [];
  async function submit(destinationList = actualList, destinationIndex = Math.min(index, items.length)) {
    if (!destinationList) return;
    setBusy(true);
    try {
      await placeCard(card, mode, boardId, destinationList, destinationIndex, title);
      await qc.invalidateQueries();
      toast.success(mode === "move" ? "Card moved" : mode === "copy" ? "Card copied" : "Mirror created");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save card"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {mode === "copy" && <label className="block space-y-2 text-sm font-medium"><span>Name</span><Textarea aria-label="Card name" value={title} onChange={(e) => setTitle(e.target.value)} /></label>}
    {mode === "move" && boardId === card.board_id && <div className="space-y-1">{dest?.lists.filter((l) => l.id !== card.list_id).slice(0, 3).map((l) => <Button key={l.id} variant="outline" className="w-full justify-start" disabled={busy} onClick={() => submit(l.id, dest.cards.filter((c) => c.list_id === l.id).length)}><ArrowRight className="mr-2 h-4 w-4" />{l.title}</Button>)}</div>}
    <label className="block space-y-2 text-sm font-medium"><span>Board</span><Select value={boardId} onValueChange={(v) => { setBoardId(v); setListId(""); setIndex(0); }}><SelectTrigger aria-label="Destination board"><SelectValue /></SelectTrigger><SelectContent>{boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}</SelectContent></Select></label>
    <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-3"><label className="space-y-2 text-sm font-medium"><span>List</span><Select value={actualList ?? ""} onValueChange={(v) => { setListId(v); setIndex(0); }}><SelectTrigger aria-label="Destination list"><SelectValue placeholder="Choose a list" /></SelectTrigger><SelectContent>{dest?.lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}</SelectContent></Select></label><label className="space-y-2 text-sm font-medium"><span>Position</span><Select value={String(Math.min(index, items.length))} onValueChange={(v) => setIndex(Number(v))}><SelectTrigger aria-label="Destination position"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: items.length + 1 }, (_, i) => <SelectItem key={i} value={String(i)}>{i + 1}</SelectItem>)}</SelectContent></Select></label></div>
    {error && <p className="text-sm text-destructive">{error.message}</p>}
    <Button className="w-full" disabled={busy || !actualList || (mode === "copy" && !title.trim())} onClick={() => submit()}>{busy ? "Saving…" : mode === "move" ? "Move" : mode === "copy" ? "Create card" : "Create mirror"}</Button>
  </div>;
}