import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { MessageSquare, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { commentsQuery, deleteComment, editComment, postComment } from "@/lib/card-comments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CardComments({ cardId }: { cardId: string }) {
  const qc = useQueryClient();
  const comments = useQuery(commentsQuery(cardId));
  const user = useQuery({ queryKey: ["comment-author"], queryFn: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user?.id ?? null;
  }});
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["card-comments", cardId] });
  const mutation = useMutation({
    mutationFn: async (action: { mode: "post" | "edit" | "delete"; id?: string; body?: string }) => {
      if (action.mode === "post") return postComment({ id: cardId }, action.body ?? "");
      if (!action.id) throw new Error("Comment unavailable");
      if (action.mode === "edit") return editComment(action.id, action.body ?? "");
      return deleteComment(action.id);
    },
    onSuccess: async (_, action) => {
      if (action.mode === "post") setDraft("");
      setEditing(null);
      setDeleting(null);
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <section aria-label="Card comments" className="space-y-4 border-t pt-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-muted-foreground" />Comments {comments.data?.length ? <span className="text-muted-foreground">{comments.data.length}</span> : null}</h3>
      <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); mutation.mutate({ mode: "post", body: draft }); }}>
        <Textarea aria-label="Write a comment" placeholder="Write a comment…" value={draft} maxLength={10000} onChange={(event) => setDraft(event.target.value)} className="min-h-20 resize-y" disabled={mutation.isPending} />
        <Button type="submit" size="sm" disabled={!draft.trim() || mutation.isPending}><Send className="mr-2 h-3.5 w-3.5" />{mutation.isPending && mutation.variables?.mode === "post" ? "Posting…" : "Post comment"}</Button>
      </form>
      {comments.isPending && <p className="text-sm text-muted-foreground">Loading comments…</p>}
      {comments.isError && <div className="flex items-center gap-2 text-sm text-destructive">Comments couldn’t be loaded.<Button variant="ghost" size="sm" onClick={() => comments.refetch()}>Retry</Button></div>}
      {comments.data?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
      <div className="space-y-4">
        {comments.data?.map((comment) => (
          <article key={comment.id} className="min-w-0 border-b pb-4 last:border-b-0 last:pb-0">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="break-words text-sm font-semibold">{comment.author_name}{comment.author_id === user.data ? " (you)" : ""}</span>
              <time dateTime={comment.created_at} className="text-xs text-muted-foreground" title={format(new Date(comment.created_at), "PPpp")}>{format(new Date(comment.created_at), "MMM d, h:mm a")}</time>
              {comment.updated_at !== comment.created_at && <span className="text-xs text-muted-foreground">edited</span>}
              {comment.author_id === user.data && <div className="ml-auto flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit comment" title="Edit comment" disabled={mutation.isPending} onClick={() => { setEditing(comment.id); setEditBody(comment.body); setDeleting(null); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label="Delete comment" title="Delete comment" disabled={mutation.isPending} onClick={() => { setDeleting(comment.id); setEditing(null); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>}
            </div>
            {editing === comment.id ? <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); mutation.mutate({ mode: "edit", id: comment.id, body: editBody }); }}>
              <Textarea aria-label="Edit comment text" value={editBody} maxLength={10000} onChange={(event) => setEditBody(event.target.value)} disabled={mutation.isPending} />
              <div className="flex gap-2"><Button size="sm" type="submit" disabled={!editBody.trim() || mutation.isPending}>Save comment</Button><Button type="button" size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => setEditing(null)}>Cancel</Button></div>
            </form> : <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{comment.body}</p>}
            {deleting === comment.id && <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-sm">Delete this comment?</span><Button size="sm" variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate({ mode: "delete", id: comment.id })}>Confirm delete</Button><Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => setDeleting(null)}>Cancel</Button></div>}
          </article>
        ))}
      </div>
    </section>
  );
}