import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bot, CalendarClock, LayoutGrid, LogOut, Moon, Search, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reviewQuery } from "@/lib/data";
import { BoardSwitcher, rememberRecentBoard } from "@/components/board/BoardSwitcher";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppShell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: review } = useQuery(reviewQuery());
  const [email, setEmail] = useState("");
  const [q, setQ] = useState("");
  const [dark, setDark] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const currentBoardId = path.startsWith("/board/") ? path.split("/")[2] : undefined;

  // Keep a short "recently opened" list for the board switcher
  useEffect(() => {
    if (currentBoardId) rememberRecentBoard(currentBoardId);
  }, [currentBoardId]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  // Live card updates (e.g. Claude posting output)
  useEffect(() => {
    const channel = supabase
      .channel("cards-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, (payload) => {
        const row = (payload.new ?? payload.old) as { id?: string; board_id?: string };
        qc.invalidateQueries({ queryKey: ["board"] });
        qc.invalidateQueries({ queryKey: ["card"] });
        qc.invalidateQueries({ queryKey: ["review"] });
        qc.invalidateQueries({ queryKey: ["due-soon"] });
      })
      .subscribe();
    const detailsChannel = supabase.channel("card-details-live");
    for (const table of ["card_mirrors", "card_labels", "labels", "checklists", "checklist_items", "card_members", "board_members", "youtube_details"]) {
      detailsChannel.on("postgres_changes", { event: "*", schema: "public", table }, () => qc.invalidateQueries());
    }
    detailsChannel.subscribe();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        qc.invalidateQueries({ queryKey: ["board"] });
        qc.invalidateQueries({ queryKey: ["card"] });
        qc.invalidateQueries({ queryKey: ["card-people"] });
      }
    }, 15000);
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(detailsChannel);
      window.clearInterval(interval);
    };
  }, [qc]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("cc-theme", next ? "dark" : "light");
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navLink = "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-nav-foreground/75 transition hover:bg-nav-foreground/10 hover:text-nav-foreground";
  const active = "bg-nav-foreground/10 text-nav-foreground";
  const count = review?.length ?? 0;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 bg-nav px-3 text-nav-foreground">
        <Link to="/boards" className="mr-2 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary font-display text-sm font-extrabold text-primary-foreground">C</span>
          <span className="hidden font-display font-bold sm:inline">Command Center</span>
        </Link>
        <Link to="/boards" className={`${navLink} ${path === "/boards" ? active : ""}`}>
          <LayoutGrid className="h-4 w-4" /> <span className="hidden md:inline">Boards</span>
        </Link>
        <Link to="/due-soon" className={`${navLink} ${path === "/due-soon" ? active : ""}`}>
          <CalendarClock className="h-4 w-4" /> <span className="hidden md:inline">Due Soon</span>
        </Link>
        <Link to="/review" className={`${navLink} ${path === "/review" ? active : ""}`}>
          <Bot className="h-4 w-4" /> <span className="hidden md:inline">Claude Review</span>
          {count > 0 && (
            <span data-status="ready_for_review" className="rounded-full px-1.5 text-[11px] font-bold">{count}</span>
          )}
        </Link>
        <form
          className="ml-auto flex items-center"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/search", search: { q } });
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-nav-foreground/50" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="h-8 w-32 border-nav-foreground/15 bg-nav-foreground/10 pl-8 text-nav-foreground placeholder:text-nav-foreground/50 sm:w-56"
            />
          </div>
        </form>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Light mode" : "Dark mode"}
          className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-nav-foreground/80 transition hover:bg-nav-foreground/10 hover:text-nav-foreground"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-2 grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-bold uppercase text-primary-foreground">
            {email.charAt(0) || "?"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal text-muted-foreground">{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme}>
              {dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {dark ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
      <BoardSwitcher currentBoardId={currentBoardId} />
    </div>
  );
}
