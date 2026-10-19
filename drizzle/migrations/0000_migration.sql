
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  board_type text NOT NULL DEFAULT 'youtube' CHECK (board_type IN ('power_list','youtube')),
  background text NOT NULL DEFAULT 'slate',
  is_starred boolean NOT NULL DEFAULT false,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO authenticated;
GRANT ALL ON public.boards TO service_role;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own boards" ON public.boards FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.owns_board(_board_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.boards WHERE id = _board_id AND owner_id = auth.uid())
$$;

CREATE TABLE public.lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  position double precision NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lists TO authenticated;
GRANT ALL ON public.lists TO service_role;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lists" ON public.lists FOR ALL TO authenticated USING (public.owns_board(board_id)) WITH CHECK (public.owns_board(board_id));

CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  is_complete boolean NOT NULL DEFAULT false,
  position double precision NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  goal_card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  claude_enabled boolean NOT NULL DEFAULT false,
  claude_instructions text,
  claude_status text NOT NULL DEFAULT 'off' CHECK (claude_status IN ('off','queued','working','ready_for_review','failed')),
  claude_output text,
  claude_last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cards_list_idx ON public.cards(list_id);
CREATE INDEX cards_board_idx ON public.cards(board_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cards" ON public.cards FOR ALL TO authenticated USING (public.owns_board(board_id)) WITH CHECK (public.owns_board(board_id));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER cards_touch BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.youtube_details (
  card_id uuid PRIMARY KEY REFERENCES public.cards(id) ON DELETE CASCADE,
  publish_date date,
  video_type text CHECK (video_type IN ('long_form','short')),
  working_title text,
  title_options text,
  hook text,
  script text,
  thumbnail_concept text,
  yt_description text,
  tags text,
  video_url text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_details TO authenticated;
GRANT ALL ON public.youtube_details TO service_role;
ALTER TABLE public.youtube_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own yt" ON public.youtube_details FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND public.owns_board(c.board_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND public.owns_board(c.board_id)));

CREATE TABLE public.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'green'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labels TO authenticated;
GRANT ALL ON public.labels TO service_role;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own labels" ON public.labels FOR ALL TO authenticated USING (public.owns_board(board_id)) WITH CHECK (public.owns_board(board_id));

CREATE TABLE public.card_labels (
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_labels TO authenticated;
GRANT ALL ON public.card_labels TO service_role;
ALTER TABLE public.card_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own card_labels" ON public.card_labels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND public.owns_board(c.board_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND public.owns_board(c.board_id)));

CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Checklist',
  position double precision NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklists TO authenticated;
GRANT ALL ON public.checklists TO service_role;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checklists" ON public.checklists FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND public.owns_board(c.board_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND public.owns_board(c.board_id)));

CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  position double precision NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT ALL ON public.checklist_items TO service_role;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own items" ON public.checklist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.checklists cl JOIN public.cards c ON c.id = cl.card_id WHERE cl.id = checklist_id AND public.owns_board(c.board_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.checklists cl JOIN public.cards c ON c.id = cl.card_id WHERE cl.id = checklist_id AND public.owns_board(c.board_id)));

CREATE TABLE public.card_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  actor text NOT NULL DEFAULT 'user' CHECK (actor IN ('user','claude')),
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_activity TO authenticated;
GRANT ALL ON public.card_activity TO service_role;
ALTER TABLE public.card_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.card_activity FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND public.owns_board(c.board_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND public.owns_board(c.board_id)));

CREATE VIEW public.claude_queue WITH (security_invoker = true) AS
SELECT c.*, b.title AS board_title, l.title AS list_title,
  y.publish_date, y.video_type, y.working_title, y.title_options, y.hook, y.script,
  y.thumbnail_concept, y.yt_description, y.tags, y.video_url
FROM public.cards c
JOIN public.boards b ON b.id = c.board_id
JOIN public.lists l ON l.id = c.list_id
LEFT JOIN public.youtube_details y ON y.card_id = c.id
WHERE c.claude_enabled = true AND c.claude_status = 'queued' AND c.archived = false
  AND (c.due_date IS NULL OR c.due_date <= now() + interval '3 days')
ORDER BY c.due_date ASC NULLS LAST;
GRANT SELECT ON public.claude_queue TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;

CREATE OR REPLACE FUNCTION public.seed_default_boards() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  bid uuid;
  t text;
  i int;
  yt text[] := ARRAY['Ideas','Researching','Scripting','Ready to Film','Editing','Title & Thumbnail','Scheduled','Published'];
  pl text[] := ARRAY['2026 Goals','Radar','To Do This Week','Monday','Tuesday','Wednesday','Thursday','Friday','Weekend','Complete – Ready to Archive'];
  ytb text[] := ARRAY['Adam Middlesworth','PassPal Insurance','PassPal Real Estate','Work with Adam'];
  ytc text[] := ARRAY['crimson','teal','ocean','amber'];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(uid::text));
  IF EXISTS (SELECT 1 FROM boards WHERE owner_id = uid) THEN RETURN; END IF;
  INSERT INTO boards (owner_id, title, board_type, background, is_starred, position)
    VALUES (uid, 'Power List', 'power_list', 'forest', true, 1000) RETURNING id INTO bid;
  FOR i IN 1..array_length(pl,1) LOOP
    INSERT INTO lists (board_id, title, position) VALUES (bid, pl[i], i*1000);
  END LOOP;
  INSERT INTO labels (board_id, name, color) VALUES (bid,'Priority','red'),(bid,'Deep work','blue'),(bid,'Quick win','green');
  FOR i IN 1..4 LOOP
    INSERT INTO boards (owner_id, title, board_type, background, position)
      VALUES (uid, ytb[i], 'youtube', ytc[i], (i+1)*1000) RETURNING id INTO bid;
    FOR t IN SELECT unnest(yt) LOOP NULL; END LOOP;
    FOR t IN SELECT u FROM unnest(yt) WITH ORDINALITY AS x(u, n) ORDER BY n LOOP
      INSERT INTO lists (board_id, title, position)
        VALUES (bid, t, (array_position(yt, t))*1000);
    END LOOP;
    INSERT INTO labels (board_id, name, color) VALUES (bid,'Evergreen','green'),(bid,'Trending','orange'),(bid,'Sponsor','purple');
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.seed_default_boards() TO authenticated;

