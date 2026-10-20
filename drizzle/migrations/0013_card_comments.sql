CREATE TABLE public.card_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  author_name text NOT NULL DEFAULT 'Member',
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_comments TO authenticated;
GRANT ALL ON public.card_comments TO service_role;
ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collaborators read comments" ON public.card_comments FOR SELECT TO authenticated USING (public.can_access_card(card_id));
CREATE POLICY "Collaborators post their own comments" ON public.card_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.can_access_card(card_id));
CREATE POLICY "Authors edit their comments" ON public.card_comments FOR UPDATE TO authenticated USING (author_id = auth.uid() AND public.can_access_card(card_id)) WITH CHECK (author_id = auth.uid() AND public.can_access_card(card_id));
CREATE POLICY "Authors delete their comments" ON public.card_comments FOR DELETE TO authenticated USING (author_id = auth.uid() AND public.can_access_card(card_id));
CREATE INDEX card_comments_card_created_idx ON public.card_comments(card_id, created_at);
CREATE FUNCTION public.prepare_card_comment() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(NULLIF(btrim(full_name), ''), 'Member') INTO NEW.author_name FROM public.profiles WHERE id = NEW.author_id;
    NEW.author_name := COALESCE(NEW.author_name, 'Member');
    NEW.created_at := now();
  ELSE
    IF NEW.card_id IS DISTINCT FROM OLD.card_id OR NEW.author_id IS DISTINCT FROM OLD.author_id OR NEW.author_name IS DISTINCT FROM OLD.author_name OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Comment author, card and creation time cannot be changed';
    END IF;
  END IF;
  NEW.body := btrim(NEW.body);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER prepare_card_comment BEFORE INSERT OR UPDATE ON public.card_comments FOR EACH ROW EXECUTE FUNCTION public.prepare_card_comment();