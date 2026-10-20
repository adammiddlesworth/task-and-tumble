import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invite")({
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search['token'] === "string" ? search['token'] : "" }),
  head: () => ({ meta: [{ title: "Board invitation — Command Center" }, { name: "description", content: "Accept your invitation to collaborate on a Command Center board." }, { property: "og:title", content: "Board invitation — Command Center" }, { property: "og:description", content: "Join a shared Command Center board." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: InvitePage,
});
function InvitePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: user, isPending } = useQuery({ queryKey: ["current-user"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  async function accept() {
    setBusy(true); setError("");
    const { data, error: failure } = await supabase.rpc("accept_board_invite", { _token: token });
    if (failure) { setError(failure.message); setBusy(false); }
    else await navigate({ to: "/board/$boardId", params: { boardId: data } });
  }
  return <main className="flex min-h-screen items-center justify-center bg-background px-6"><div className="w-full max-w-md space-y-5"><h1 className="font-display text-3xl font-bold">Board invitation</h1>{!token ? <p className="text-destructive">This invitation link is incomplete.</p> : isPending ? <p>Loading…</p> : user ? <Button disabled={busy} onClick={accept}>{busy ? "Joining…" : "Accept invitation"}</Button> : <><p className="text-muted-foreground">Sign in with the email address that received this invitation.</p><Button asChild><Link to="/auth" onClick={() => sessionStorage.setItem("cc-invite", token)}>Sign in</Link></Button></>}{error && <p className="text-sm text-destructive">{error}</p>}</div></main>;
}