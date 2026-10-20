import { Filter, X } from "lucide-react";
import type { Label } from "@/lib/data";
import { labelStyle } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function BoardLabelFilter({ labels, selected, onChange }: {
  labels: Label[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="board-ghost" aria-label="Filter by labels">
          <Filter /> Labels {selected.length > 0 && <span>({selected.length})</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filter by labels</h3>
          {selected.length > 0 && <Button variant="ghost" size="sm" onClick={() => onChange([])}><X /> Clear</Button>}
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {labels.map((label) => (
            <label key={label.id} className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-accent">
              <Checkbox checked={selected.includes(label.id)} onCheckedChange={() => toggle(label.id)} aria-label={`Filter ${label.name}`} />
              <span data-label={label.color} style={labelStyle(label.color)} className="h-3 w-8 shrink-0 rounded-sm" />
              <span className="min-w-0 break-words text-sm">{label.name}</span>
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-accent">
            <Checkbox checked={selected.includes("unlabeled")} onCheckedChange={() => toggle("unlabeled")} aria-label="Filter unlabeled cards" />
            <span className="text-sm">No labels</span>
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}