import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReviewKind = "daily" | "weekly";
export type Question = { key: string; label: string; type: "text" | "rating" | "yesno"; max?: number };

export const REVIEW_DUE_HOUR = 17;

export const DAILY_QUESTIONS: Question[] = [
  { key: "morning_formula", label: "Did you complete your morning formula?", type: "yesno" },
  { key: "appreciated", label: "A moment that I really appreciated today was...", type: "text" },
  { key: "handled_well", label: "A situation or task I handled well today was...", type: "text" },
  { key: "even_better", label: "I could have made today even better if I...", type: "text" },
  { key: "connected", label: "Something that could have helped me feel more connected to others today would have been...", type: "text" },
  { key: "control", label: "What did I do today to give myself a feeling of control?", type: "text" },
  { key: "coach", label: "If I was my own high performance coach, I could tell myself this statement about today...", type: "text" },
  { key: "win_stack", label: "WIN STACK", type: "text" },
  { key: "clarity", label: "Clarity", type: "rating", max: 5 },
  { key: "energy", label: "Energy", type: "rating", max: 5 },
  { key: "influence", label: "Influence", type: "rating", max: 5 },
  { key: "courage", label: "Courage", type: "rating", max: 5 },
  { key: "stuck_to_plan", label: "Did I stick to my planned tasks today?", type: "yesno" },
  { key: "showed_up", label: "Did I show up today?", type: "yesno" },
  { key: "repeat_1000", label: "If I repeated today 1,000 days in a row, what would happen?", type: "text" },
  { key: "repeat_effective", label: "What would need to happen for a repeat of 1,000 days to be effective?", type: "text" },
  { key: "second_time", label: "If I was reliving this moment for the second time, how would I behave?", type: "text" },
];

const LIFE = ["Health", "Mental/Emotional", "Partner/Love", "Family", "Friends", "Mission", "Experiences", "Faith", "Finances", "Learning"];

export const WEEKLY_QUESTIONS: Question[] = [
  { key: "great_things", label: "3 great things that happened to me last week were...", type: "text" },
  { key: "struggle", label: "The main struggle I faced this past week was...", type: "text" },
  { key: "advice", label: "...and if I were advising or mentoring someone dealing with the same struggle, I'd advise them to...", type: "text" },
  { key: "learned_self", label: "2 things I learned about myself this past week include...", type: "text" },
  { key: "learned_others", label: "2 things I learned about others — partner, loved ones, friends, team, customers, etc. — include...", type: "text" },
  { key: "positive_new", label: "What positive new things are trying to present themselves to me right now?", type: "text" },
  { key: "age_85", label: "What would my 85 year old self care about?", type: "text" },
  { key: "decision", label: "1 decision that I could have made last week to make my life better or to move ahead faster would have been...", type: "text" },
  ...LIFE.map((l): Question => ({ key: `life_${l.toLowerCase().replace(/[^a-z]+/g, "_")}`, label: l, type: "rating", max: 10 })),
];

/** Local calendar date (YYYY-MM-DD) and today's local deadline ("HH:MM", default 5 PM) as ISO. */
export function reviewTargets(now = new Date(), dueTime = "17:00") {
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const m = /^(\d{2}):(\d{2})$/.exec(dueTime);
  const h = m ? Number(m[1]) : REVIEW_DUE_HOUR;
  const min = m ? Number(m[2]) : 0;
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min, 0, 0);
  return { today, due: due.toISOString() };
}

export type UserRules = { daily_review: boolean; weekly_review: boolean; review_due_time: string };
export const DEFAULT_RULES: UserRules = { daily_review: true, weekly_review: true, review_due_time: "17:00" };

export const userRulesQuery = () =>
  queryOptions({
    queryKey: ["user-rules"],
    queryFn: async (): Promise<UserRules> => {
      const { data, error } = await supabase.from("user_rules").select("daily_review, weekly_review, review_due_time").maybeSingle();
      if (error) throw error;
      return data ?? DEFAULT_RULES;
    },
  });

export async function saveUserRules(rules: UserRules) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase.from("user_rules").upsert({ user_id: u.user.id, ...rules });
  if (error) throw error;
}

export async function ensureReviewCards(boardId: string, dueTime = "17:00") {
  const { today, due } = reviewTargets(new Date(), dueTime);
  const { data, error } = await supabase.rpc("ensure_review_cards", { _board_id: boardId, _today: today, _due: due });
  if (error) throw error;
  return data ?? 0;
}

export const reviewForCardQuery = (cardId: string) =>
  queryOptions({
    queryKey: ["review", cardId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").eq("card_id", cardId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
