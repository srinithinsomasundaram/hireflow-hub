ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS form_config jsonb DEFAULT NULL;
