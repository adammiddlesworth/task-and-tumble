CREATE TABLE public.board_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  enabled boolean NOT NULL DEFAULT true,
  trigger_type text NOT NULL CHECK (trigger_type IN ('card_added_to_board','card_added_to_list')),
  trigger_list_id uuid REFERENCES public.lists(id) ON DELETE CASCADE,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(actions) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((trigger_type = 'card_added_to_list') = (trigger_list_id IS NOT NULL))
);
CREATE INDEX board_automations_board_idx ON public.board_automations(board_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_automations TO authenticated;
GRANT ALL ON public.board_automations TO service_role;
ALTER TABLE public.board_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collaborators manage automations" ON public.board_automations FOR ALL TO authenticated
  USING (public.can_access_board(board_id))
  WITH CHECK (public.can_access_board(board_id) AND (trigger_list_id IS NULL OR EXISTS (SELECT 1 FROM public.lists l WHERE l.id = trigger_list_id AND l.board_id = board_automations.board_id)));

CREATE OR REPLACE FUNCTION public.run_card_automations() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  r record;
  a jsonb;
  cur uuid;
  cur_board uuid;
  tz text;
  today date;
  target date;
  wd int;
  lab uuid;
  idx int;
  fire_board boolean;
  fire_list boolean;
BEGIN
  IF current_setting('kommand.automating', true) = 'on' THEN RETURN NULL; END IF;
  IF NEW.archived THEN RETURN NULL; END IF;
  fire_board := TG_OP = 'INSERT' OR NEW.board_id IS DISTINCT FROM OLD.board_id;
  fire_list := TG_OP = 'INSERT' OR NEW.list_id IS DISTINCT FROM OLD.list_id;
  IF NOT fire_board AND NOT fire_list THEN RETURN NULL; END IF;
  PERFORM set_config('kommand.automating', 'on', true);
  BEGIN
    FOR r IN
      SELECT * FROM board_automations
      WHERE enabled AND board_id = NEW.board_id
        AND ((fire_board AND trigger_type = 'card_added_to_board') OR (fire_list AND trigger_type = 'card_added_to_list' AND trigger_list_id = NEW.list_id))
      ORDER BY created_at
    LOOP
      cur := NEW.id;
      FOR a IN SELECT * FROM jsonb_array_elements(r.actions) LOOP
        BEGIN
          SELECT board_id INTO cur_board FROM cards WHERE id = cur;
          CASE a->>'type'
          WHEN 'add_checklist' THEN
            DECLARE cl uuid; BEGIN
              INSERT INTO checklists(card_id, title, position)
                VALUES (cur, COALESCE(NULLIF(trim(a->>'title'), ''), 'Checklist'), COALESCE((SELECT max(position) FROM checklists WHERE card_id = cur), 0) + 1000)
                RETURNING id INTO cl;
              INSERT INTO checklist_items(checklist_id, text, position)
                SELECT cl, t.value, t.ord * 1000 FROM jsonb_array_elements_text(COALESCE(a->'items', '[]'::jsonb)) WITH ORDINALITY AS t(value, ord)
                WHERE trim(t.value) <> '';
            END;
          WHEN 'move', 'copy' THEN
            IF a->>'place' = 'bottom' THEN
              SELECT count(*) INTO idx FROM (SELECT id FROM cards WHERE list_id = (a->>'list_id')::uuid AND NOT archived AND id <> cur UNION ALL SELECT id FROM card_mirrors WHERE list_id = (a->>'list_id')::uuid AND NOT archived) x;
            ELSE idx := 0; END IF;
            IF a->>'type' = 'move' THEN
              PERFORM card_destination(cur, (a->>'board_id')::uuid, (a->>'list_id')::uuid, idx, 'move', NULL);
            ELSE
              cur := card_destination(cur, (a->>'board_id')::uuid, (a->>'list_id')::uuid, idx, 'copy', (SELECT title FROM cards WHERE id = cur));
            END IF;
          WHEN 'set_due' THEN
            tz := COALESCE(NULLIF(a->>'tz', ''), 'UTC');
            today := (now() AT TIME ZONE tz)::date;
            IF a->>'mode' = 'next_weekday' THEN
              wd := COALESCE((a->>'weekday')::int, 1);
              target := today + (((wd - extract(isodow FROM today)::int) + 7) % 7);
              IF target = today THEN target := today + 7; END IF;
            ELSE
              target := today + GREATEST(COALESCE((a->>'days')::int, 0), 0);
            END IF;
            UPDATE cards SET due_date = (target + COALESCE(NULLIF(a->>'time', ''), '17:00')::time) AT TIME ZONE tz WHERE id = cur;
          WHEN 'add_label' THEN
            SELECT id INTO lab FROM labels WHERE board_id = cur_board AND name = COALESCE(a->>'name', '') AND color = COALESCE(a->>'color', 'green') LIMIT 1;
            IF lab IS NULL THEN
              INSERT INTO labels(board_id, name, color) VALUES (cur_board, COALESCE(a->>'name', ''), COALESCE(a->>'color', 'green')) RETURNING id INTO lab;
            END IF;
            INSERT INTO card_labels(card_id, label_id) VALUES (cur, lab) ON CONFLICT DO NOTHING;
          WHEN 'mark_complete' THEN
            UPDATE cards SET is_complete = true WHERE id = cur;
          ELSE NULL;
          END CASE;
        EXCEPTION WHEN others THEN
          RAISE WARNING 'automation % action failed: %', r.id, SQLERRM;
        END;
      END LOOP;
    END LOOP;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'automations failed: %', SQLERRM;
  END;
  PERFORM set_config('kommand.automating', '', true);
  RETURN NULL;
END $$;

CREATE TRIGGER cards_run_automations_insert AFTER INSERT ON public.cards FOR EACH ROW EXECUTE FUNCTION public.run_card_automations();
CREATE TRIGGER cards_run_automations_move AFTER UPDATE OF list_id, board_id ON public.cards FOR EACH ROW EXECUTE FUNCTION public.run_card_automations();