import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

/** Click to edit, renders markdown when not editing. Saves on "Save". */
export function MarkdownField({
  value,
  onSave,
  placeholder,
  rows = 6,
}: {
  value: string | null;
  onSave: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  if (editing)
    return (
      <div className="space-y-2">
        <Textarea autoFocus rows={rows} value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-sm" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  return (
    <div onClick={() => setEditing(true)} className="min-h-12 cursor-text rounded-md bg-muted/60 px-3 py-2 hover:bg-muted">
      {value ? <Markdown>{value}</Markdown> : <p className="text-sm text-muted-foreground">{placeholder}</p>}
    </div>
  );
}
