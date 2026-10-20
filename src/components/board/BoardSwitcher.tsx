import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Check, Clock, Search, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { boardBgStyle, boardsQuery, type Board } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type BoardRow = Board & { bgUrl: string | null };

const RECENT_KEY = "cc-recent-boards";

/** Board ids the user has opened most recently, newest first (max 8). */
export function recentBoardIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function rememberRecentBoard(boardId: string) {
  try {
    const next = [boardId, ...recentBoardIds().filter((id) => id !== boardId)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — recent list just stays empty */
  }
}

export function BoardSwitcher({ currentBoardId }: { currentBoardId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setQ("");
      }}
    >
      <PopoverTrigger
        aria-label="Switch boards"
        title="Switch boards"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-border/50 bg-nav px-4 py-2.5 text-sm font-semibold text-nav-foreground shadow-lift transition hover:brightness-110"
      >
        <ArrowLeftRight className="h-4 w-4" />
        <span className="hidden sm:inline">Switch boards</span>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" sideOffset={12} className="w-[min(92vw,26rem)] p-0">
        {open && <Switcher q={q} setQ={setQ} currentBoardId={currentBoardId} onPick={() => setOpen(false)} />}
      </PopoverContent>
    </Popover>
  );
}

function Switcher({
  q,
  setQ,
  currentBoardId,
  onPick,
}: {
  q: string;
  setQ: (v: string) => void;
  currentBoardId: string | undefined;
  onPick: () => void;
}) {
  const qc = useQueryClient();
  const { data: boards } = useSuspenseQuery(boardsQuery());
  const [recent] = useState<string[]>(() => recentBoardIds());

  const term = q.trim().toLowerCase();
  const matches = term ? boards.filter((b) => b.title.toLowerCase().includes(term)) : boards;
  const byId = (id: string) => matches.find((b) => b.id === id);
  const starred = matches.filter((b) => b.is_starred);
  const recentBoards = recent.map(byId).filter((b): b is BoardRow => !!b && !b.is_starred);
  const rest = matches.filter((b) => !b.is_starred && !recent.includes(b.id));
  const searching = term.length > 0;

  async function toggleStar(b: BoardRow) {
    qc.setQueryData<BoardRow[]>(["boards"], (d) => d?.map((x) => (x.id === b.id ? { ...x, is_starred: !b.is_starred } : x)));
    await supabase.from("boards").update({ is_starred: !b.is_starred }).eq("id", b.id);
  }

  return (
    <div className="flex flex-col">
      <div className="relative border-b border-border p-3">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your boards"
          className="h-9 pl-8"
        />
      </div>
      <div className="max-h-[55vh] overflow-auto p-3">
        {matches.length === 0 && <p className="px-1 py-6 text-center text-sm text-muted-foreground">No boards match.</p>}

        {!searching && starred.length > 0 && (
          <Section title="Starred">
            <Grid boards={starred} currentBoardId={currentBoardId} onPick={onPick} onToggleStar={toggleStar} />
          </Section>
        )}

        {!searching && recentBoards.length > 0 && (
          <Section title="Recent" icon={<Clock className="h-3.5 w-3.5" />}>
            <Grid boards={recentBoards} currentBoardId={currentBoardId} onPick={onPick} onToggleStar={toggleStar} />
          </Section>
        )}

        {(searching ? matches.length > 0 : rest.length > 0) && (
          <Section title={searching ? "Boards" : "All boards"}>
            <Grid
              boards={searching ? matches : rest}
              currentBoardId={currentBoardId}
              onPick={onPick}
              onToggleStar={toggleStar}
            />
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function Grid({
  boards,
  currentBoardId,
  onPick,
  onToggleStar,
}: {
  boards: BoardRow[];
  currentBoardId: string | undefined;
  onPick: () => void;
  onToggleStar: (b: BoardRow) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {boards.map((b) => (
        <BoardTile
          key={b.id}
          board={b}
          current={b.id === currentBoardId}
          onPick={onPick}
          onToggleStar={onToggleStar}
        />
      ))}
    </div>
  );
}

function BoardTile({
  board,
  current,
  onPick,
  onToggleStar,
}: {
  board: BoardRow;
  current: boolean;
  onPick: () => void;
  onToggleStar: (b: BoardRow) => void;
}) {
  return (
    <div
      data-board-bg={board.background}
      style={{
        ...boardBgStyle(board.background),
        ...(board.bgUrl
          ? { backgroundImage: `linear-gradient(oklch(0 0 0 / 0.35), oklch(0 0 0 / 0.15)), url("${board.bgUrl}")` }
          : {}),
      }}
      className={`board-text relative h-20 overflow-hidden rounded-lg bg-cover bg-center transition hover:-translate-y-0.5 ${
        current ? "ring-2 ring-ring" : ""
      }`}
    >
      <Link
        to="/board/$boardId"
        params={{ boardId: board.id }}
        onClick={onPick}
        className="absolute inset-0 flex flex-col justify-between p-2.5"
      >
        <span className="line-clamp-2 font-display text-sm font-bold leading-tight">{board.title}</span>
        {current && (
          <span className="flex items-center gap-1 text-[11px] font-semibold opacity-90">
            <Check className="h-3 w-3" /> Current
          </span>
        )}
      </Link>
      <button
        type="button"
        aria-label={board.is_starred ? `Unstar ${board.title}` : `Star ${board.title}`}
        onClick={() => onToggleStar(board)}
        className="board-ghost absolute right-1.5 top-1.5 z-10 rounded-md p-1"
      >
        <Star className={`h-3.5 w-3.5 ${board.is_starred ? "fill-current" : ""}`} />
      </button>
    </div>
  );
}
