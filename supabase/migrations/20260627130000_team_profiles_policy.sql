-- Allow org members to read profiles of other members in the same org.
-- Without this, RLS blocks cross-user profile reads and team page shows only UUIDs.
CREATE POLICY "org members read co-member profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur1
      JOIN public.user_roles ur2 ON ur1.organization_id = ur2.organization_id
      WHERE ur1.user_id = auth.uid()
        AND ur2.user_id = profiles.id
        AND ur1.status = 'active'
        AND ur2.status = 'active'
    )
  );
