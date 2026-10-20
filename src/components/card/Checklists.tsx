import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { positionBetween } from "@/lib/position";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type CL = Tables<"checklists"> & { checklist_items: Tables<"checklist_items">[] };

export function Checklists({ cardId, boardId, checklists }: { cardId: string; boardId: string; checklists: CL[] }) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["card"] });
    qc.invalidateQueries({ queryKey: ["board"] });
  };

  async function addChecklist() {
    const last = checklists[checklists.length - 1];
    await supabase.from("checklists").insert({ card_id: cardId, title: "Checklist", position: positionBetween(last?.position, null) });
    refresh();
  }

  return (
    <section className="space-y-4">
      {checklists.map((cl) => (
        <ChecklistBlock key={cl.id} cl={cl} refresh={refresh} />
      ))}
      <Button size="sm" variant="secondary" onClick={addChecklist}>
        <CheckSquare className="mr-1 h-4 w-4" /> Add checklist
      </Button>
    </section>
  );
}

function ChecklistBlock({ cl, refresh }: { cl: CL; refresh: () => void }) {
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState(cl.title);
  const done = cl.checklist_items.filter((i) => i.is_done).length;
  const total = cl.checklist_items.length;

  async function addItem() {
    if (!draft.trim()) return;
    const last = cl.checklist_items[cl.checklist_items.length - 1];
    await supabase.from("checklist_items").insert({ checklist_id: cl.id, text: draft.trim(), position: positionBetween(last?.position, null) });
    setDraft("");
    refresh();
  }

  async function saveTitle() {
    const next = title.trim();
    if (!next || next === cl.title) {
      setTitle(cl.title);
      return;
    }
    await supabase.from("checklists").update({ title: next }).eq("id", cl.id);
    refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-muted-foreground" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") { setTitle(cl.title); (e.target as HTMLInputElement).blur(); }
          }}
          aria-label="Checklist title"
          className="flex-1 rounded bg-transparent px-1 text-sm font-semibold outline-none hover:bg-muted/60 focus:bg-muted/60"
        />
        <button onClick={async () => { await supabase.from("checklists").delete().eq("id", cl.id); refresh(); }} className="text-muted-foreground hover:text-destructive" aria-label="Delete checklist">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-8 text-xs text-muted-foreground">{total ? Math.round((done / total) * 100) : 0}%</span>
        <Progress value={total ? (done / total) * 100 : 0} className="h-1.5" />
      </div>
      {cl.checklist_items.map((it) => (
        <ChecklistItemRow key={it.id} item={it} refresh={refresh} />
      ))}
      <div className="flex gap-2 pl-1">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder="Add an item" className="h-8 text-sm" />
        <Button size="sm" variant="ghost" onClick={addItem}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
