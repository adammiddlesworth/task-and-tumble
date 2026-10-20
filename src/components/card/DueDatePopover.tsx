import { useState } from "react";
import { format, set } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DatesPatch = { start_date: string | null; due_date: string | null };

type Props = {
  startDate: string | null;
  dueDate: string | null;
  onSave: (patch: DatesPatch) => void;
};

const toInputDay = (d: Date | null) => (d ? format(d, "yyyy-MM-dd") : "");
const fromInputDay = (v: string) => (v ? new Date(`${v}T12:00:00`) : null);

export function DueDatePopover({ startDate, dueDate, onSave }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <CalendarIcon className="h-4 w-4" />
          {dueDate ? format(new Date(dueDate), "MMM d, h:mm a") : "Dates"}
        </Button>
      </PopoverTrigger>
      {open && (
        <PopoverContent align="start" className="w-80 p-4">
          <div className="mb-2 flex items-center justify-center">
            <span className="text-sm font-semibold">Dates</span>
            <button aria-label="Close dates" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <DatesForm
            start={startDate ? new Date(startDate) : null}
            due={dueDate ? new Date(dueDate) : null}
            onSave={(p) => {
              onSave(p);
              setOpen(false);
            }}
          />
        </PopoverContent>
      )}
    </Popover>
  );
}

function DatesForm({ start, due, onSave }: { start: Date | null; due: Date | null; onSave: (p: DatesPatch) => void }) {
  const [startDate, setStartDate] = useState<Date | null>(start);
  const [hasStart, setHasStart] = useState(!!start);
  const [dueDate, setDueDate] = useState<Date | null>(due);
  const [hasDue, setHasDue] = useState(!!due);
  const [time, setTime] = useState(due ? format(due, "HH:mm") : "08:00");

  const commit = () => {
    onSave({
      start_date: hasStart && startDate ? startDate.toISOString() : null,
      due_date: hasDue && dueDate ? set(dueDate, { hours: Number(time.slice(0, 2)), minutes: Number(time.slice(3, 5)) }).toISOString() : null,
    });
  };

  return (
    <div className="space-y-3">
      <Calendar
        mode="single"
        selected={dueDate ?? undefined}
        onSelect={(d) => {
          setDueDate(d ?? null);
          if (d) setHasDue(true);
        }}
        className="pointer-events-auto rounded-lg border p-2"
      />
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start date</p>
        <div className="flex items-center gap-2">
          <Checkbox checked={hasStart} onCheckedChange={(v) => setHasStart(!!v)} aria-label="Has start date" />
          <Input
            type="date"
            value={toInputDay(startDate)}
            onChange={(e) => {
              setStartDate(fromInputDay(e.target.value));
              if (e.target.value) setHasStart(true);
            }}
            placeholder="M/D/YYYY"
            className="h-9 flex-1"
          />
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due date</p>
        <div className="flex items-center gap-2">
          <Checkbox checked={hasDue} onCheckedChange={(v) => setHasDue(!!v)} aria-label="Has due date" />
          <Input
            type="date"
            value={toInputDay(dueDate)}
            onChange={(e) => {
              setDueDate(fromInputDay(e.target.value));
              if (e.target.value) setHasDue(true);
            }}
            placeholder="M/D/YYYY"
            className="h-9 w-36"
          />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 w-28" />
        </div>
      </div>
      <Button className="w-full" onClick={commit}>Save</Button>
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => onSave({ start_date: null, due_date: null })}
      >
        Remove
      </Button>
    </div>
  );
}
