import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Youtube } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { YoutubeDetails } from "@/lib/data";
import { MarkdownField } from "@/components/Markdown";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Fields = Omit<YoutubeDetails, "card_id">;

export function YoutubeFields({ cardId, details }: { cardId: string; details: YoutubeDetails | null }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Partial<Fields>>(details ?? {});
  useEffect(() => setF(details ?? {}), [details]);

  async function save(patch: Partial<Fields>) {
    const { error } = await supabase.from("youtube_details").upsert({ card_id: cardId, ...f, ...patch });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["card", cardId] });
    if (!error) qc.invalidateQueries({ queryKey: ["board"] });
  }

  const text = (key: keyof Fields, label: string, multi = false) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {multi ? (
        <Textarea rows={3} value={(f[key] as string) ?? ""} onChange={(e) => setF({ ...f, [key]: e.target.value })} onBlur={() => save({})} className="text-sm" />
      ) : (
        <Input value={(f[key] as string) ?? ""} onChange={(e) => setF({ ...f, [key]: e.target.value })} onBlur={() => save({})} />
      )}
    </div>
  );

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h3 className="flex items-center gap-2 font-sans text-sm font-semibold">
        <Youtube className="h-4 w-4 text-destructive" /> Video
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Target publish date</Label>
          <Input type="date" value={f.publish_date ?? ""} onChange={(e) => { setF({ ...f, publish_date: e.target.value || null }); save({ publish_date: e.target.value || null }); }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Video type</Label>
          <Select value={f.video_type ?? ""} onValueChange={(v) => { setF({ ...f, video_type: v }); save({ video_type: v }); }}>
            <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="long_form">Long-form</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {text("working_title", "Working title")}
      {text("title_options", "Title options", true)}
      {text("hook", "Hook", true)}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Script / outline</Label>
        <MarkdownField value={f.script ?? null} rows={12} placeholder="Write the script or outline in markdown…" onSave={(v) => { setF({ ...f, script: v }); save({ script: v }); }} />
      </div>
      {text("thumbnail_concept", "Thumbnail concept", true)}
      {text("yt_description", "Description", true)}
      {text("tags", "Tags")}
      {text("video_url", "Published video URL")}
    </section>
  );
}
