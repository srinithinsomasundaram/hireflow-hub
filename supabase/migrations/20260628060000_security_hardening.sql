-- =========================================================
-- SECURITY HARDENING — FIX TWO CRITICAL RLS OVER-EXPOSURES
-- =========================================================

-- ── 1. org_invitations: replace USING(true) policy with a SECURITY DEFINER lookup ──
--
-- The previous "public read invitation by token" policy exposed ALL invitation rows
-- (token, org_id, role) to any anonymous client. This allows full enumeration of all
-- pending invitations and token theft to join any workspace.
--
-- Fix: drop the broad policy; add a SECURITY DEFINER function that returns data only
-- for the exact token supplied, preventing enumeration.
DROP POLICY IF EXISTS "public read invitation by token" ON public.org_invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token uuid)
RETURNS TABLE(
  organization_id uuid,
  role            text,
  expires_at      timestamptz,
  org_name        text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.organization_id,
         i.role::text,
         i.expires_at,
         o.company_name
  FROM   public.org_invitations i
  JOIN   public.organizations   o ON o.id = i.organization_id
  WHERE  i.token     = p_token
    AND  i.used_at   IS NULL
    AND  i.expires_at > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(uuid) TO anon, authenticated;

-- ── 2. organization_settings: remove public USING(true) policy ──
--
-- The previous "public read settings" policy exposed ALL organizations' smtp_config
-- (AES-encrypted SMTP passwords, host, username) and crm_config (webhook URLs and
-- plaintext webhook secrets) to any anonymous client.
--
-- Fix: drop the over-permissive policy; expose only the three branding fields that
-- the public careers page actually needs, via a SECURITY DEFINER function.
DROP POLICY IF EXISTS "public read settings" ON public.organization_settings;

CREATE OR REPLACE FUNCTION public.get_org_public_settings(p_org_id uuid)
RETURNS TABLE(
  careers_tagline     text,
  brand_primary_color text,
  brand_logo_url      text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT careers_tagline, brand_primary_color, brand_logo_url
  FROM   public.organization_settings
  WHERE  organization_id = p_org_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_public_settings(uuid) TO anon, authenticated;
