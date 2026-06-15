CREATE TABLE public.plan_configs (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT '/month',
  description TEXT NOT NULL,
  features TEXT[] NOT NULL,
  cta TEXT NOT NULL,
  accent BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

-- Anyone can read plans (they're public marketing content)
CREATE POLICY "Public read plan_configs" ON public.plan_configs FOR SELECT USING (true);

GRANT SELECT ON public.plan_configs TO anon, authenticated;
GRANT ALL ON public.plan_configs TO service_role;

-- Seed default plans
INSERT INTO public.plan_configs (id, name, price, period, description, features, cta, accent) VALUES
(0, 'Pro', '₹199', '/month', 'Perfect for freelancers and solo sales reps.',
  ARRAY['25 pitches per month', 'Email + WhatsApp + LinkedIn formats', 'Pitch history (last 50)', 'Priority support'],
  'Get Pro', false),
(1, 'Agency', '₹999', '/month', 'For agencies and teams closing at scale.',
  ARRAY['Unlimited pitches', 'Everything in Pro', 'Team seat (up to 5)', 'White-label export', 'Dedicated support'],
  'Get Agency', true);
