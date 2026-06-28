
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('owner','admin','recruiter','hiring_manager','interviewer');
CREATE TYPE public.application_stage AS ENUM ('applied','screening','hr_interview','technical_interview','manager_round','offer','hired','rejected');
CREATE TYPE public.job_status AS ENUM ('draft','published','closed','archived');
CREATE TYPE public.employment_type AS ENUM ('full_time','part_time','contract','internship','temporary');
CREATE TYPE public.interview_type AS ENUM ('phone','video','onsite','technical','hr','manager');
CREATE TYPE public.interview_status AS ENUM ('scheduled','completed','cancelled','no_show');

-- =========================================================
-- ORGANIZATIONS
-- =========================================================
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subdomain text UNIQUE,
  logo_url text,
  website text,
  industry text,
  timezone text DEFAULT 'UTC',
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT ON public.organizations TO anon;
GRANT ALL ON public.organizations TO service_role;

-- =========================================================
-- PROFILES (one per auth user)
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- =========================================================
-- USER ROLES (per organization)
-- =========================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);

-- =========================================================
-- SECURITY DEFINER HELPERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _org_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_org_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = _user_id AND status = 'active';
$$;

-- =========================================================
-- JOBS
-- =========================================================
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  department text,
  location text,
  employment_type public.employment_type NOT NULL DEFAULT 'full_time',
  salary_min int,
  salary_max int,
  salary_currency text DEFAULT 'USD',
  description text,
  requirements text,
  status public.job_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
CREATE INDEX idx_jobs_org ON public.jobs(organization_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);

-- =========================================================
-- CANDIDATES
-- =========================================================
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  linkedin_url text,
  portfolio_url text,
  resume_url text,
  current_company text,
  experience_years numeric,
  current_salary numeric,
  expected_salary numeric,
  notice_period text,
  source text,
  tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
CREATE INDEX idx_candidates_org ON public.candidates(organization_id);
CREATE INDEX idx_candidates_email ON public.candidates(organization_id, email);

-- =========================================================
-- APPLICATIONS
-- =========================================================
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  stage public.application_stage NOT NULL DEFAULT 'applied',
  ai_score int,
  ai_summary text,
  source text DEFAULT 'careers_site',
  cover_letter text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT INSERT ON public.applications TO anon;
GRANT ALL ON public.applications TO service_role;
CREATE INDEX idx_applications_org ON public.applications(organization_id);
CREATE INDEX idx_applications_job ON public.applications(job_id);
CREATE INDEX idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX idx_applications_stage ON public.applications(organization_id, stage);

-- =========================================================
-- INTERVIEWS
-- =========================================================
CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  type public.interview_type NOT NULL DEFAULT 'video',
  scheduled_at timestamptz NOT NULL,
  duration_minutes int DEFAULT 60,
  meeting_url text,
  interviewer_id uuid REFERENCES auth.users(id),
  feedback text,
  rating int,
  status public.interview_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
CREATE INDEX idx_interviews_org ON public.interviews(organization_id);
CREATE INDEX idx_interviews_app ON public.interviews(application_id);

-- =========================================================
-- EMPLOYEES (onboarded hires)
-- =========================================================
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.candidates(id),
  application_id uuid REFERENCES public.applications(id),
  employee_code text,
  full_name text NOT NULL,
  email text NOT NULL,
  joining_date date NOT NULL,
  department text,
  manager text,
  position text,
  status text NOT NULL DEFAULT 'onboarding',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
CREATE INDEX idx_employees_org ON public.employees(organization_id);

-- =========================================================
-- EMAIL TEMPLATES
-- =========================================================
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
CREATE INDEX idx_templates_org ON public.email_templates(organization_id);

-- =========================================================
-- AUTOMATIONS
-- =========================================================
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger text NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  action text NOT NULL,
  action_config jsonb DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automations TO authenticated;
GRANT ALL ON public.automations TO service_role;
CREATE INDEX idx_automations_org ON public.automations(organization_id);

-- =========================================================
-- ORGANIZATION SETTINGS
-- =========================================================
CREATE TABLE public.organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  smtp_enabled boolean DEFAULT false,
  smtp_config jsonb DEFAULT '{}'::jsonb,
  crm_enabled boolean DEFAULT false,
  crm_config jsonb DEFAULT '{}'::jsonb,
  brand_primary_color text DEFAULT '#10b981',
  brand_logo_url text,
  custom_domain text,
  careers_tagline text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated;
GRANT SELECT ON public.organization_settings TO anon;
GRANT ALL ON public.organization_settings TO service_role;

-- =========================================================
-- RLS - ENABLE
-- =========================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- organizations
CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "public read orgs" ON public.organizations FOR SELECT TO anon USING (true);
CREATE POLICY "auth user creates org" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner/admin update org" ON public.organizations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), id, 'owner') OR public.has_role(auth.uid(), id, 'admin'));
CREATE POLICY "owner delete org" ON public.organizations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), id, 'owner'));

