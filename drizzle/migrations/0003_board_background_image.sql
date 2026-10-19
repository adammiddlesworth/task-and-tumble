ALTER TABLE public.boards ADD COLUMN background_image text;
COMMENT ON COLUMN public.boards.background_image IS 'Storage path in card-covers bucket ({user_id}/boards/{board_id}/file)';