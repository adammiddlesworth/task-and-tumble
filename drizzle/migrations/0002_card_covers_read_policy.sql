CREATE POLICY "covers read own folder" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'card-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
COMMENT ON COLUMN public.cards.cover_url IS 'Storage path in card-covers bucket ({user_id}/{card_id}/file)';