import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canonicalCardId, type CardPlacement } from "@/lib/card-actions";

export const commentsQuery = (cardId: string) => queryOptions({
  queryKey: ["card-comments", cardId],
  refetchInterval: 15000,
  queryFn: async () => {
    const { data, error } = await supabase.from("card_comments").select("*").eq("card_id", cardId).order("created_at");
    if (error) throw new Error(error.message);
    return data;
  },
});

export function commentBody(body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 10000) throw new Error("Comments must contain 1–10,000 characters.");
  return trimmed;
}

export async function postComment(card: Pick<CardPlacement, "id" | "sourceCardId">, body: string) {
  const { error } = await supabase.from("card_comments").insert({ card_id: canonicalCardId(card), body: commentBody(body) });
  if (error) throw new Error(error.message);
}

export async function editComment(id: string, body: string) {
  const { error } = await supabase.from("card_comments").update({ body: commentBody(body) }).eq("id", id).select("id").single();
  if (error) throw new Error(error.message);
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from("card_comments").delete().eq("id", id).select("id").single();
  if (error) throw new Error(error.message);
}