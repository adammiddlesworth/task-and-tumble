import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DeleteBoardButton({
  board,
  className,
  onDeleted,
}: {
  board: { id: string; title: string; owner_id: string };
  className?: string;
  onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsOwner(data.user?.id === board.owner_id));
  }, [board.owner_id]);

  if (!isOwner) return null;

  async function remove() {
    const { error } = await supabase.from("boards").delete().eq("id", board.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Deleted "${board.title}"`);
    qc.removeQueries({ queryKey: ["board", board.id] });
    qc.invalidateQueries({ queryKey: ["boards"] });
    onDeleted?.();
    navigate({ to: "/boards" });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label="Delete board">
        <Trash2 className="h-4 w-4" /> Delete board
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{board.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the board with all of its lists and cards. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
