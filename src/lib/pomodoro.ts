export type PomodoroPreset = "25/5" | "50/10";
export type PomodoroPhase = "focus" | "break";

export function durationSeconds(preset: PomodoroPreset, phase: PomodoroPhase): number {
  const schedules = { "25/5": { focus: 25, break: 5 }, "50/10": { focus: 50, break: 10 } };
  return schedules[preset][phase] * 60;
}

export function secondsRemaining(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function formatTimer(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}