-- profiles
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "users read roles in their orgs" ON public.user_roles FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id)
);
CREATE POLICY "owner/admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), organization_id, 'owner') OR public.has_role(auth.uid(), organization_id, 'admin')
) WITH CHECK (
  public.has_role(auth.uid(), organization_id, 'owner') OR public.has_role(auth.uid(), organization_id, 'admin')
);

-- Helper: org-scoped policy macro
-- jobs
CREATE POLICY "members read jobs" ON public.jobs FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "public read published jobs" ON public.jobs FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "members write jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "members update jobs" ON public.jobs FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "members delete jobs" ON public.jobs FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- candidates
CREATE POLICY "members all candidates" ON public.candidates FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- applications (anon insert allowed for public apply form; org members manage)
CREATE POLICY "members read apps" ON public.applications FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "members update apps" ON public.applications FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "members delete apps" ON public.applications FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "members insert apps" ON public.applications FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "anon insert apps for published jobs" ON public.applications FOR INSERT TO anon WITH CHECK (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.status = 'published' AND j.organization_id = applications.organization_id)
);

-- interviews
CREATE POLICY "members all interviews" ON public.interviews FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- employees
CREATE POLICY "members all employees" ON public.employees FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- email_templates
CREATE POLICY "members all templates" ON public.email_templates FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- automations
CREATE POLICY "members all automations" ON public.automations FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- organization_settings
CREATE POLICY "members read settings" ON public.organization_settings FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "public read settings" ON public.organization_settings FOR SELECT TO anon USING (true);
CREATE POLICY "owner/admin write settings" ON public.organization_settings FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), organization_id, 'owner') OR public.has_role(auth.uid(), organization_id, 'admin')
) WITH CHECK (
  public.has_role(auth.uid(), organization_id, 'owner') OR public.has_role(auth.uid(), organization_id, 'admin')
);

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_orgs_upd BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jobs_upd BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_candidates_upd BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_applications_upd BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_interviews_upd BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_employees_upd BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_templates_upd BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_automations_upd BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_settings_upd BEFORE UPDATE ON public.organization_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- handle_new_user: create profile on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- create_organization_with_owner: atomic org+owner-role+settings+default-templates
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  _company_name text,
  _slug text,
  _industry text DEFAULT NULL,
  _website text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _org_id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) THEN
    RAISE EXCEPTION 'Slug already taken';
  END IF;

  INSERT INTO public.organizations (company_name, slug, industry, website, owner_id)
  VALUES (_company_name, _slug, _industry, _website, _uid)
  RETURNING id INTO _org_id;

  INSERT INTO public.user_roles (user_id, organization_id, role) VALUES (_uid, _org_id, 'owner');

  INSERT INTO public.organization_settings (organization_id, careers_tagline)
  VALUES (_org_id, 'Join the ' || _company_name || ' team');

  INSERT INTO public.email_templates (organization_id, name, subject, body, type) VALUES
    (_org_id, 'Application Received', 'We received your application for {{job_title}}',
     'Hi {{candidate_name}},' || E'\n\n' ||
     'Thanks for applying to the {{job_title}} role at {{company_name}}. Our team is reviewing your application and will be in touch soon.' || E'\n\n' ||
     'Best,' || E'\n' || '{{company_name}}',
     'application_received'),
    (_org_id, 'Interview Invitation', 'Interview invitation: {{job_title}} at {{company_name}}',
     'Hi {{candidate_name}},' || E'\n\n' ||
     'We''d like to invite you for an interview for the {{job_title}} role. Please use the link below to confirm a time:' || E'\n\n' ||
     '{{meeting_url}}' || E'\n\n' ||
     'Looking forward to speaking with you.' || E'\n' || '{{company_name}}',
     'interview_invite'),
    (_org_id, 'Offer Letter', 'Your offer from {{company_name}}',
     'Dear {{candidate_name}},' || E'\n\n' ||
     'We are pleased to offer you the position of {{job_title}} at {{company_name}}.' || E'\n\n' ||
     'Please find the full offer details attached. Welcome to the team!' || E'\n\n' ||
     'Best regards,' || E'\n' || '{{company_name}}',
     'offer'),
    (_org_id, 'Rejection', 'Update on your application to {{company_name}}',
     'Hi {{candidate_name}},' || E'\n\n' ||
     'Thank you for your interest in the {{job_title}} role. After careful consideration, we''ve decided to move forward with other candidates. We''ll keep your profile on file for future opportunities.' || E'\n\n' ||
     'Best wishes,' || E'\n' || '{{company_name}}',
     'rejection');

  RETURN _org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_with_owner(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text, text, text) TO authenticated;
