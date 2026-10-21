import { describe, expect, it } from "vitest";
import { DAILY_QUESTIONS, reviewTargets, WEEKLY_QUESTIONS } from "@/lib/reviews";

describe("review cards", () => {
  it("are due at 5 PM local time on the local date", () => {
    const { today, due } = reviewTargets(new Date(2026, 9, 21, 8, 36));
    expect(today).toBe("2026-10-21");
    const d = new Date(due);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 21, 17, 0]);
  });
  it("uses the local date late in the evening", () => {
    expect(reviewTargets(new Date(2026, 9, 21, 23, 30)).today).toBe("2026-10-21");
  });
  it("daily rates four areas 1-5, weekly rates ten life areas 1-10", () => {
    expect(DAILY_QUESTIONS.filter((q) => q.type === "rating").map((q) => q.max)).toEqual([5, 5, 5, 5]);
    expect(WEEKLY_QUESTIONS.filter((q) => q.type === "rating" && q.max === 10)).toHaveLength(10);
  });
});
