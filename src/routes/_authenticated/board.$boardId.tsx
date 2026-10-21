import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Archive, CalendarDays, Columns3, Plus, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { boardBgStyle, boardQuery, type BoardData, type Card, type List } from "@/lib/data";
import { ensureReviewCards, userRulesQuery } from "@/lib/reviews";
import { RulesDialog } from "@/components/board/RulesDialog";
import { positionBetween } from "@/lib/position";
import { ListColumn } from "@/components/board/ListColumn";
import { BackgroundPicker } from "@/components/board/BackgroundPicker";
import { DeleteBoardButton } from "@/components/board/DeleteBoardButton";
import { BoardMembers } from "@/components/card/Members";
import { CardFaceView } from "@/components/board/CardFace";
import { BoardCalendar } from "@/components/board/BoardCalendar";
import { BoardLabelFilter } from "@/components/board/BoardLabelFilter";
import { matchesLabels } from "@/lib/board-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/board/$boardId")({
  head: () => ({
    meta: [
      { title: "Board — Kommand" },
      { name: "description", content: "Kanban board in Kommand." },
      { property: "og:title", content: "Board — Kommand" },
      { property: "og:description", content: "Kanban board in Kommand." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(boardQuery(params.boardId)),
  component: BoardPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Board not found.</div>,
});

type Columns = Record<string, string[]>;

function buildColumns(d: BoardData): Columns {
  const cols: Columns = {};
  for (const l of d.lists) cols[l.id] = [];
  for (const c of [...d.cards].sort((a, b) => a.position - b.position)) cols[c.list_id]?.push(c.id);
  return cols;
}

function BoardPage() {
  const { boardId } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(boardQuery(boardId));
  const key = ["board", boardId];

  const [listOrder, setListOrder] = useState<string[]>(() => data.lists.map((l) => l.id));
  const [columns, setColumns] = useState<Columns>(() => buildColumns(data));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [title, setTitle] = useState(data.board.title);
  const [newList, setNewList] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "calendar">("board");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  useEffect(() => { setView("board"); setSelectedLabels([]); }, [boardId]);

  useEffect(() => {
    if (activeId) return;
    setListOrder(data.lists.map((l) => l.id));
    setColumns(buildColumns(data));
  }, [data, activeId]);
  useEffect(() => setTitle(data.board.title), [data.board.title]);
  const boardType = data.board.board_type;
  const rules = useQuery(userRulesQuery());
  const dueTime = rules.data?.review_due_time;
  useEffect(() => {
    if (boardType !== "power_list" || !dueTime) return;
    ensureReviewCards(boardId, dueTime)
      .then((n) => { if (n > 0) qc.invalidateQueries({ queryKey: ["board", boardId] }); })
      .catch(() => {});
  }, [boardId, boardType, dueTime, rules.dataUpdatedAt, qc]);

  const cardById = useMemo(() => new Map(data.cards.map((c) => [c.id, c])), [data.cards]);
  const listById = useMemo(() => new Map(data.lists.map((l) => [l.id, l])), [data.lists]);
  const goalCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of data.cards) if (c.goal_card_id) m[c.goal_card_id] = (m[c.goal_card_id] ?? 0) + 1;
    return m;
  }, [data.cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const containerOf = (id: string) => {
    if (id.startsWith("list:")) return id.slice(5);
    return Object.keys(columns).find((k) => (columns[k] ?? []).includes(id));
  };

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const a = String(e.active.id);
    if (a.startsWith("list:") || !e.over) return;
    const o = String(e.over.id);
    const from = containerOf(a);
    const to = containerOf(o);
    if (!from || !to || from === to) return;
    setColumns((cols) => {
      const fromItems = (cols[from] ?? []).filter((x) => x !== a);
      const toItems = [...(cols[to] ?? [])];
      const overIdx = o.startsWith("list:") ? toItems.length : toItems.indexOf(o);
      toItems.splice(overIdx < 0 ? toItems.length : overIdx, 0, a);
      return { ...cols, [from]: fromItems, [to]: toItems };
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const a = String(e.active.id);
    const o = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!o) return;

    if (a.startsWith("list:")) {
      if (!o.startsWith("list:") && !containerOf(o)) return;
      const targetList = o.startsWith("list:") ? o.slice(5) : containerOf(o);
      if (!targetList) return;
      const listId = a.slice(5);
      const oldIdx = listOrder.indexOf(listId);
      const newIdx = listOrder.indexOf(targetList);
      if (oldIdx === newIdx) return;
      const order = arrayMove(listOrder, oldIdx, newIdx);
      setListOrder(order);
      const i = order.indexOf(listId);
      const pos = positionBetween(listById.get(order[i - 1] ?? "")?.position, listById.get(order[i + 1] ?? "")?.position);
      qc.setQueryData<BoardData>(key, (d) =>
        d ? { ...d, lists: d.lists.map((l) => (l.id === listId ? { ...l, position: pos } : l)).sort((x, y) => x.position - y.position) } : d,
      );
      const { error } = await supabase.from("lists").update({ position: pos }).eq("id", listId);
      if (error) {
        toast.error("Couldn't save list order");
        qc.invalidateQueries({ queryKey: key });
      }
      return;
    }

    const to = containerOf(o) ?? containerOf(a);
    if (!to) return;
    let items = columns[to] ?? [];
    if (!o.startsWith("list:")) {
      const oldIdx = items.indexOf(a);
      const newIdx = items.indexOf(o);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) items = arrayMove(items, oldIdx, newIdx);
    }
    setColumns((c) => ({ ...c, [to]: items }));
    const i = items.indexOf(a);
    const card = cardById.get(a);
    if (!card) return;
    const pos = positionBetween(cardById.get(items[i - 1] ?? "")?.position, cardById.get(items[i + 1] ?? "")?.position);
    if (card.list_id === to && card.position === pos) return;
    qc.setQueryData<BoardData>(key, (d) =>
      d ? { ...d, cards: d.cards.map((c) => (c.id === a ? { ...c, list_id: to, position: pos } : c)) } : d,
    );
    const { error } = await supabase.from(card.sourceCardId ? "card_mirrors" : "cards").update({ list_id: to, position: pos }).eq("id", a);
    if (error) {
      toast.error("Couldn't save card move");
      qc.invalidateQueries({ queryKey: key });
    }
  }

  async function renameList(list: List, t: string) {
    qc.setQueryData<BoardData>(key, (d) => (d ? { ...d, lists: d.lists.map((l) => (l.id === list.id ? { ...l, title: t } : l)) } : d));
    await supabase.from("lists").update({ title: t }).eq("id", list.id);
  }

  async function toggleCollapse(list: List) {
    const v = !list.collapsed;
    qc.setQueryData<BoardData>(key, (d) => (d ? { ...d, lists: d.lists.map((l) => (l.id === list.id ? { ...l, collapsed: v } : l)) } : d));
    await supabase.from("lists").update({ collapsed: v }).eq("id", list.id);
  }

  async function setListColor(list: List, color: string | null) {
    qc.setQueryData<BoardData>(key, (d) => (d ? { ...d, lists: d.lists.map((l) => (l.id === list.id ? { ...l, color } : l)) } : d));
    const { error } = await supabase.from("lists").update({ color }).eq("id", list.id);
    if (error) toast.error(error.message);
  }

  async function archiveList(list: List) {
    qc.setQueryData<BoardData>(key, (d) => (d ? { ...d, lists: d.lists.filter((l) => l.id !== list.id) } : d));
    await supabase.from("lists").update({ archived: true }).eq("id", list.id);
    toast.success(`Archived "${list.title}"`);
  }

  async function addCard(list: List, t: string) {
    const ids = columns[list.id] ?? [];
    const last = cardById.get(ids[ids.length - 1] ?? "");
    const { data: card, error } = await supabase
      .from("cards")
      .insert({ title: t, list_id: list.id, board_id: boardId, position: positionBetween(last?.position, null) })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    qc.setQueryData<BoardData>(key, (d) => (d ? { ...d, cards: [...d.cards, card as Card] } : d));
  }

  async function addList() {
    if (!newList?.trim()) return setNewList(null);
    const last = data.lists[data.lists.length - 1];
    await supabase.from("lists").insert({ board_id: boardId, title: newList.trim(), position: positionBetween(last?.position, null) });
    setNewList("");
    qc.invalidateQueries({ queryKey: key });
  }

  async function saveTitle() {
    if (!title.trim() || title === data.board.title) return setTitle(data.board.title);
    await supabase.from("boards").update({ title }).eq("id", boardId);
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["boards"] });
  }

  async function toggleStar() {
    await supabase.from("boards").update({ is_starred: !data.board.is_starred }).eq("id", boardId);
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["boards"] });
  }

  async function weeklyReset() {
    const { error } = await supabase.rpc("weekly_reset", { _board_id: boardId });
    if (error) toast.error(error.message);
    else toast.success("Week reset");
    qc.invalidateQueries({ queryKey: key });
  }

  async function archiveCompleted() {
    const { data: n, error } = await supabase.rpc("archive_completed", { _board_id: boardId });
    if (error) toast.error(error.message);
    else toast.success(`Archived ${n ?? 0} cards`);
    qc.invalidateQueries({ queryKey: key });
  }

  const isPower = data.board.board_type === "power_list";
  const isYoutube = data.board.board_type === "youtube";
  const visibleCards = data.cards.filter((card) => matchesLabels(
    data.cardLabels.filter((row) => row.card_id === card.id).map((row) => row.label_id), selectedLabels,
  ));
  const visibleIds = new Set(visibleCards.map((card) => card.id));
  const bgUrl = data.board.background_image ? data.coverUrls[data.board.background_image] : undefined;
  const activeCard = activeId && !activeId.startsWith("list:") ? cardById.get(activeId) : null;

  return (
    <div
      data-board-bg={data.board.background}
      className="flex h-full flex-col bg-cover bg-center"
      style={{ ...boardBgStyle(data.board.background), ...(bgUrl ? { backgroundImage: `linear-gradient(oklch(0 0 0 / 0.25), oklch(0 0 0 / 0.1)), url("${bgUrl}")` } : {}) }}
    >
      <div className="board-text flex flex-wrap items-center gap-2 px-4 py-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="min-w-0 rounded-md bg-transparent px-2 py-1 font-display text-xl font-bold outline-none hover:bg-[oklch(1_0_0/0.12)] focus:bg-[oklch(1_0_0/0.18)]"
          style={{ width: `${Math.max(title.length, 4) + 2}ch` }}
        />
        <button onClick={toggleStar} className="board-ghost rounded-md p-1.5" aria-label="Star">
          <Star className={`h-4 w-4 ${data.board.is_starred ? "fill-current" : ""}`} />
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          {isYoutube && <>
            <div className="flex gap-1" role="group" aria-label="Board view">
              <Button size="sm" variant={view === "board" ? "secondary" : "ghost"} className={view === "board" ? "" : "board-ghost"} aria-pressed={view === "board"} onClick={() => setView("board")}><Columns3 /> Board</Button>
              <Button size="sm" variant={view === "calendar" ? "secondary" : "ghost"} className={view === "calendar" ? "" : "board-ghost"} aria-pressed={view === "calendar"} onClick={() => setView("calendar")}><CalendarDays /> Calendar</Button>
            </div>
            <BoardLabelFilter labels={data.labels} selected={selectedLabels} onChange={setSelectedLabels} />
          </>}
          <RulesDialog />
          <BackgroundPicker board={data.board} />
          <BoardMembers boardId={boardId} ownerId={data.board.owner_id} />
        {isPower && (
          <>
            <button onClick={() => setConfirmReset(true)} className="board-ghost flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium">
              <RotateCcw className="h-4 w-4" /> Weekly Reset
            </button>
            <button onClick={() => setConfirmArchive(true)} className="board-ghost flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium">
              <Archive className="h-4 w-4" /> Archive Completed
            </button>
          </>
        )}
          <DeleteBoardButton board={data.board} className="board-ghost flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium" />
        </div>
      </div>

      {isYoutube && view === "calendar" ? <BoardCalendar key={boardId} data={data} cards={visibleCards} /> : <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="flex min-h-0 flex-1 snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-4 sm:snap-none">
          <SortableContext items={listOrder.map((id) => `list:${id}`)} strategy={horizontalListSortingStrategy}>
            {listOrder.map((id) => {
              const list = listById.get(id);
              if (!list) return null;
              const cards = (columns[id] ?? []).filter((cid) => !isYoutube || visibleIds.has(cid)).map((cid) => cardById.get(cid)).filter(Boolean) as Card[];
              return (
                <ListColumn
                  key={id}
                  list={list}
                  cards={cards}
                  data={data}
                  goalCounts={goalCounts}
                  onRename={(t) => renameList(list, t)}
                  onArchive={() => archiveList(list)}
                  onToggleCollapse={() => toggleCollapse(list)}
                  onColor={(c) => setListColor(list, c)}
                  onAddCard={(t) => addCard(list, t)}
                />
              );
            })}
          </SortableContext>
          <div className="w-[272px] shrink-0 snap-start">
            {newList !== null ? (
              <div className="space-y-2 rounded-xl bg-panel p-2">
                <Input autoFocus value={newList} onChange={(e) => setNewList(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addList()} placeholder="List title" />
                <div className="flex gap-1">
                  <Button size="sm" onClick={addList}>Add list</Button>
                  <Button size="sm" variant="ghost" onClick={() => setNewList(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setNewList("")} className="board-ghost flex w-full items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium">
                <Plus className="h-4 w-4" /> Add another list
              </button>
            )}
          </div>
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="w-[256px] rotate-2 rounded-lg bg-card px-3 py-2 text-card-foreground shadow-lift">
              <CardFaceView card={activeCard} labels={[]} />
            </div>
          )}
        </DragOverlay>
      </DndContext>}

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run the weekly reset?</AlertDialogTitle>
            <AlertDialogDescription>
              Unfinished cards in Monday–Weekend go back to "To Do This Week". Completed cards move to "Complete – Ready to Archive".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={weeklyReset}>Reset week</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive completed cards?</AlertDialogTitle>
            <AlertDialogDescription>Every card in "Complete – Ready to Archive" will be archived.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={archiveCompleted}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Outlet />
    </div>
  );
}
