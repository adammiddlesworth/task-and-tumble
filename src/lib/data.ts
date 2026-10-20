import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { canonicalCardId, mergeMirror, type CardPlacement } from "@/lib/card-actions";

export type Board = Tables<"boards">;
export type List = Tables<"lists">;
export type Card = Tables<"cards"> & { sourceCardId?: string; sourceBoardId?: string };
export type Label = Tables<"labels">;
export type YoutubeDetails = Tables<"youtube_details">;
export type ClaudeStatus = "off" | "queued" | "working" | "ready_for_review" | "failed";

export const BOARD_COLORS = ["forest", "crimson", "teal", "ocean", "amber", "plum", "slate"] as const;

/** Custom board colors are stored as "#rrggbb"; named presets are styled via CSS. */
export const isCustomColor = (bg?: string | null): bg is string => !!bg && /^#[0-9a-f]{6}$/i.test(bg);
export const boardBgStyle = (bg?: string | null): { backgroundColor?: string } =>
  isCustomColor(bg) ? { backgroundColor: bg } : {};
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
      const rows = check(await supabase.from("boards").select("*").order("position"));
      const urls = await signCovers(rows.map((b) => b.background_image ?? ""));
      return rows.map((b) => ({ ...b, bgUrl: b.background_image ? urls[b.background_image] ?? null : null }));
    },
  });

export type BoardData = {
  board: Board;
  lists: List[];
  cards: Card[];
  labels: Label[];
  cardLabels: { card_id: string; label_id: string }[];
  checklistStats: Record<string, { done: number; total: number }>;
  coverUrls: Record<string, string>;
};

export const COVER_BUCKET = "card-covers";

/** Sign many cover paths at once; returns path -> url. */
export async function signCovers(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await supabase.storage.from(COVER_BUCKET).createSignedUrls(unique, 60 * 60 * 24);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

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
      const mirrors = check(await supabase.from("card_mirrors").select("*").eq("board_id", boardId).eq("archived", false));
      const sources = mirrors.length ? check(await supabase.from("cards").select("*").in("id", mirrors.map((m) => m.card_id))) : [];
      const mirroredCards = mirrors.flatMap((m) => {
        const source = sources.find((c) => c.id === m.card_id);
        return source && !source.archived ? [mergeMirror(source, m)] : [];
      });
      const sourceIds = sources.map((c) => c.id);
      const mirrorLabels = sourceIds.length ? check(await supabase.from("card_labels").select("card_id,label_id,labels(*)").in("card_id", sourceIds)) : [];
      const mirrorChecks = sourceIds.length ? check(await supabase.from("checklists").select("card_id,checklist_items(is_done)").in("card_id", sourceIds)) : [];
      for (const m of mirrors) {
        const items = mirrorChecks.filter((cl) => cl.card_id === m.card_id).flatMap((cl) => cl.checklist_items ?? []);
        checklistStats[m.id] = { done: items.filter((i) => i.is_done).length, total: items.length };
      }
      const cardRows = [...check(cards), ...mirroredCards].sort((a, b) => a.position - b.position);
      const boardRow = check(board);
      const coverUrls = await signCovers([...cardRows.map((c) => c.cover_url ?? ""), boardRow.background_image ?? ""]);
      return {
        coverUrls,
        board: boardRow,
        lists: check(lists),
        cards: cardRows,
        labels: [...new Map([...check(labels), ...mirrorLabels.flatMap((r) => r.labels ? [r.labels] : [])].map((l) => [l.id, l])).values()],
        cardLabels: [...(check(cl) ?? []).map((r) => ({ card_id: r.card_id, label_id: r.label_id })), ...mirrors.flatMap((m) => mirrorLabels.filter((r) => r.card_id === m.card_id).map((r) => ({ card_id: m.id, label_id: r.label_id })))],
        checklistStats,
      };
    },
  });

