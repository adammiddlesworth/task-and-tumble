import { supabase } from "@/integrations/supabase/client";
import type { Card } from "@/lib/data";

export type CardPlacement = Card & { sourceCardId?: string; sourceBoardId?: string };
export const canonicalCardId = (card: Pick<CardPlacement, "id" | "sourceCardId">) => card.sourceCardId ?? card.id;
export function mergeMirror<T extends { id: string; board_id: string; list_id: string; position: number; archived: boolean }>(source: T, placement: { id: string; board_id: string; list_id: string; position: number; archived: boolean }) {
  return { ...source, ...placement, sourceCardId: source.id, sourceBoardId: source.board_id };
}
export type DestinationMode = "move" | "copy" | "mirror";
export async function placeCard(card: CardPlacement, mode: DestinationMode, boardId: string, listId: string, index: number, title: string) {
  const { data, error } = await supabase.rpc("card_destination", {
    _card_id: mode === "move" ? card.id : canonicalCardId(card), _board_id: boardId, _list_id: listId, _index: index, _mode: mode, _title: title,
  });
  if (error) throw error;
  return data;
}
export async function archivePlacement(card: CardPlacement) {
  const { error } = await supabase.from(card.sourceCardId ? "card_mirrors" : "cards").update({ archived: true }).eq("id", card.id);
  if (error) throw error;
}