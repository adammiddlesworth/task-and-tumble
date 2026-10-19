export type DueStatus = "complete" | "overdue" | "soon" | "upcoming";

/** gray = upcoming, yellow = within 24h, red = overdue, green = complete */
export function dueStatus(
  due: string | Date | null | undefined,
  isComplete: boolean,
  now: Date = new Date(),
): DueStatus | null {
  if (!due) return null;
  if (isComplete) return "complete";
  const ms = new Date(due).getTime() - now.getTime();
  if (ms < 0) return "overdue";
  if (ms <= 24 * 60 * 60 * 1000) return "soon";
  return "upcoming";
}
