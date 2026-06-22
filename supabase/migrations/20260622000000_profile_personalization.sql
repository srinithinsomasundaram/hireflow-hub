ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_market TEXT,
  ADD COLUMN IF NOT EXISTS social_proof TEXT;
