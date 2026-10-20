import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COVER_BUCKET, updateCard, type Card } from "@/lib/data";
import { Button } from "@/components/ui/button";

/** Upload / replace / remove a card's cover image. */
export function useCoverActions(card: Card) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["board", card.board_id] });
    qc.invalidateQueries({ queryKey: ["card", card.id] });
  };

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop() || "jpg";
      if (!u.user) throw new Error("Sign in to upload a cover");
      const path = `${u.user.id}/${card.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw error;
      await updateCard(qc, card, { cover_url: path });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    await updateCard(qc, card, { cover_url: null });
    refresh();
  }

  const fileInput = (
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
  );
  return { pick: () => input.current?.click(), remove, busy, fileInput };
}

export function CoverBanner({ card, url }: { card: Card; url: string | null }) {
  const { pick, remove, busy, fileInput } = useCoverActions(card);
  if (!url) return fileInput;
  return (
    <div className="group relative">
      {fileInput}
      <img src={url} alt="Card cover" className="h-48 w-full object-cover sm:h-56" />
      <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
        <Button size="sm" variant="secondary" onClick={pick} disabled={busy}>
          <ImagePlus className="mr-1 h-4 w-4" /> Change
        </Button>
        <Button size="sm" variant="secondary" onClick={remove}>
          <Trash2 className="mr-1 h-4 w-4" /> Remove
        </Button>
      </div>
    </div>
  );
}

export function CoverButton({ card, allowRemove = false }: { card: Card; allowRemove?: boolean }) {
  const { pick, remove, busy, fileInput } = useCoverActions(card);
  return (
    <>
      {fileInput}
      <Button size="sm" variant="secondary" onClick={pick} disabled={busy}>
        <ImagePlus className="mr-1 h-4 w-4" /> {busy ? "Uploading…" : card.cover_url ? "Change cover" : "Cover"}
      </Button>
      {allowRemove && card.cover_url && <Button variant="ghost" size="sm" onClick={() => remove().catch((e) => toast.error(e.message))}><Trash2 className="mr-1 h-4 w-4" /> Remove cover</Button>}
    </>
  );
}
