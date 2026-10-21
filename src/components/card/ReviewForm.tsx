import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DAILY_QUESTIONS, WEEKLY_QUESTIONS, type Question } from "@/lib/reviews";
import type { Json, Tables } from "@/integrations/supabase/types";

type Answers = Record<string, string | number | boolean | null>;

export function ReviewForm({ review, onSubmitted }: { review: Tables<"reviews">; onSubmitted: () => void }) {
  const qc = useQueryClient();
  const questions = review.kind === "weekly" ? WEEKLY_QUESTIONS : DAILY_QUESTIONS;
  const [answers, setAnswers] = useState<Answers>((review.answers as Answers) ?? {});
  const [saving, setSaving] = useState(false);
  useEffect(() => setAnswers((review.answers as Answers) ?? {}), [review.id, review.answers]);
  const set = (k: string, v: Answers[string]) => setAnswers((a) => ({ ...a, [k]: v }));

  async function persist(submit: boolean) {
    setSaving(true);
    const patch: { answers: Json; submitted_at?: string } = { answers: answers as Json };
    if (submit) patch.submitted_at = new Date().toISOString();
    const { error } = await supabase.from("reviews").update(patch).eq("id", review.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["review", review.card_id] });
    if (submit) { toast.success("Review submitted"); onSubmitted(); } else toast.success("Draft saved");
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold">{review.kind === "weekly" ? "Weekly Review" : "Daily Review"}</h3>
        <span className="text-xs text-muted-foreground">
          {format(parseISO(review.review_date), "EEE, MMM d")}
          {review.submitted_at && ` · submitted ${format(new Date(review.submitted_at), "h:mm a")}`}
        </span>
      </div>
      {review.kind === "weekly" && <SectionTitle>Weekly Learning Review</SectionTitle>}
      {questions.map((q, i) => (
        <div key={q.key}>
          {review.kind === "weekly" && q.key === "life_health" && <SectionTitle>Weekly Life Review (1–10)</SectionTitle>}
          {review.kind === "daily" && q.key === "clarity" && i > 0 && <SectionTitle>Ratings (1–5)</SectionTitle>}
          <Field q={q} value={answers[q.key] ?? null} onChange={(v) => set(q.key, v)} />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" disabled={saving} onClick={() => persist(false)}>Save draft</Button>
        <Button disabled={saving} onClick={() => persist(true)}>{review.submitted_at ? "Update review" : "Submit review"}</Button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="pt-2 text-xs font-semibold uppercase tracking-wider text-primary">{children}</h4>;
}

function Field({ q, value, onChange }: { q: Question; value: Answers[string]; onChange: (v: Answers[string]) => void }) {
  if (q.type === "text")
    return (
      <label className="block space-y-1">
        <span className="text-sm font-medium">{q.label}</span>
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={q.key === "win_stack" ? 4 : 2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
    );
  const opts: { v: Answers[string]; label: string }[] =
    q.type === "yesno" ? [{ v: true, label: "Yes" }, { v: false, label: "No" }] : Array.from({ length: q.max ?? 5 }, (_, i) => ({ v: i + 1, label: String(i + 1) }));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-medium">{q.label}</span>
      <div className="flex gap-1">
        {opts.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(value === o.v ? null : o.v)}
            className={`h-8 min-w-8 rounded-md border px-2 text-sm transition-colors ${value === o.v ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:border-primary"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
