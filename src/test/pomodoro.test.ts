import { describe, expect, it } from "vitest";
import { durationSeconds, formatTimer, secondsRemaining } from "@/lib/pomodoro";

describe("Pomodoro schedules", () => {
  it("uses 25 minutes of focus and 5 minutes of break for 25/5", () => {
    expect(durationSeconds("25/5", "focus")).toBe(1500);
    expect(durationSeconds("25/5", "break")).toBe(300);
  });
  it("uses 50 minutes of focus and 10 minutes of break for 50/10", () => {
    expect(durationSeconds("50/10", "focus")).toBe(3000);
    expect(durationSeconds("50/10", "break")).toBe(600);
  });
  it("uses elapsed wall time even after a delayed tick and stops at zero", () => {
    expect(secondsRemaining(100000, 34500)).toBe(66);
    expect(secondsRemaining(100000, 110000)).toBe(0);
  });
  it("formats a stable minutes and seconds display", () => {
    expect(formatTimer(1500)).toBe("25:00");
    expect(formatTimer(61)).toBe("01:01");
    expect(formatTimer(0)).toBe("00:00");
  });
});