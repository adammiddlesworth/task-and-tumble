ALTER TABLE public.cards ADD COLUMN cover_url text;
CREATE POLICY "covers upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'card-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "covers update own folder" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'card-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "covers delete own folder" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'card-covers' AND (storage.foldername(name))[1] = auth.uid()::text);