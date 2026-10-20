// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("new-account starter boards", () => {
  let db: PGlite;
  beforeEach(async () => {
      db = new PGlite();
      await db.exec(`
        CREATE ROLE anon; CREATE ROLE authenticated;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
        CREATE TABLE public.boards (id uuid DEFAULT gen_random_uuid(), owner_id uuid, title text, board_type text, background text, is_starred boolean, position double precision);
        CREATE TABLE public.lists (board_id uuid, title text, position double precision);
        CREATE TABLE public.labels (board_id uuid, name text, color text);
      `);
      await db.exec(readFileSync("drizzle/migrations/0014_power_list_only_onboarding.sql", "utf8"));
      await db.exec("SELECT public.seed_default_boards();");
  }, 20000);
  afterEach(async () => { await db.close(); });
  it("creates only Power List", async () => {
      expect((await db.query("SELECT title, board_type FROM public.boards")).rows).toEqual([{ title: "Power List", board_type: "power_list" }]);
  });
  it("retains all ten Power List lists", async () => {
      expect((await db.query("SELECT title FROM public.lists ORDER BY position")).rows).toEqual(
        ["2026 Goals", "Radar", "To Do This Week", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Weekend", "Complete – Ready to Archive"].map((title) => ({ title })),
      );
  });
  it("does not duplicate starter boards on refresh", async () => {
      await db.exec("SELECT public.seed_default_boards();");
      expect((await db.query("SELECT count(*)::int AS count FROM public.boards")).rows).toEqual([{ count: 1 }]);
  });
  it("keeps user-created YouTube boards intact", async () => {
      await db.exec("INSERT INTO public.boards(owner_id,title,board_type) VALUES(auth.uid(),'My channel','youtube'); SELECT public.seed_default_boards();");
      expect((await db.query("SELECT title, board_type FROM public.boards ORDER BY title")).rows).toEqual([{ title: "My channel", board_type: "youtube" }, { title: "Power List", board_type: "power_list" }]);
  });
});