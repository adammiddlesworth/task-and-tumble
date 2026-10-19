import { describe, expect, it } from "vitest";
import { dueStatus } from "@/lib/due";
import { positionBetween } from "@/lib/position";

const now = new Date("2026-10-19T12:00:00Z");

describe("due badge", () => {
  it("is green when complete even if overdue", () => {
    expect(dueStatus("2026-10-01T00:00:00Z", true, now)).toBe("complete");
  });
  it("is red when overdue", () => {
    expect(dueStatus("2026-10-19T11:00:00Z", false, now)).toBe("overdue");
  });
  it("is yellow within 24h", () => {
    expect(dueStatus("2026-10-20T11:00:00Z", false, now)).toBe("soon");
  });
  it("is gray beyond 24h", () => {
    expect(dueStatus("2026-10-21T12:00:00Z", false, now)).toBe("upcoming");
  });
});

describe("positionBetween", () => {
  it("averages neighbours", () => expect(positionBetween(1000, 2000)).toBe(1500));
  it("appends after last", () => expect(positionBetween(3000, null)).toBe(4000));
  it("prepends before first", () => expect(positionBetween(null, 1000)).toBe(0));
});
