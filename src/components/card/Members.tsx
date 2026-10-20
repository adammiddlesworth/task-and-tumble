import { useState } from "react";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { Copy, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const peopleQuery = (cardId: string) => queryOptions({ queryKey: ["card-people", cardId], queryFn: async () => {
  const { data, error } = await supabase.rpc("card_people", { _card_id: cardId });
  if (error) throw error;
  return data;
}});

export function CardMembers({ cardId }: { cardId: string }) {
  const qc = useQueryClient();
  const { data = [], error } = useQuery(peopleQuery(cardId));
  const [busy, setBusy] = useState(false);
  async function toggle(userId: string, assigned: boolean) {
    setBusy(true);
    const result = assigned ? await supabase.from("card_members").delete().eq("card_id", cardId).eq("user_id", userId) : await supabase.from("card_members").insert({ card_id: cardId, user_id: userId });
    if (result.error) toast.error(result.error.message);
    await qc.invalidateQueries({ queryKey: ["card-people", cardId] });
    qc.invalidateQueries({ queryKey: ["board"] });
    setBusy(false);
  }
  return <div className="space-y-3">
    {error && <p className="text-sm text-destructive">{error.message}</p>}
    {data.map((p) => <label key={p.user_id} className="flex items-center gap-3 text-sm"><Checkbox disabled={busy} checked={p.is_assigned} onCheckedChange={() => toggle(p.user_id, p.is_assigned)} /><span>{p.full_name}</span></label>)}
    {!error && !data.length && <p className="text-sm text-muted-foreground">No members available.</p>}
  </div>;
}

export function BoardMembers({ boardId, ownerId }: { boardId: string; ownerId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: user } = useQuery({ queryKey: ["current-user"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  const { data: people = [] } = useQuery({ queryKey: ["board-people", boardId], queryFn: async () => {
    const { data, error } = await supabase.rpc("board_people", { _board_id: boardId });
    if (error) throw error;
    return data;
  }});
  async function invite(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setLink("");
    const { data, error } = await supabase.from("board_invites").insert({ board_id: boardId, email: email.trim().toLowerCase() }).select("token").single();
    if (error) toast.error(error.message);
    else setLink(`${window.location.origin}/invite?token=${data.token}`);
    setBusy(false);
  }
  return <Popover><PopoverTrigger asChild><Button variant="secondary" size="sm"><Users className="mr-1 h-4 w-4" /> Members</Button></PopoverTrigger><PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] space-y-4">
    <h3 className="text-sm font-semibold">Board members</h3>
    <div className="space-y-2">{people.map((p) => <div key={p.user_id} className="flex items-center gap-2 text-sm"><span className="flex-1">{p.full_name}{p.is_owner ? " · Owner" : ""}</span>{user?.id === ownerId && !p.is_owner && <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove ${p.full_name}`} onClick={async () => {
      const { error } = await supabase.from("board_members").delete().eq("board_id", boardId).eq("user_id", p.user_id);
      if (error) toast.error(error.message); else qc.invalidateQueries();
    }}><X className="h-3 w-3" /></Button>}</div>)}</div>
    {user?.id === ownerId && <form onSubmit={invite} className="space-y-2 border-t pt-3"><label className="text-xs font-semibold" htmlFor="invite-email">Invite by email</label><Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" /><Button type="submit" disabled={busy} className="w-full"><UserPlus className="mr-2 h-4 w-4" /> Create invitation link</Button></form>}
    {link && <div className="space-y-2"><p className="text-xs text-muted-foreground">Send this link to {email}. It expires in 7 days.</p><Input readOnly value={link} aria-label="Invitation link" /><Button variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Invitation link copied")).catch(() => toast.error("Could not copy the invitation link"))}><Copy className="mr-2 h-4 w-4" /> Copy invitation link</Button></div>}
  </PopoverContent></Popover>;
}