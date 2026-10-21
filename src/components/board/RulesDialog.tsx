import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutomationsPanel } from "@/components/board/AutomationsPanel";
import { DEFAULT_RULES, saveUserRules, userRulesQuery, type UserRules } from "@/lib/reviews";

export function RulesDialog({ boardId, onSaved }: { boardId: string; onSaved?: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery(userRulesQuery());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<UserRules>(DEFAULT_RULES);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open && data) setDraft(data); }, [open, data]);

  async function save() {
    setBusy(true);
    try {
      await saveUserRules(draft);
      await qc.invalidateQueries({ queryKey: ["user-rules"] });
      toast.success("Rules saved");
      setOpen(false);
      onSaved?.();
    } catch {
      toast.error("Couldn't save rules");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="board-ghost flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium">
          <Wand2 className="h-4 w-4" /> Rules
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rules</DialogTitle>
          <DialogDescription>Automate this board, or set your personal review rules.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board">Board automations</TabsTrigger>
            <TabsTrigger value="personal">My reviews</TabsTrigger>
          </TabsList>
          <TabsContent value="board"><AutomationsPanel boardId={boardId} /></TabsContent>
          <TabsContent value="personal">
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span><span className="block text-sm font-medium">Daily Review card</span><span className="text-xs text-muted-foreground">Added to today's list on your Power List</span></span>
            <Switch checked={draft.daily_review} onCheckedChange={(v) => setDraft({ ...draft, daily_review: v })} aria-label="Daily Review card" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span><span className="block text-sm font-medium">Weekly Review card</span><span className="text-xs text-muted-foreground">Added every Friday</span></span>
            <Switch checked={draft.weekly_review} onCheckedChange={(v) => setDraft({ ...draft, weekly_review: v })} aria-label="Weekly Review card" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span><span className="block text-sm font-medium">Review due time</span><span className="text-xs text-muted-foreground">Applies to new review cards</span></span>
            <input type="time" value={draft.review_due_time} onChange={(e) => setDraft({ ...draft, review_due_time: e.target.value || "17:00" })} className="rounded-md border border-input bg-background px-2 py-1 text-sm" aria-label="Review due time" />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>Save rules</Button>
        </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
