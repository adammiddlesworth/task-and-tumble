import { format } from "date-fns";
import { Clock } from "lucide-react";
import { dueStatus } from "@/lib/due";
import type { ClaudeStatus } from "@/lib/data";

const STATUS_LABEL: Record<ClaudeStatus, string> = {
  off: "Off",
  queued: "Queued",
  working: "Working",
  ready_for_review: "Ready for review",
  failed: "Failed",
};

export function StatusPill({ status }: { status: string }) {
  if (status === "off") return null;
  return (
    <span data-status={status} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
      {STATUS_LABEL[status as ClaudeStatus] ?? status}
    </span>
  );
}

export function DueBadge({ due, complete }: { due: string | null; complete: boolean }) {
  const s = dueStatus(due, complete);
  if (!s || !due) return null;
  return (
    <span data-due={s} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium">
      <Clock className="h-3 w-3" />
      {format(new Date(due), "MMM d")}
    </span>
  );
}
