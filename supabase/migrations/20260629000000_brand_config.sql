-- Add brand_config JSONB to store hero/footer/font/color settings
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS brand_config jsonb DEFAULT NULL;

-- Drop first since return type is changing (new brand_config column)
DROP FUNCTION IF EXISTS public.get_org_public_settings(uuid);

-- Recreate with brand_config exposed
CREATE OR REPLACE FUNCTION public.get_org_public_settings(p_org_id uuid)
RETURNS TABLE(
  careers_tagline     text,
  brand_primary_color text,
  brand_logo_url      text,
  brand_config        jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT careers_tagline, brand_primary_color, brand_logo_url, brand_config
  FROM   public.organization_settings
  WHERE  organization_id = p_org_id
  LIMIT 1;
$$;
