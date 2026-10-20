import { useEffect, useRef, useState } from "react";
import { Coffee, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { durationSeconds, formatTimer, secondsRemaining, type PomodoroPhase, type PomodoroPreset } from "@/lib/pomodoro";

export function PomodoroTimer() {
  const [preset, setPreset] = useState<PomodoroPreset>("25/5");
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [remaining, setRemaining] = useState(1500);
  const [running, setRunning] = useState(false);
  const deadline = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (deadline.current === null) return;
      const next = secondsRemaining(deadline.current, Date.now());
      if (next > 0) { setRemaining(next); return; }
      deadline.current = null;
      setRunning(false);
      const nextPhase = phase === "focus" ? "break" : "focus";
      setPhase(nextPhase);
      setRemaining(durationSeconds(preset, nextPhase));
      toast.success(phase === "focus" ? "Focus complete — time for a break." : "Break complete — ready to focus.", { duration: 10000 });
    };
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, [running, phase, preset]);

  function reset(nextPreset = preset, nextPhase = phase) {
    deadline.current = null;
    setRunning(false);
    setPreset(nextPreset);
    setPhase(nextPhase);
    setRemaining(durationSeconds(nextPreset, nextPhase));
  }

  function toggleRunning() {
    if (running) {
      if (deadline.current !== null) setRemaining(secondsRemaining(deadline.current, Date.now()));
      deadline.current = null;
      setRunning(false);
    } else {
      deadline.current = Date.now() + remaining * 1000;
      setRunning(true);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" aria-label="Pomodoro timer" title="Pomodoro timer" className="fixed bottom-5 left-5 z-50 h-10 gap-2 rounded-full border border-border/50 bg-nav px-3 text-nav-foreground shadow-lift hover:bg-nav hover:text-nav-foreground">
          <Timer className={running ? "text-primary" : ""} />
          <span className="min-w-[5ch] font-semibold tabular-nums">{formatTimer(remaining)}</span>
          <span className="hidden text-xs text-nav-foreground/70 sm:inline">{phase === "focus" ? "Focus" : "Break"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={12} className="w-[min(280px,calc(100vw-40px))] rounded-lg p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Timer className="h-4 w-4 text-primary" /> Pomodoro</h2>
        <div role="group" aria-label="Pomodoro schedule" className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
          {(["25/5", "50/10"] as const).map((value) => (
            <Button key={value} size="sm" variant={preset === value ? "secondary" : "ghost"} aria-pressed={preset === value} onClick={() => reset(value, "focus")}>{value}</Button>
          ))}
        </div>
        <div role="group" aria-label="Timer phase" className="mt-3 grid grid-cols-2 gap-1">
          <Button size="sm" variant={phase === "focus" ? "secondary" : "ghost"} aria-pressed={phase === "focus"} onClick={() => reset(preset, "focus")}><Timer /> Focus</Button>
          <Button size="sm" variant={phase === "break" ? "secondary" : "ghost"} aria-pressed={phase === "break"} onClick={() => reset(preset, "break")}><Coffee /> Break</Button>
        </div>
        <div role="timer" aria-label={`${phase === "focus" ? "Focus" : "Break"} time remaining`} className="py-5 text-center font-display text-5xl font-semibold tabular-nums">{formatTimer(remaining)}</div>
        <div className="flex justify-center gap-2">
          <Button className="min-w-28" onClick={toggleRunning}>{running ? <Pause /> : <Play />}{running ? "Pause" : "Start"}</Button>
          <Button variant="outline" size="icon" aria-label="Reset timer" title="Reset timer" onClick={() => reset()}><RotateCcw /></Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}