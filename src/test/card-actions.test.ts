import { describe, expect, it } from "vitest";
import { canonicalCardId, mergeMirror } from "@/lib/card-actions";

describe("mirror card rules", () => {
  const source = { id: "original", board_id: "board-one", list_id: "list-one", position: 1000, archived: false, title: "Original task", description: "Shared details" };
  const placement = { id: "mirror", board_id: "board-two", list_id: "list-two", position: 2000, archived: false };
  it("edits the original card through a mirror", () => expect(canonicalCardId(mergeMirror(source, placement))).toBe("original"));
  it("keeps the destination independently positioned", () => expect(mergeMirror(source, placement)).toMatchObject({ id: "mirror", board_id: "board-two", list_id: "list-two", position: 2000 }));
  it("reflects changed original details", () => expect(mergeMirror({ ...source, title: "Changed task", description: "Updated checklist notes" }, placement)).toMatchObject({ title: "Changed task", description: "Updated checklist notes" }));
  it("does not treat independent copies as mirrors", () => expect(canonicalCardId({ id: "copy" })).toBe("copy"));
});