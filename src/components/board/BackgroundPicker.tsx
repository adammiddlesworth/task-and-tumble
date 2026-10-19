import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Paintbrush, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BOARD_COLORS, COVER_BUCKET, type Board } from "@/lib/data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function BackgroundPicker({ board }: { board: Board }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["board", board.id] });
    qc.invalidateQueries({ queryKey: ["boards"] });
  };

  async function setColor(c: string) {
    const old = board.background_image;
    await supabase.from("boards").update({ background: c, background_image: null }).eq("id", board.id);
    if (old) await supabase.storage.from(COVER_BUCKET).remove([old]);
    refresh();
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${u.user!.id}/boards/${board.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw error;
      const old = board.background_image;
      const { error: e2 } = await supabase.from("boards").update({ background_image: path }).eq("id", board.id);
      if (e2) throw e2;
      if (old) await supabase.storage.from(COVER_BUCKET).remove([old]);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeImage() {
    const old = board.background_image;
    await supabase.from("boards").update({ background_image: null }).eq("id", board.id);
    if (old) await supabase.storage.from(COVER_BUCKET).remove([old]);
    refresh();
  }

  return (
    <Popover>
      <PopoverTrigger className="board-ghost flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium">
        <Paintbrush className="h-4 w-4" /> Background
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colors</p>
        <div className="grid grid-cols-4 gap-2">
          {BOARD_COLORS.map((c) => (
            <button
              key={c}
              data-board-bg={c}
              onClick={() => setColor(c)}
              aria-label={c}
              className={`h-10 rounded-md ring-offset-2 ring-offset-background ${!board.background_image && board.background === c ? "ring-2 ring-ring" : ""}`}
            />
          ))}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image</p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => input.current?.click()} disabled={busy}>
            <ImagePlus className="mr-1 h-4 w-4" /> {busy ? "Uploading…" : board.background_image ? "Change" : "Upload"}
          </Button>
          {board.background_image && (
            <Button size="sm" variant="ghost" onClick={removeImage} aria-label="Remove image">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
