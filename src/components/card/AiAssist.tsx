import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bot, Check, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { logActivity, updateCard, type Card } from "@/lib/data";
import { StatusPill } from "@/components/badges";
import { Markdown } from "@/components/Markdown";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function AiAssist({ card }: { card: Card }) {
  const qc = useQueryClient();
  const [instr, setInstr] = useState(card.claude_instructions ?? "");
  const [redoNotes, setRedoNotes] = useState<string | null>(null);
  useEffect(() => setInstr(card.claude_instructions ?? ""), [card.claude_instructions]);

  const save = (patch: Partial<Card>) => updateCard(qc, card, patch).catch((e) => toast.error(e.message));

  return (
    <section className="rounded-xl border border-claude/30 bg-claude/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bot className="h-5 w-5 text-claude" />
        <h3 className="font-sans text-sm font-semibold">AI Assist</h3>
        <StatusPill status={card.claude_status} />
        <label className="ml-auto flex items-center gap-2 text-sm">
          Let Claude work on this
          <Switch
            checked={card.claude_enabled}
            onCheckedChange={(on) => {
              save({ claude_enabled: on, claude_status: on ? "queued" : "off" });
              logActivity(card.id, on ? "queued for Claude" : "disabled Claude");
            }}
          />
        </label>
      </div>
      <Textarea
        value={instr}
        onChange={(e) => setInstr(e.target.value)}
        onBlur={() => instr !== (card.claude_instructions ?? "") && save({ claude_instructions: instr })}
        placeholder='What should Claude do? e.g. "Write 5 title options and a 15-second hook"'
        rows={3}
        className="bg-card text-sm"
      />
      {card.claude_last_run_at && (
        <p className="mt-2 text-xs text-muted-foreground">Last run {formatDistanceToNow(new Date(card.claude_last_run_at), { addSuffix: true })}</p>
      )}
      {card.claude_output && (
        <div className="mt-3 rounded-lg border bg-card p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Claude's output</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(card.claude_output ?? "");
                toast.success("Copied");
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <Markdown>{card.claude_output}</Markdown>
        </div>
      )}
      {(card.claude_status === "ready_for_review" || card.claude_status === "failed") && (
        <div className="mt-3 space-y-2">
          {redoNotes !== null && (
            <Textarea autoFocus value={redoNotes} onChange={(e) => setRedoNotes(e.target.value)} placeholder="Notes for the redo…" rows={2} className="bg-card text-sm" />
          )}
          <div className="flex gap-2">
            {card.claude_status === "ready_for_review" && (
              <Button size="sm" onClick={() => { save({ claude_status: "off", claude_enabled: false }); logActivity(card.id, "approved Claude output"); }}>
                <Check className="mr-1 h-4 w-4" /> Approve
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (redoNotes === null) return setRedoNotes("");
                const next = redoNotes.trim() ? `${card.claude_instructions ?? ""}\n\nRedo notes: ${redoNotes.trim()}`.trim() : card.claude_instructions;
                save({ claude_status: "queued", claude_enabled: true, claude_instructions: next });
                logActivity(card.id, "requested redo from Claude");
                setRedoNotes(null);
              }}
            >
              <RotateCcw className="mr-1 h-4 w-4" /> {redoNotes === null ? "Redo" : "Send redo"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
