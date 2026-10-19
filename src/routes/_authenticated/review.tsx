import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bot, Check, ChevronDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { reviewQuery, updateCard, logActivity } from "@/lib/data";
import { CardRow, type CardWithBoard } from "@/components/CardRow";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Claude Review — Command Center" },
      { name: "description", content: "Approve or redo Claude's work across all boards." },
      { property: "og:title", content: "Claude Review — Command Center" },
      { property: "og:description", content: "Approve or redo Claude's work across all boards." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(reviewQuery()),
  component: ReviewPage,
});

function ReviewPage() {
  const { data } = useSuspenseQuery(reviewQuery());
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Claude Review</h1>
      <p className="mb-6 text-sm text-muted-foreground">{data.length} card{data.length === 1 ? "" : "s"} waiting for you</p>
      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Bot className="mx-auto mb-2 h-8 w-8" /> Nothing to review right now.
        </div>
      ) : (
        <div className="space-y-3">{data.map((c) => <ReviewItem key={c.id} card={c as CardWithBoard} />)}</div>
      )}
    </div>
  );
}

function ReviewItem({ card }: { card: CardWithBoard }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const [notes, setNotes] = useState<string | null>(null);
  const done = () => qc.setQueryData<CardWithBoard[]>(["review"], (d) => d?.filter((c) => c.id !== card.id));

  return (
    <CardRow card={card}>
      {card.claude_output && (
        <div className="mt-2">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "" : "-rotate-90"}`} /> Output
          </button>
          {open && <div className="mt-1 rounded-lg bg-muted/50 p-3"><Markdown>{card.claude_output}</Markdown></div>}
        </div>
      )}
      {notes !== null && <Textarea autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for the redo…" rows={2} className="mt-2 text-sm" />}
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={async () => {
          await updateCard(qc, card, { claude_status: "off", claude_enabled: false }).catch((e) => toast.error(e.message));
          logActivity(card.id, "approved Claude output");
          done();
        }}>
          <Check className="mr-1 h-4 w-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={async () => {
          if (notes === null) return setNotes("");
          const instr = notes.trim() ? `${card.claude_instructions ?? ""}\n\nRedo notes: ${notes.trim()}`.trim() : card.claude_instructions;
          await updateCard(qc, card, { claude_status: "queued", claude_instructions: instr }).catch((e) => toast.error(e.message));
          logActivity(card.id, "requested redo from Claude");
          done();
        }}>
          <RotateCcw className="mr-1 h-4 w-4" /> {notes === null ? "Redo" : "Send redo"}
        </Button>
      </div>
    </CardRow>
  );
}
