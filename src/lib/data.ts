import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Board = Tables<"boards">;
export type List = Tables<"lists">;
export type Card = Tables<"cards">;
export type Label = Tables<"labels">;
export type YoutubeDetails = Tables<"youtube_details">;
export type ClaudeStatus = "off" | "queued" | "working" | "ready_for_review" | "failed";

export const BOARD_COLORS = ["forest", "crimson", "teal", "ocean", "amber", "plum", "slate"] as const;
export const LABEL_COLORS = ["green", "yellow", "orange", "red", "purple", "blue"] as const;
export const DAY_LISTS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Weekend"];

function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}

export const boardsQuery = () =>
  queryOptions({
    queryKey: ["boards"],
    queryFn: async () => {
      await supabase.rpc("seed_default_boards");
      return check(await supabase.from("boards").select("*").order("position"));
    },
  });

export type BoardData = {
  board: Board;
  lists: List[];
  cards: Card[];
  labels: Label[];
  cardLabels: { card_id: string; label_id: string }[];
  checklistStats: Record<string, { done: number; total: number }>;
};

export const boardQuery = (boardId: string) =>
  queryOptions({
    queryKey: ["board", boardId],
    queryFn: async (): Promise<BoardData> => {
      const [board, lists, cards, labels, cl, checklists] = await Promise.all([
        supabase.from("boards").select("*").eq("id", boardId).single(),
        supabase.from("lists").select("*").eq("board_id", boardId).eq("archived", false).order("position"),
        supabase.from("cards").select("*").eq("board_id", boardId).eq("archived", false).order("position"),
        supabase.from("labels").select("*").eq("board_id", boardId),
        supabase.from("card_labels").select("card_id, label_id, cards!inner(board_id)").eq("cards.board_id", boardId),
        supabase.from("checklists").select("card_id, checklist_items(is_done), cards!inner(board_id)").eq("cards.board_id", boardId),
      ]);
      const checklistStats: BoardData["checklistStats"] = {};
      for (const c of check(checklists) ?? []) {
        const s = (checklistStats[c.card_id] ??= { done: 0, total: 0 });
        for (const i of c.checklist_items ?? []) {
          s.total++;
          if (i.is_done) s.done++;
        }
      }
      return {
        board: check(board),
        lists: check(lists),
        cards: check(cards),
        labels: check(labels),
        cardLabels: (check(cl) ?? []).map((r) => ({ card_id: r.card_id, label_id: r.label_id })),
        checklistStats,
      };
    },
  });

export const cardQuery = (cardId: string) =>
  queryOptions({
    queryKey: ["card", cardId],
    queryFn: async () => {
      const [card, yt, checklists, labels, activity] = await Promise.all([
        supabase.from("cards").select("*").eq("id", cardId).single(),
        supabase.from("youtube_details").select("*").eq("card_id", cardId).maybeSingle(),
        supabase.from("checklists").select("*, checklist_items(*)").eq("card_id", cardId).order("position"),
        supabase.from("card_labels").select("label_id").eq("card_id", cardId),
        supabase.from("card_activity").select("*").eq("card_id", cardId).order("created_at", { ascending: false }).limit(20),
      ]);
      return {
        card: check(card),
        youtube: check(yt),
        checklists: check(checklists).map((c) => ({
          ...c,
          checklist_items: [...(c.checklist_items ?? [])].sort((a, b) => a.position - b.position),
        })),
        labelIds: check(labels).map((l) => l.label_id),
        activity: check(activity),
      };
    },
  });

export const reviewQuery = () =>
  queryOptions({
    queryKey: ["review"],
    queryFn: async () =>
      check(
        await supabase
          .from("cards")
          .select("*, boards(title, background), lists(title)")
          .eq("claude_status", "ready_for_review")
          .eq("archived", false)
          .order("claude_last_run_at", { ascending: false }),
      ),
  });

export const dueSoonQuery = () =>
  queryOptions({
    queryKey: ["due-soon"],
    queryFn: async () => {
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 864e5);
      return check(
        await supabase
          .from("cards")
          .select("*, boards(title, background), lists(title)")
          .eq("archived", false)
          .eq("is_complete", false)
          .gte("due_date", new Date(now.setHours(0, 0, 0, 0)).toISOString())
          .lte("due_date", end.toISOString())
          .order("due_date"),
      );
    },
  });

export const searchQuery = (q: string) =>
  queryOptions({
    queryKey: ["search", q],
    enabled: q.trim().length > 0,
    queryFn: async () => {
      const term = `%${q.trim().replace(/[%,()]/g, " ")}%`;
      const [cards, boards] = await Promise.all([
        supabase
          .from("cards")
          .select("*, boards(title, background), lists(title)")
          .eq("archived", false)
          .or(`title.ilike.${term},description.ilike.${term}`)
          .limit(50),
        supabase.from("boards").select("*").ilike("title", term),
      ]);
      return { cards: check(cards), boards: check(boards) };
    },
  });

/** Patch a card in every cached board, then persist. */
export async function updateCard(qc: QueryClient, card: Pick<Card, "id" | "board_id">, patch: TablesUpdate<"cards">) {
  qc.setQueryData<BoardData>(["board", card.board_id], (d) =>
    d ? { ...d, cards: d.cards.map((c) => (c.id === card.id ? { ...c, ...patch } as Card : c)) } : d,
  );
  qc.setQueryData(["card", card.id], (d: { card: Card } | undefined) =>
    d ? { ...d, card: { ...d.card, ...patch } as Card } : d,
  );
  const { error } = await supabase.from("cards").update(patch).eq("id", card.id);
  if (error) {
    qc.invalidateQueries({ queryKey: ["board", card.board_id] });
    qc.invalidateQueries({ queryKey: ["card", card.id] });
    throw new Error(error.message);
  }
  if ("claude_status" in patch || "due_date" in patch || "archived" in patch || "is_complete" in patch) {
    qc.invalidateQueries({ queryKey: ["review"] });
    qc.invalidateQueries({ queryKey: ["due-soon"] });
  }
}

export async function logActivity(cardId: string, action: string) {
  await supabase.from("card_activity").insert({ card_id: cardId, action, actor: "user" });
}
