import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TriggerType = "card_added_to_board" | "card_added_to_list";
export type Place = "top" | "bottom";
export type AutomationAction =
  | { type: "add_checklist"; title: string; items: string[] }
  | { type: "move" | "copy"; board_id: string; list_id: string; place: Place }
  | { type: "set_due"; mode: "days"; days: number; time: string; tz: string }
  | { type: "set_due"; mode: "next_weekday"; weekday: number; time: string; tz: string }
  | { type: "add_label"; name: string; color: string }
  | { type: "mark_complete" };

export type Automation = {
  id: string;
  board_id: string;
  enabled: boolean;
  trigger_type: TriggerType;
  trigger_list_id: string | null;
  actions: AutomationAction[];
};

export type ListRef = { id: string; title: string; board_id: string };
export type BoardRef = { id: string; title: string };

export const WEEKDAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const automationsQuery = (boardId: string) =>
  queryOptions({
    queryKey: ["automations", boardId],
    queryFn: async (): Promise<Automation[]> => {
      const { data, error } = await supabase.from("board_automations").select("*").eq("board_id", boardId).order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Automation[];
    },
  });

export const destinationsQuery = () =>
  queryOptions({
    queryKey: ["automation-destinations"],
    queryFn: async () => {
      const [b, l] = await Promise.all([
        supabase.from("boards").select("id,title").order("position"),
        supabase.from("lists").select("id,title,board_id,position").eq("archived", false).order("position"),
      ]);
      if (b.error) throw b.error;
      if (l.error) throw l.error;
      return { boards: (b.data ?? []) as BoardRef[], lists: (l.data ?? []) as ListRef[] };
    },
  });

function fmtTime(t: string) {
  const [h = 17, m = 0] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Plain-language sentence for a rule, Trello-style. */
export function describeAutomation(a: Pick<Automation, "trigger_type" | "trigger_list_id" | "actions">, boards: BoardRef[], lists: ListRef[]) {
  const listName = (id: string | null) => lists.find((l) => l.id === id)?.title ?? "(missing list)";
  const boardName = (id: string) => boards.find((b) => b.id === id)?.title ?? "(missing board)";
  const trigger = a.trigger_type === "card_added_to_board" ? "when a card is added to the board" : `when a card is added to list "${listName(a.trigger_list_id)}"`;
  const parts = a.actions.map((x) => {
    switch (x.type) {
      case "add_checklist": return `add the "${x.title}" checklist to the card`;
      case "move": return `move the card to the ${x.place} of list "${listName(x.list_id)}" on board "${boardName(x.board_id)}"`;
      case "copy": return `copy the card to the ${x.place} of list "${listName(x.list_id)}" on board "${boardName(x.board_id)}"`;
      case "set_due": return x.mode === "days"
        ? `set due date ${x.days === 0 ? "today" : `in ${x.days} day${x.days === 1 ? "" : "s"}`} at ${fmtTime(x.time)}`
        : `set due date the next ${WEEKDAYS[x.weekday]} at ${fmtTime(x.time)}`;
      case "add_label": return `add the ${x.color} "${x.name}" label to the card`;
      case "mark_complete": return "mark the card complete";
    }
  });
  if (parts.length === 0) return `${trigger}, do nothing`;
  const last = parts.pop();
  return `${trigger}, ${parts.length ? `${parts.join(", ")}, and ${last}` : last}`;
}
