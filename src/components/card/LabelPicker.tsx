import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LABEL_COLORS, type Label } from "@/lib/data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function LabelPicker({ cardId, boardId, labels, selected, inline = false }: { cardId: string; boardId: string; labels: Label[]; selected: string[]; inline?: boolean }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Label> | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["card"] });
    qc.invalidateQueries({ queryKey: ["board"] });
    qc.invalidateQueries({ queryKey: ["source-labels", boardId] });
  };

  async function toggle(id: string) {
    const { error } = selected.includes(id) ? await supabase.from("card_labels").delete().eq("card_id", cardId).eq("label_id", id) : await supabase.from("card_labels").insert({ card_id: cardId, label_id: id });
    if (error) toast.error(error.message);
    refresh();
  }

  async function saveLabel() {
    if (!edit) return;
    const { error } = edit.id ? await supabase.from("labels").update({ name: edit.name ?? "", color: edit.color ?? "green" }).eq("id", edit.id) : await supabase.rpc("add_card_label", { _card_id: cardId, _name: edit.name ?? "", _color: edit.color ?? "green" });
    if (error) { toast.error(error.message); return; }
    setEdit(null);
    refresh();
  }

  const content = (
    <>
        {edit ? (
          <div className="space-y-3">
            <Input autoFocus value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Label name" />
            <div className="flex gap-1.5">
              {LABEL_COLORS.map((c) => (
                <Button key={c} data-label={c} onClick={() => setEdit({ ...edit, color: c })} className={`h-7 flex-1 rounded ${edit.color === c ? "ring-2 ring-ring ring-offset-1" : ""}`} aria-label={c} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveLabel}>Save</Button>
              {edit.id && (
                <Button size="sm" variant="ghost" onClick={async () => { if (!edit.id) return; await supabase.from("labels").delete().eq("id", edit.id); setEdit(null); refresh(); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {labels.map((l) => (
              <div key={l.id} className="flex items-center gap-1.5">
                <Button data-label={l.color} onClick={() => toggle(l.id)} className="flex h-8 flex-1 items-center justify-between rounded px-2 text-left text-sm font-medium text-primary-foreground">
                  {l.name}
                  {selected.includes(l.id) && <Check className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEdit(l)} className="h-7 w-7 text-muted-foreground" aria-label="Edit label"><Pencil className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" className="w-full" onClick={() => setEdit({ color: "green" })}>
              <Plus className="mr-1 h-4 w-4" /> New label
            </Button>
          </div>
        )}
    </>
  );
  if (inline) return content;
  return <Popover onOpenChange={() => setEdit(null)}><PopoverTrigger asChild><Button size="sm" variant="secondary"><Tag className="mr-1 h-4 w-4" /> Labels</Button></PopoverTrigger><PopoverContent className="w-64">{content}</PopoverContent></Popover>;
}
