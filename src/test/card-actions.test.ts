import { describe, expect, it, vi, beforeEach } from "vitest";
import { canonicalCardId, mergeMirror, placeCard, archivePlacement } from "@/lib/card-actions";
import type { Card } from "@/lib/data";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: "created", error: null });
  mocks.from.mockReturnValue({ update: mocks.update });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({ error: null });
});

describe("mirror card rules", () => {
  const source = { id: "original", board_id: "board-one", list_id: "list-one", position: 1000, archived: false, title: "Original task", description: "Shared details" };
  const placement = { id: "mirror", board_id: "board-two", list_id: "list-two", position: 2000, archived: false };
  it("edits the original card through a mirror", () => expect(canonicalCardId(mergeMirror(source, placement))).toBe("original"));
  it("keeps the destination independently positioned", () => expect(mergeMirror(source, placement)).toMatchObject({ id: "mirror", board_id: "board-two", list_id: "list-two", position: 2000 }));
  it("reflects changed original details", () => expect(mergeMirror({ ...source, title: "Changed task", description: "Updated checklist notes" }, placement)).toMatchObject({ title: "Changed task", description: "Updated checklist notes" }));
  it("does not treat independent copies as mirrors", () => expect(canonicalCardId({ id: "copy" })).toBe("copy"));
});

describe("placement actions", () => {
  const mirror = { id: "mirror", sourceCardId: "original", board_id: "destination", title: "Shared task" } as Card;
  it("moves the mirror placement, not the original", async () => {
    await placeCard(mirror, "move", "another-board", "another-list", 2, mirror.title);
    expect(mocks.rpc).toHaveBeenCalledWith("card_destination", { _card_id: "mirror", _board_id: "another-board", _list_id: "another-list", _index: 2, _mode: "move", _title: "Shared task" });
  });
  it("copies original content when copying from a mirror", async () => {
    await placeCard(mirror, "copy", "another-board", "another-list", 0, "Independent copy");
    expect(mocks.rpc.mock.calls[0]?.[1]).toMatchObject({ _card_id: "original", _mode: "copy", _title: "Independent copy" });
  });
  it("shares the original rather than mirroring a mirror", async () => {
    await placeCard(mirror, "mirror", "another-board", "another-list", 0, mirror.title);
    expect(mocks.rpc.mock.calls[0]?.[1]).toMatchObject({ _card_id: "original", _mode: "mirror" });
  });
  it("archives only the mirrored placement", async () => {
    await archivePlacement(mirror);
    expect(mocks.from).toHaveBeenCalledWith("card_mirrors");
    expect(mocks.eq).toHaveBeenCalledWith("id", "mirror");
  });
  it("surfaces denied destination actions", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("Card or destination unavailable") });
    await expect(placeCard(mirror, "move", "private-board", "private-list", 0, mirror.title)).rejects.toThrow("Card or destination unavailable");
  });
});