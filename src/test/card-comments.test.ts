import { describe, expect, it, vi, beforeEach } from "vitest";
import { commentBody, postComment } from "@/lib/card-comments";

const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ insert: mocks.insert });
  mocks.insert.mockResolvedValue({ error: null });
});
describe("card comments", () => {
  it("posts mirror comments on the canonical card", async () => {
    await postComment({ id: "mirror", sourceCardId: "original" }, " Shared comment ");
    expect(mocks.insert).toHaveBeenCalledWith({ card_id: "original", body: "Shared comment" });
  });
  it("keeps independent copy comments separate", async () => {
    await postComment({ id: "copy" }, "Copy comment");
    expect(mocks.insert).toHaveBeenCalledWith({ card_id: "copy", body: "Copy comment" });
  });
  it("does not let the caller choose an author", async () => {
    await postComment({ id: "card" }, "Hello");
    expect(mocks.insert.mock.calls[0]?.[0]).not.toHaveProperty("author_id");
  });
  it("rejects blank comments", () => expect(() => commentBody(" \n ")).toThrow());
  it("rejects comments over the storage limit", () => expect(() => commentBody("a".repeat(10001))).toThrow());
  it("surfaces denied posting", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "Access denied" } });
    await expect(postComment({ id: "private" }, "Hello")).rejects.toThrow("Access denied");
  });
});