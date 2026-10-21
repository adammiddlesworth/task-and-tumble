CREATE TABLE public.user_rules (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  daily_review boolean NOT NULL DEFAULT true,
  weekly_review boolean NOT NULL DEFAULT true,
  review_due_time text NOT NULL DEFAULT '17:00' CHECK (review_due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_rules TO authenticated;
GRANT ALL ON public.user_rules TO service_role;
ALTER TABLE public.user_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rules" ON public.user_rules FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER user_rules_touch BEFORE UPDATE ON public.user_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_review_cards(_board_id uuid, _today date, _due timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  dow int := extract(isodow FROM _today);
  day_name text := CASE WHEN dow >= 6 THEN 'weekend' ELSE lower(trim(to_char(_today, 'Day'))) END;
  lid uuid;
  cid uuid;
  made int := 0;
  k text;
  want_daily boolean := true;
  want_weekly boolean := true;
BEGIN
  IF uid IS NULL OR NOT EXISTS (SELECT 1 FROM boards WHERE id = _board_id AND owner_id = uid AND board_type = 'power_list') THEN RETURN 0; END IF;
  SELECT daily_review, weekly_review INTO want_daily, want_weekly FROM user_rules WHERE user_id = uid;
  want_daily := COALESCE(want_daily, true);
  want_weekly := COALESCE(want_weekly, true);
  PERFORM pg_advisory_xact_lock(hashtext(uid::text || 'reviews'));
  SELECT id INTO lid FROM lists WHERE board_id = _board_id AND NOT archived AND lower(title) = day_name ORDER BY position LIMIT 1;
  IF lid IS NULL THEN RETURN 0; END IF;
  FOREACH k IN ARRAY CASE WHEN dow = 5 THEN ARRAY['daily','weekly'] ELSE ARRAY['daily'] END LOOP
    IF (k = 'daily' AND NOT want_daily) OR (k = 'weekly' AND NOT want_weekly) THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM reviews WHERE user_id = uid AND kind = k AND review_date = _today) THEN CONTINUE; END IF;
    INSERT INTO cards (list_id, board_id, title, due_date, position)
      VALUES (lid, _board_id, CASE k WHEN 'daily' THEN 'Daily Review' ELSE 'Weekly Review' END, _due,
        COALESCE((SELECT max(position) FROM cards WHERE list_id = lid), 0) + 1000)
      RETURNING id INTO cid;
    INSERT INTO reviews (user_id, kind, review_date, card_id) VALUES (uid, k, _today, cid);
    made := made + 1;
  END LOOP;
  RETURN made;
END $$;
REVOKE ALL ON FUNCTION public.ensure_review_cards(uuid, date, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_review_cards(uuid, date, timestamptz) TO authenticated;