import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signCovers } from "@/lib/data";

const mocks = vi.hoisted(() => ({ sign: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ createSignedUrls: mocks.sign }) } },
}));

let client: QueryClient;
beforeEach(() => {
  vi.useFakeTimers();
  client = new QueryClient();
  mocks.sign.mockReset();
  mocks.sign.mockImplementation(async (paths: string[]) => ({
    data: paths.map((path) => ({ path, signedUrl: `https://images.example/${path}?version=${mocks.sign.mock.calls.length}` })),
    error: null,
  }));
});
afterEach(() => {
  client.clear();
  vi.useRealTimers();
});

describe("stable signed board images", () => {
  it("keeps the same background URL through repeated 15-second board refreshes", async () => {
    const original = await signCovers(["owner/background.jpg"], client);
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(15000);
      expect(await signCovers(["owner/background.jpg"], client)).toEqual(original);
    }
    expect(mocks.sign).toHaveBeenCalledTimes(1);
  });

  it("shares in-flight signing across board and card queries", async () => {
    const [board, card] = await Promise.all([
      signCovers(["owner/cover.jpg", "owner/cover.jpg", ""], client),
      signCovers(["owner/cover.jpg"], client),
    ]);
    expect(board).toEqual(card);
    expect(mocks.sign).toHaveBeenCalledTimes(1);
  });

  it("keeps valid image URLs when realtime or session updates invalidate all queries", async () => {
    const original = await signCovers(["owner/background.jpg"], client);
    await client.invalidateQueries();
    expect(await signCovers(["owner/background.jpg"], client)).toEqual(original);
    expect(mocks.sign).toHaveBeenCalledTimes(1);
  });

  it("loads a replacement image without re-signing the existing image", async () => {
    const original = await signCovers(["owner/old.jpg"], client);
    const updated = await signCovers(["owner/old.jpg", "owner/new.jpg"], client);
    expect(updated["owner/old.jpg"]).toBe(original["owner/old.jpg"]);
    expect(updated["owner/new.jpg"]).toContain("owner/new.jpg");
    expect(mocks.sign).toHaveBeenCalledTimes(2);
  });

  it("renews signed URLs before their 24-hour expiration", async () => {
    const original = await signCovers(["owner/background.jpg"], client);
    vi.advanceTimersByTime(23 * 60 * 60 * 1000);
    const renewed = await signCovers(["owner/background.jpg"], client);
    expect(renewed["owner/background.jpg"]).not.toBe(original["owner/background.jpg"]);
    expect(mocks.sign).toHaveBeenCalledTimes(2);
  });

  it("discards signed URLs when the session query cache is cleared", async () => {
    await signCovers(["owner/background.jpg"], client);
    client.clear();
    await signCovers(["owner/background.jpg"], client);
    expect(mocks.sign).toHaveBeenCalledTimes(2);
  });

  it("retries a failed image request on the next refresh rather than caching a missing URL", async () => {
    mocks.sign.mockResolvedValueOnce({ data: null, error: { message: "Temporary failure" } });
    await expect(signCovers(["owner/background.jpg"], client)).rejects.toThrow("Temporary failure");
    const recovered = await signCovers(["owner/background.jpg"], client);
    expect(recovered["owner/background.jpg"]).toContain("owner/background.jpg");
  });
});