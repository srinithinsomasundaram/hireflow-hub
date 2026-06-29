-- Pipeline stage configuration per organisation
-- Stores custom labels, ordering, and visibility for each application_stage enum value.
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS pipeline_config jsonb DEFAULT NULL;
