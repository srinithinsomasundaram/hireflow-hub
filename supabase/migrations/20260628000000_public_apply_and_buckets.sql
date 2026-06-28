-- =========================================================
-- 1. Storage buckets — skipped gracefully outside Supabase
-- =========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES
      ('resumes',        'resumes',        false, 10485760,
       ARRAY['application/pdf','application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
      ('logos',          'logos',          true,  2097152,
       ARRAY['image/png','image/jpeg','image/jpg','image/svg+xml',
             'image/webp','image/x-icon','image/vnd.microsoft.icon']),
      ('offer-letters',  'offer-letters',  false, 10485760, NULL),
      ('employee-files', 'employee-files', false, 10485760, NULL)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- =========================================================
-- 2. Allow anonymous users to insert candidates via the
--    public careers site.
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'candidates'
      AND policyname = 'anon insert candidates via careers'
  ) THEN
    CREATE POLICY "anon insert candidates via careers"
      ON public.candidates
      FOR INSERT TO anon
      WITH CHECK (
        source = 'careers_site'
        AND EXISTS (
          SELECT 1 FROM public.organizations o WHERE o.id = organization_id
        )
      );
  END IF;
END $$;
