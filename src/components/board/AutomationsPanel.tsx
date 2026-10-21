import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LABEL_COLORS } from "@/lib/data";
import {
  automationsQuery, describeAutomation, destinationsQuery, WEEKDAYS,
  type Automation, type AutomationAction, type TriggerType,
} from "@/lib/automations";

const sel = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";
const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

type Draft = { id?: string; trigger_type: TriggerType; trigger_list_id: string | null; actions: AutomationAction[] };

function newAction(type: AutomationAction["type"], boardId: string, firstList: string): AutomationAction {
  switch (type) {
    case "add_checklist": return { type, title: "Checklist", items: [] };
    case "move": case "copy": return { type, board_id: boardId, list_id: firstList, place: "top" };
    case "set_due": return { type, mode: "days", days: 1, time: "17:00", tz: tz() };
    case "add_label": return { type, name: "", color: "green" };
    case "mark_complete": return { type };
  }
}

export function AutomationsPanel({ boardId }: { boardId: string }) {
  const qc = useQueryClient();
  const { data: rules = [] } = useQuery(automationsQuery(boardId));
  const { data: dest } = useQuery(destinationsQuery());
  const boards = dest?.boards ?? [];
  const lists = dest?.lists ?? [];
  const boardLists = lists.filter((l) => l.board_id === boardId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["automations", boardId] });

  async function toggle(r: Automation, enabled: boolean) {
    const { error } = await supabase.from("board_automations").update({ enabled }).eq("id", r.id);
    if (error) toast.error("Couldn't update rule");
    refresh();
  }
  async function remove(r: Automation) {
    const { error } = await supabase.from("board_automations").delete().eq("id", r.id);
    if (error) toast.error("Couldn't delete rule");
    refresh();
  }
  async function save() {
    if (!draft) return;
    if (draft.trigger_type === "card_added_to_list" && !draft.trigger_list_id) { toast.error("Pick a list for the trigger"); return; }
    if (draft.actions.length === 0) { toast.error("Add at least one action"); return; }
    setBusy(true);
    const row = { board_id: boardId, trigger_type: draft.trigger_type, trigger_list_id: draft.trigger_type === "card_added_to_list" ? draft.trigger_list_id : null, actions: draft.actions as never };
    const { error } = draft.id
      ? await supabase.from("board_automations").update(row).eq("id", draft.id)
      : await supabase.from("board_automations").insert(row);
    setBusy(false);
    if (error) { toast.error("Couldn't save rule"); return; }
    toast.success("Rule saved");
    setDraft(null);
    refresh();
  }

  if (draft) {
    const setAction = (i: number, a: AutomationAction) => setDraft({ ...draft, actions: draft.actions.map((x, j) => (j === i ? a : x)) });
    return (
      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Trigger</h3>
          <select className={sel} aria-label="Trigger" value={draft.trigger_type} onChange={(e) => setDraft({ ...draft, trigger_type: e.target.value as TriggerType, trigger_list_id: e.target.value === "card_added_to_list" ? (draft.trigger_list_id ?? boardLists[0]?.id ?? null) : null })}>
            <option value="card_added_to_board">when a card is added to the board</option>
            <option value="card_added_to_list">when a card is added to list…</option>
          </select>
          {draft.trigger_type === "card_added_to_list" && (
            <select className={sel} aria-label="Trigger list" value={draft.trigger_list_id ?? ""} onChange={(e) => setDraft({ ...draft, trigger_list_id: e.target.value })}>
              {boardLists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          )}
        </section>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Actions</h3>
          {draft.actions.map((a, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex gap-2">
                <select className={sel} aria-label={`Action ${i + 1}`} value={a.type} onChange={(e) => setAction(i, newAction(e.target.value as AutomationAction["type"], boardId, boardLists[0]?.id ?? ""))}>
                  <option value="add_checklist">add a checklist</option>
                  <option value="move">move the card</option>
                  <option value="copy">copy the card</option>
                  <option value="set_due">set the due date</option>
                  <option value="add_label">add a label</option>
                  <option value="mark_complete">mark the card complete</option>
                </select>
                <Button size="icon" variant="ghost" aria-label="Remove action" onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_, j) => j !== i) })}><Trash2 /></Button>
              </div>
              {a.type === "add_checklist" && <>
                <Input value={a.title} onChange={(e) => setAction(i, { ...a, title: e.target.value })} placeholder="Checklist name" aria-label="Checklist name" />
                <Textarea value={a.items.join("\n")} onChange={(e) => setAction(i, { ...a, items: e.target.value.split("\n") })} placeholder="One item per line" rows={4} aria-label="Checklist items" />
              </>}
              {(a.type === "move" || a.type === "copy") && <div className="grid grid-cols-3 gap-2">
                <select className={sel} aria-label="Position" value={a.place} onChange={(e) => setAction(i, { ...a, place: e.target.value as "top" | "bottom" })}>
                  <option value="top">to the top</option><option value="bottom">to the bottom</option>
                </select>
                <select className={sel} aria-label="Board" value={a.board_id} onChange={(e) => setAction(i, { ...a, board_id: e.target.value, list_id: lists.find((l) => l.board_id === e.target.value)?.id ?? "" })}>
                  {boards.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
                <select className={sel} aria-label="List" value={a.list_id} onChange={(e) => setAction(i, { ...a, list_id: e.target.value })}>
                  {lists.filter((l) => l.board_id === a.board_id).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>}
              {a.type === "set_due" && <div className="grid grid-cols-3 gap-2">
                <select className={sel} aria-label="Due rule" value={a.mode} onChange={(e) => setAction(i, e.target.value === "days" ? { type: "set_due", mode: "days", days: 1, time: a.time, tz: a.tz } : { type: "set_due", mode: "next_weekday", weekday: 2, time: a.time, tz: a.tz })}>
                  <option value="days">in N days</option><option value="next_weekday">the next…</option>
                </select>
                {a.mode === "days"
                  ? <Input type="number" min={0} value={a.days} onChange={(e) => setAction(i, { ...a, days: Math.max(0, Number(e.target.value) || 0) })} aria-label="Days" />
                  : <select className={sel} aria-label="Weekday" value={a.weekday} onChange={(e) => setAction(i, { ...a, weekday: Number(e.target.value) })}>
                      {WEEKDAYS.slice(1).map((d, k) => <option key={d} value={k + 1}>{d}</option>)}
                    </select>}
                <Input type="time" value={a.time} onChange={(e) => setAction(i, { ...a, time: e.target.value || "17:00" })} aria-label="Due time" />
              </div>}
              {a.type === "add_label" && <div className="grid grid-cols-2 gap-2">
                <Input value={a.name} onChange={(e) => setAction(i, { ...a, name: e.target.value })} placeholder="Label name" aria-label="Label name" />
                <select className={sel} aria-label="Label color" value={a.color} onChange={(e) => setAction(i, { ...a, color: e.target.value })}>
                  {LABEL_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>}
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setDraft({ ...draft, actions: [...draft.actions, newAction("add_checklist", boardId, boardLists[0]?.id ?? "")] })}><Plus /> Add another action</Button>
          <p className="text-xs text-muted-foreground">Actions after a copy apply to the new copy.</p>
        </section>
        <div className="rounded-md bg-muted p-3 font-mono text-xs">{describeAutomation(draft, boards, lists)}</div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>Save rule</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Automations for this board, shared with its members.</p>
        <Button size="sm" onClick={() => setDraft({ trigger_type: "card_added_to_board", trigger_list_id: null, actions: [newAction("add_checklist", boardId, boardLists[0]?.id ?? "")] })}><Plus /> Create automation</Button>
      </div>
      {rules.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No automations yet.</p>}
      {rules.map((r) => (
        <div key={r.id} className="space-y-2 rounded-md border border-border p-3">
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label="Edit rule" onClick={() => setDraft({ id: r.id, trigger_type: r.trigger_type, trigger_list_id: r.trigger_list_id, actions: r.actions })}><Pencil /></Button>
            <Button size="icon" variant="ghost" aria-label="Delete rule" onClick={() => remove(r)}><Trash2 /></Button>
          </div>
          <p className="rounded-md bg-muted p-2 font-mono text-xs">{describeAutomation(r, boards, lists)}</p>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={r.enabled} onCheckedChange={(v) => toggle(r, v)} aria-label="Enable on this board" /> Enable on this board
          </label>
        </div>
      ))}
    </div>
  );
}
