CREATE OR REPLACE FUNCTION public.seed_default_boards() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  bid uuid;
  i int;
  pl text[] := ARRAY['2026 Goals','Radar','To Do This Week','Monday','Tuesday','Wednesday','Thursday','Friday','Weekend','Complete – Ready to Archive'];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(uid::text));
  IF EXISTS (SELECT 1 FROM public.boards WHERE owner_id = uid) THEN RETURN; END IF;
  INSERT INTO public.boards (owner_id, title, board_type, background, is_starred, position)
    VALUES (uid, 'Power List', 'power_list', 'forest', true, 1000) RETURNING id INTO bid;
  FOR i IN 1..array_length(pl,1) LOOP
    INSERT INTO public.lists (board_id, title, position) VALUES (bid, pl[i], i*1000);
  END LOOP;
  INSERT INTO public.labels (board_id, name, color) VALUES (bid,'Priority','red'),(bid,'Deep work','blue'),(bid,'Quick win','green');
END $$;
REVOKE ALL ON FUNCTION public.seed_default_boards() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_default_boards() TO authenticated;