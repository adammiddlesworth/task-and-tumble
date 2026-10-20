import { describe, expect, it } from "vitest";
import { matchesLabels, publishDay } from "@/lib/board-calendar";

describe("YouTube calendar dates", () => {
  it("keeps target publish dates on their date-only day", () => {
    expect(publishDay("2026-10-20")).toBe("2026-10-20");
  });
  it("puts missing or invalid target dates in the undated group", () => {
    expect(publishDay(null)).toBeNull();
    expect(publishDay("2026-02-30")).toBeNull();
    expect(publishDay("2026-10-20T23:00:00Z")).toBeNull();
  });
});

describe("Card label filters", () => {
  it("shows all cards when no labels are selected", () => {
    expect(matchesLabels([], [])).toBe(true);
    expect(matchesLabels(["green"], [])).toBe(true);
  });
  it("matches any selected label and excludes nonmatching cards", () => {
    expect(matchesLabels(["blue"], ["green", "blue"])).toBe(true);
    expect(matchesLabels(["red"], ["green", "blue"])).toBe(false);
  });
  it("filters cards without labels separately", () => {
    expect(matchesLabels([], ["unlabeled"])).toBe(true);
    expect(matchesLabels(["blue"], ["unlabeled"])).toBe(false);
  });
});