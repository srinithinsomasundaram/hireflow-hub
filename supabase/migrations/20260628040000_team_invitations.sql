-- =========================================================
-- 1. Online presence — track when a member was last active
-- =========================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- =========================================================
-- 2. Organisation invitations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.org_invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token           uuid        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  role            public.app_role NOT NULL DEFAULT 'recruiter',
  email           text,
  invited_by      uuid        REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at         timestamptz,
  used_by         uuid        REFERENCES public.profiles(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_invitations TO authenticated;
GRANT SELECT ON public.org_invitations TO anon;
GRANT ALL ON public.org_invitations TO service_role;

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- Org members can create / read / delete invitations for their workspace
CREATE POLICY "org members manage invitations"
  ON public.org_invitations FOR ALL TO authenticated
  USING  (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Anyone with the link can read it (token is a 128-bit secret UUID)
CREATE POLICY "public read invitation by token"
  ON public.org_invitations FOR SELECT TO anon, authenticated
  USING (true);

-- =========================================================
-- 3. RPC: accept an invitation atomically
--    Validates the token, adds the caller to the org, and
--    marks the invitation as used — all in one transaction.
-- =========================================================
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv  record;
  v_uid  uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the invitation row to prevent double-accept
  SELECT * INTO v_inv
  FROM public.org_invitations
  WHERE token = p_token
    AND expires_at > now()
    AND used_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Add user to org (insert role; skip silently if they already have it)
  INSERT INTO public.user_roles (user_id, organization_id, role, status)
  VALUES (v_uid, v_inv.organization_id, v_inv.role, 'active')
  ON CONFLICT (user_id, organization_id, role) DO UPDATE SET status = 'active';

  -- Mark invitation as consumed
  UPDATE public.org_invitations
  SET used_at = now(), used_by = v_uid
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'organization_id', v_inv.organization_id,
    'role', v_inv.role::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;
