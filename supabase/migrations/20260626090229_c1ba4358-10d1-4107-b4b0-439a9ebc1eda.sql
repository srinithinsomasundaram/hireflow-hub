
-- Storage object policies — skipped gracefully outside Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    RETURN;
  END IF;

  -- RESUMES: anyone can upload to {org_id}/... if that org exists; members read/delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='anon upload resume') THEN
    EXECUTE $p$CREATE POLICY "anon upload resume" ON storage.objects FOR INSERT TO anon
      WITH CHECK (
        bucket_id = 'resumes'
        AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id::text = (storage.foldername(name))[1])
      )$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='auth upload resume') THEN
    EXECUTE $p$CREATE POLICY "auth upload resume" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'resumes'
        AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='members read resumes') THEN
    EXECUTE $p$CREATE POLICY "members read resumes" ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'resumes'
        AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='members delete resumes') THEN
    EXECUTE $p$CREATE POLICY "members delete resumes" ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'resumes'
        AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )$p$;
  END IF;

  -- LOGOS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='members manage logos') THEN
    EXECUTE $p$CREATE POLICY "members manage logos" ON storage.objects FOR ALL TO authenticated
      USING (
        bucket_id = 'logos'
        AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      ) WITH CHECK (
        bucket_id = 'logos'
        AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )$p$;
  END IF;

  -- OFFER LETTERS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='members manage offers') THEN
    EXECUTE $p$CREATE POLICY "members manage offers" ON storage.objects FOR ALL TO authenticated
      USING (
        bucket_id = 'offer-letters'
        AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      ) WITH CHECK (
        bucket_id = 'offer-letters'
        AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )$p$;
  END IF;

  -- EMPLOYEE FILES
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='members manage employee files') THEN
    EXECUTE $p$CREATE POLICY "members manage employee files" ON storage.objects FOR ALL TO authenticated
      USING (
        bucket_id = 'employee-files'
        AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      ) WITH CHECK (
        bucket_id = 'employee-files'
        AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )$p$;
  END IF;
END $$;
