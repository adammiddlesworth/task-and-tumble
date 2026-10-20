DROP POLICY "collaborators read cards" ON public.cards;
CREATE POLICY "collaborators read cards" ON public.cards FOR SELECT TO authenticated USING(public.can_access_board(board_id) OR public.can_access_card(id));
DROP POLICY "collaborators update cards" ON public.cards;
CREATE POLICY "collaborators update cards" ON public.cards FOR UPDATE TO authenticated USING(public.can_access_board(board_id) OR public.can_access_card(id)) WITH CHECK(public.can_access_board(board_id) OR public.can_access_card(id));