-- Ensure the logos bucket exists AND is public, and add a public-read policy.
-- Wrapped in existence checks so this is safe outside the Supabase environment.
DO $$
BEGIN
  -- Bucket upsert
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'logos', 'logos', true, 2097152,
      ARRAY['image/png','image/jpeg','image/jpg','image/svg+xml',
            'image/webp','image/x-icon','image/vnd.microsoft.icon']
    )
    ON CONFLICT (id) DO UPDATE
      SET public             = true,
          file_size_limit    = 2097152,
          allowed_mime_types = ARRAY['image/png','image/jpeg','image/jpg','image/svg+xml',
                                     'image/webp','image/x-icon','image/vnd.microsoft.icon'];
  END IF;

  -- Public-read policy
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename  = 'objects'
        AND policyname = 'public read logos'
    ) THEN
      EXECUTE 'CREATE POLICY "public read logos" ON storage.objects
               FOR SELECT TO anon, authenticated USING (bucket_id = ''logos'')';
    END IF;
  END IF;
END $$;
