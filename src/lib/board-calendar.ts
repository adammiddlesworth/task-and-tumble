import { isMatch } from "date-fns";

/** Publish dates are date-only values, never converted through UTC. */
export function publishDay(value?: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && isMatch(value, "yyyy-MM-dd") ? value : null;
}

/** Multiple selected labels match any; the unlabeled option matches only empty assignments. */
export function matchesLabels(labelIds: string[], selected: string[]): boolean {
  return selected.length === 0 || selected.some((id) => id === "unlabeled" ? labelIds.length === 0 : labelIds.includes(id));
}