export const cardQuery = (cardId: string) =>
  queryOptions({
    queryKey: ["card", cardId],
    queryFn: async () => {
      const mirrorRes = await supabase.from("card_mirrors").select("*").eq("id", cardId).maybeSingle();
      if (mirrorRes.error) throw mirrorRes.error;
      const mirror = mirrorRes.data;
      const sourceId = mirror?.card_id ?? cardId;
      const [card, yt, checklists, labels, activity] = await Promise.all([
        supabase.from("cards").select("*").eq("id", sourceId).single(),
        supabase.from("youtube_details").select("*").eq("card_id", sourceId).maybeSingle(),
        supabase.from("checklists").select("*, checklist_items(*)").eq("card_id", sourceId).order("position"),
        supabase.from("card_labels").select("label_id").eq("card_id", sourceId),
        supabase.from("card_activity").select("*").eq("card_id", sourceId).order("created_at", { ascending: false }).limit(20),
      ]);
      const c = check(card);
      const covers = c.cover_url ? await signCovers([c.cover_url]) : {};
      return {
        coverSignedUrl: c.cover_url ? covers[c.cover_url] ?? null : null,
        card: c,
        placement: mirror ? mergeMirror(c, mirror) : c,
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

type CardResult = Tables<"cards"> & { boards: { title: string; background: string } | null; lists: { title: string } | null };
async function visibleCardResults(rows: CardResult[]) {
  const ids = rows.filter((r) => !r.boards).map((r) => r.id);
  if (!ids.length) return rows;
  const mirrors = check(await supabase.from("card_mirrors").select("*,boards(title,background),lists(title)").in("card_id", ids).eq("archived", false));
  return rows.flatMap((row) => {
    if (row.boards) return [row];
    const placement = mirrors.find((m) => m.card_id === row.id);
    return placement ? [{ ...mergeMirror(row, placement), boards: placement.boards, lists: placement.lists }] : [];
  });
}

export const reviewQuery = () =>
  queryOptions({
    queryKey: ["review"],
    queryFn: async () =>
      visibleCardResults(check(
        await supabase
          .from("cards")
          .select("*, boards(title, background), lists(title)")
          .eq("claude_status", "ready_for_review")
          .eq("archived", false)
          .order("claude_last_run_at", { ascending: false }),
      )),
  });

export const dueSoonQuery = () =>
  queryOptions({
    queryKey: ["due-soon"],
    queryFn: async () => {
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 864e5);
      return visibleCardResults(check(
        await supabase
          .from("cards")
          .select("*, boards(title, background), lists(title)")
          .eq("archived", false)
          .eq("is_complete", false)
          .gte("due_date", new Date(now.setHours(0, 0, 0, 0)).toISOString())
          .lte("due_date", end.toISOString())
          .order("due_date"),
      ));
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
      return { cards: await visibleCardResults(check(cards)), boards: check(boards) };
    },
  });

/** Patch a card in every cached board, then persist. */
export async function updateCard(qc: QueryClient, card: Pick<CardPlacement, "id" | "board_id" | "sourceCardId">, patch: TablesUpdate<"cards">) {
  const id = canonicalCardId(card);
  qc.setQueryData<BoardData>(["board", card.board_id], (d) =>
    d ? { ...d, cards: d.cards.map((c) => (c.id === card.id ? { ...c, ...patch } as Card : c)) } : d,
  );
  qc.setQueryData(["card", card.id], (d: { card: Card } | undefined) =>
    d ? { ...d, card: { ...d.card, ...patch } as Card } : d,
  );
  const { error } = await supabase.from("cards").update(patch).eq("id", id);
  if (error) {
    qc.invalidateQueries({ queryKey: ["board", card.board_id] });
    qc.invalidateQueries({ queryKey: ["card", card.id] });
    throw new Error(error.message);
  }
  qc.invalidateQueries({ queryKey: ["board"] });
  qc.invalidateQueries({ queryKey: ["card"] });
  if ("claude_status" in patch || "due_date" in patch || "archived" in patch || "is_complete" in patch) {
    qc.invalidateQueries({ queryKey: ["review"] });
    qc.invalidateQueries({ queryKey: ["due-soon"] });
  }
}

export async function logActivity(cardId: string, action: string) {
  await supabase.from("card_activity").insert({ card_id: cardId, action, actor: "user" });
}