CREATE OR REPLACE FUNCTION public.weekly_reset(_board_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE todo uuid; done uuid; maxpos double precision;
BEGIN
  SELECT id INTO todo FROM lists WHERE board_id = _board_id AND title = 'To Do This Week' AND NOT archived LIMIT 1;
  SELECT id INTO done FROM lists WHERE board_id = _board_id AND title ILIKE 'Complete%' AND NOT archived LIMIT 1;
  IF todo IS NULL OR done IS NULL THEN RAISE EXCEPTION 'Missing "To Do This Week" or "Complete" list'; END IF;
  SELECT COALESCE(MAX(position),0) INTO maxpos FROM cards WHERE list_id = done;
  UPDATE cards c SET list_id = done, position = maxpos + 1000 * x.rn
  FROM (SELECT c2.id, row_number() OVER (ORDER BY c2.position) rn FROM cards c2 JOIN lists l ON l.id = c2.list_id
        WHERE l.board_id = _board_id AND l.title IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Weekend')
          AND c2.is_complete AND NOT c2.archived) x
  WHERE c.id = x.id;
  SELECT COALESCE(MAX(position),0) INTO maxpos FROM cards WHERE list_id = todo;
  UPDATE cards c SET list_id = todo, position = maxpos + 1000 * x.rn
  FROM (SELECT c2.id, row_number() OVER (ORDER BY l.position, c2.position) rn FROM cards c2 JOIN lists l ON l.id = c2.list_id
        WHERE l.board_id = _board_id AND l.title IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Weekend')
          AND NOT c2.is_complete AND NOT c2.archived) x
  WHERE c.id = x.id;
END $$;
GRANT EXECUTE ON FUNCTION public.weekly_reset(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_completed(_board_id uuid) RETURNS int
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE cards SET archived = true WHERE list_id IN (SELECT id FROM lists WHERE board_id = _board_id AND title ILIKE 'Complete%') AND NOT archived;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.archive_completed(uuid) TO authenticated;
