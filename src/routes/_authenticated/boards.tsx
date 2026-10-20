import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Palette, Pencil, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BOARD_COLORS, boardBgStyle, boardsQuery, isCustomColor, type Board } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteBoardButton } from "@/components/board/DeleteBoardButton";

const YT_LISTS = ["Ideas", "Researching", "Scripting", "Ready to Film", "Editing", "Title & Thumbnail", "Scheduled", "Published"];

export const Route = createFileRoute("/_authenticated/boards")({
  head: () => ({
    meta: [
      { title: "Boards — Command Center" },
      { name: "description", content: "All your Command Center boards." },
      { property: "og:title", content: "Boards — Command Center" },
      { property: "og:description", content: "All your Command Center boards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(boardsQuery()),
  component: BoardsPage,
});

function BoardsPage() {
  const qc = useQueryClient();
  const { data: boards } = useSuspenseQuery(boardsQuery());
  const [editing, setEditing] = useState<Board | "new" | null>(null);

  async function toggleStar(b: Board) {
    qc.setQueryData<(Board & { bgUrl: string | null })[]>(["boards"], (d) => d?.map((x) => (x.id === b.id ? { ...x, is_starred: !b.is_starred } : x)));
    await supabase.from("boards").update({ is_starred: !b.is_starred }).eq("id", b.id);
  }

  const sorted = [...boards].sort((a, b) => Number(b.is_starred) - Number(a.is_starred) || a.position - b.position);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Boards</h1>
          <p className="text-sm text-muted-foreground">{boards.length} boards</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1 h-4 w-4" /> New board
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((b) => (
          <div key={b.id} data-board-bg={b.background} style={{ ...boardBgStyle(b.background), ...(b.bgUrl ? { backgroundImage: `linear-gradient(oklch(0 0 0 / 0.35), oklch(0 0 0 / 0.15)), url("${b.bgUrl}")` } : {}) }} className="group relative h-32 bg-cover bg-center overflow-hidden rounded-xl shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
            <Link to="/board/$boardId" params={{ boardId: b.id }} className="board-text absolute inset-0 flex flex-col justify-between p-4">
              <span className="font-display text-xl font-bold leading-tight">{b.title}</span>
              <span className="text-xs uppercase tracking-wider opacity-75">{b.board_type === "power_list" ? "Power List" : "YouTube pipeline"}</span>
            </Link>
            <div className="absolute right-2 top-2 flex gap-1">
              <button onClick={() => setEditing(b)} className="board-ghost rounded-md p-1.5 opacity-0 transition group-hover:opacity-100" aria-label="Edit board">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => toggleStar(b)} className="board-ghost rounded-md p-1.5" aria-label="Star board">
                <Star className={`h-3.5 w-3.5 ${b.is_starred ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {editing && <BoardDialog board={editing === "new" ? null : editing} maxPos={Math.max(0, ...boards.map((b) => b.position))} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BoardDialog({ board, maxPos, onClose }: { board: Board | null; maxPos: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(board?.title ?? "");
  const [bg, setBg] = useState(board?.background ?? "ocean");
  const [type, setType] = useState<"youtube" | "power_list">((board?.board_type as "youtube") ?? "youtube");

  async function save() {
    if (!title.trim()) return;
    if (board) {
      const { error } = await supabase.from("boards").update({ title, background: bg }).eq("id", board.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from("boards").insert({ title, background: bg, board_type: type, position: maxPos + 1000 }).select().single();
      if (error) { toast.error(error.message); return; }
      if (type === "youtube") {
        await supabase.from("lists").insert(YT_LISTS.map((t, i) => ({ board_id: data.id, title: t, position: (i + 1) * 1000 })));
      }
    }
    qc.invalidateQueries({ queryKey: ["boards"] });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{board ? "Edit board" : "New board"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Board title" onKeyDown={(e) => e.key === "Enter" && save()} />
          <div className="flex flex-wrap gap-2">
            {BOARD_COLORS.map((c) => (
              <button key={c} data-board-bg={c} onClick={() => setBg(c)} aria-label={c} className={`h-8 w-10 rounded-md ring-offset-2 ring-offset-background ${bg === c ? "ring-2 ring-ring" : ""}`} />
            ))}
            <label title="Custom color" style={boardBgStyle(bg)} className={`relative flex h-8 w-10 cursor-pointer items-center justify-center rounded-md border border-dashed border-border ring-offset-2 ring-offset-background ${isCustomColor(bg) ? "ring-2 ring-ring" : ""}`}>
              <Palette className="h-4 w-4" />
              <input type="color" aria-label="Custom color" value={isCustomColor(bg) ? bg : "#1e3a5f"} onChange={(e) => setBg(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
          </div>
          {!board && (
            <Select value={type} onValueChange={(v) => setType(v as "youtube")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube pipeline</SelectItem>
                <SelectItem value="power_list">Blank / Power List style</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button className="w-full" onClick={save}>Save</Button>
          {board && (
            <DeleteBoardButton
              board={board}
              onDeleted={onClose}
              className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
