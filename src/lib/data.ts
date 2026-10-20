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
export const LABEL_COLORS = ["green", "yellow", "orange", "red", "purple", "blue", "sky", "lime", "pink", "teal", "black"] as const;
/** Labels use a named preset (styled via CSS) or a custom "#rrggbb" color. */
export const labelStyle = (color?: string | null): { backgroundColor?: string } =>
  isCustomColor(color) ? { backgroundColor: color } : {};
export const DAY_LISTS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Weekend"];

function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}

export const boardsQuery = () =>
  queryOptions({
    queryKey: ["boards"],
    queryFn: async ({ client }) => {
      await supabase.rpc("seed_default_boards");
      const rows = check(await supabase.from("boards").select("*").order("position"));
      const urls = await signCovers(rows.map((b) => b.background_image ?? ""), client);
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
  checklistItems: Record<string, { id: string; text: string; is_done: boolean }[]>;
  publishDates: Record<string, string | null>;
  coverUrls: Record<string, string>;
};

export const COVER_BUCKET = "card-covers";

/** Keep unchanged image URLs stable across board refreshes, scoped to the query client/session. */
export async function signCovers(paths: string[], client: QueryClient): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const entries = await Promise.all(unique.map(async (path) => {
    const queryKey = ["signed-image", COVER_BUCKET, path];
    const cached = client.getQueryState<string>(queryKey);
    // Broad content invalidation must not rotate an otherwise valid image URL.
    if (cached?.data && Date.now() - cached.dataUpdatedAt < 23 * 60 * 60 * 1000) {
      return [path, cached.data] as const;
    }
    const url = await client.fetchQuery({
      queryKey,
      staleTime: 23 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: false,
      queryFn: async () => {
        const { data, error } = await supabase.storage.from(COVER_BUCKET).createSignedUrls([path], 60 * 60 * 24);
        const signedUrl = data?.[0]?.signedUrl;
        if (error || !signedUrl) throw new Error(error?.message ?? "Unable to load image");
        return signedUrl;
      },
    });
    return [path, url] as const;
  }));
  return Object.fromEntries(entries);
}

export const boardQuery = (boardId: string) =>
  queryOptions({
    queryKey: ["board", boardId],
    queryFn: async ({ client }): Promise<BoardData> => {
      const [board, lists, cards, labels, cl, checklists] = await Promise.all([
        supabase.from("boards").select("*").eq("id", boardId).single(),
        supabase.from("lists").select("*").eq("board_id", boardId).eq("archived", false).order("position"),
        supabase.from("cards").select("*").eq("board_id", boardId).eq("archived", false).order("position"),
        supabase.from("labels").select("*").eq("board_id", boardId),
        supabase.from("card_labels").select("card_id, label_id, cards!inner(board_id)").eq("cards.board_id", boardId),
        supabase.from("checklists").select("card_id, checklist_items(id, text, is_done, position), cards!inner(board_id)").eq("cards.board_id", boardId),
      ]);
      const checklistStats: BoardData["checklistStats"] = {};
      const checklistItems: BoardData["checklistItems"] = {};
      for (const c of check(checklists) ?? []) {
        const s = (checklistStats[c.card_id] ??= { done: 0, total: 0 });
        const items = (checklistItems[c.card_id] ??= []);
        for (const i of [...(c.checklist_items ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
          s.total++;
          if (i.is_done) s.done++;
          items.push({ id: i.id, text: i.text, is_done: i.is_done });
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
      const mirrorChecks = sourceIds.length ? check(await supabase.from("checklists").select("card_id,checklist_items(id, text, is_done, position)").in("card_id", sourceIds)) : [];
      for (const m of mirrors) {
        const items = mirrorChecks.filter((cl) => cl.card_id === m.card_id).flatMap((cl) => cl.checklist_items ?? []);
        checklistStats[m.id] = { done: items.filter((i) => i.is_done).length, total: items.length };
        checklistItems[m.id] = [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((i) => ({ id: i.id, text: i.text, is_done: i.is_done }));
      }
      const cardRows = [...check(cards), ...mirroredCards].sort((a, b) => a.position - b.position);
      const boardRow = check(board);
      const canonicalIds = [...new Set(cardRows.map(canonicalCardId))];
      const publishRows = boardRow.board_type === "youtube" && canonicalIds.length
        ? check(await supabase.from("youtube_details").select("card_id,publish_date").in("card_id", canonicalIds)) : [];
      const publishDates = Object.fromEntries(publishRows.map((row) => [row.card_id, row.publish_date]));
      const coverUrls = await signCovers([...cardRows.map((c) => c.cover_url ?? ""), boardRow.background_image ?? ""], client);
      return {
        coverUrls,
        board: boardRow,
        lists: check(lists),
        cards: cardRows,
        labels: [...new Map([...check(labels), ...mirrorLabels.flatMap((r) => r.labels ? [r.labels] : [])].map((l) => [l.id, l])).values()],
        cardLabels: [...(check(cl) ?? []).map((r) => ({ card_id: r.card_id, label_id: r.label_id })), ...mirrors.flatMap((m) => mirrorLabels.filter((r) => r.card_id === m.card_id).map((r) => ({ card_id: m.id, label_id: r.label_id })))],
        checklistStats,
        checklistItems,
        publishDates,
      };
    },
  });

export const cardQuery = (cardId: string) =>
  queryOptions({
    queryKey: ["card", cardId],
    queryFn: async ({ client }) => {
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
      const covers = c.cover_url ? await signCovers([c.cover_url], client) : {};
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
