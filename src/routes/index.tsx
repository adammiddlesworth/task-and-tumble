import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bot, LayoutGrid, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import kommandLogoDark from "@/assets/kommand_logo_dark.png.asset.json";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center — Personal kanban with Claude" },
      { name: "description", content: "Plan your week and your YouTube pipeline on kanban boards that Claude can work on." },
      { property: "og:title", content: "Command Center — Personal kanban with Claude" },
      { property: "og:description", content: "Plan your week and your YouTube pipeline on kanban boards that Claude can work on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const token = sessionStorage.getItem("cc-invite");
        if (token) { sessionStorage.removeItem("cc-invite"); navigate({ to: "/invite", search: { token }, replace: true }); }
        else navigate({ to: "/boards", replace: true });
      }
    });
  }, [navigate]);

  return (
    <main className="min-h-screen bg-nav text-nav-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="mb-6">
          <img src={kommandLogoDark.url} alt="Kommand" className="h-10 w-auto" />
        </div>
        <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl">
          Your week, your channels, <span className="text-primary">one board.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-nav-foreground/70">
          A personal kanban for the Power List and every YouTube pipeline — with Claude ready to pick up the work.
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
        <div className="mt-16 grid gap-6 text-sm text-nav-foreground/70 sm:grid-cols-3">
          <Feature icon={<LayoutGrid className="h-5 w-5" />} title="Five boards" text="Power List plus four YouTube pipelines, seeded for you." />
          <Feature icon={<Bot className="h-5 w-5" />} title="Claude assist" text="Queue a card, Claude posts its work back live." />
          <Feature icon={<CalendarClock className="h-5 w-5" />} title="Weekly reset" text="One click rolls unfinished days back into the week." />
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 font-semibold text-nav-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      {text}
    </div>
  );
}
