-- =================================================================
-- HireFlow Demo Seed — run this in Supabase SQL Editor
-- Account: srinithinoffl@gmail.com
-- =================================================================
DO $$
DECLARE
  _uid          uuid;
  _org_id       uuid;
  -- jobs
  j_swe         uuid; j_pm          uuid; j_ds          uuid;
  j_devops      uuid; j_designer    uuid; j_sales       uuid;
  -- candidates
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
  c6 uuid; c7 uuid; c8 uuid; c9 uuid; c10 uuid;
  c11 uuid; c12 uuid; c13 uuid; c14 uuid; c15 uuid;
  -- applications
  a1 uuid; a2 uuid; a3 uuid; a4 uuid; a5 uuid;
  a6 uuid; a7 uuid; a8 uuid; a9 uuid; a10 uuid;
  a11 uuid; a12 uuid; a13 uuid; a14 uuid; a15 uuid;
BEGIN

  -- -------------------------------------------------------
  -- 1. Resolve user
  -- -------------------------------------------------------
  SELECT id INTO _uid FROM auth.users WHERE email = 'srinithinoffl@gmail.com' LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'User srinithinoffl@gmail.com not found. Sign up first, then re-run this script.';
  END IF;

  -- -------------------------------------------------------
  -- 2. Get or create organization
  -- -------------------------------------------------------
  SELECT organization_id INTO _org_id
  FROM public.user_roles
  WHERE user_id = _uid AND status = 'active'
  ORDER BY created_at LIMIT 1;

  IF _org_id IS NULL THEN
    INSERT INTO public.organizations (company_name, slug, industry, website, owner_id, timezone)
    VALUES ('Nexora Technologies', 'nexora-technologies', 'Technology', 'https://nexora.io', _uid, 'America/New_York')
    RETURNING id INTO _org_id;

    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (_uid, _org_id, 'owner');

    INSERT INTO public.organization_settings
      (organization_id, brand_primary_color, careers_tagline, crm_enabled)
    VALUES (_org_id, '#6366f1', 'Build the future with us at Nexora', true)
    ON CONFLICT (organization_id) DO NOTHING;
  END IF;

  -- Update org name & settings if org already exists to look polished
  UPDATE public.organizations
  SET company_name = 'Nexora Technologies',
      industry     = 'Technology',
      website      = 'https://nexora.io',
      timezone     = 'America/New_York'
  WHERE id = _org_id;

  INSERT INTO public.organization_settings (organization_id, brand_primary_color, careers_tagline, crm_enabled)
  VALUES (_org_id, '#6366f1', 'Build the future with us at Nexora', true)
  ON CONFLICT (organization_id) DO UPDATE
    SET brand_primary_color = '#6366f1',
        careers_tagline     = 'Build the future with us at Nexora',
        crm_enabled         = true;

  -- -------------------------------------------------------
  -- 3. Email templates (upsert so re-runs are safe)
  -- -------------------------------------------------------
  DELETE FROM public.email_templates WHERE organization_id = _org_id;

  INSERT INTO public.email_templates (organization_id, name, subject, body, type) VALUES
  (_org_id, 'Application Received', 'We received your application for {{job_title}} at Nexora',
   'Hi {{candidate_name}},' || E'\n\n' ||
   'Thank you for applying to the {{job_title}} position at Nexora Technologies! We''re excited to review your background.' || E'\n\n' ||
   'Our recruiting team will assess your application within 3–5 business days and reach out if there''s a strong match.' || E'\n\n' ||
   'In the meantime, feel free to learn more about us at https://nexora.io/about.' || E'\n\n' ||
   'Best regards,' || E'\n' || 'The Nexora Talent Team',
   'application_received'),

  (_org_id, 'Phone Screen Invitation', 'Let''s chat — {{job_title}} at Nexora',
   'Hi {{candidate_name}},' || E'\n\n' ||
   'Your application for {{job_title}} impressed us and we''d love to schedule a quick 30-minute introductory call.' || E'\n\n' ||
   'Please use the link below to pick a time that works for you:' || E'\n' || '{{meeting_url}}' || E'\n\n' ||
   'Looking forward to connecting!' || E'\n\n' ||
   'Warm regards,' || E'\n' || 'Talent Acquisition, Nexora Technologies',
   'phone_screen'),

  (_org_id, 'Technical Interview Invitation', 'Technical Interview — {{job_title}} at Nexora',
   'Hi {{candidate_name}},' || E'\n\n' ||
   'Congratulations on progressing to the technical interview stage for {{job_title}}!' || E'\n\n' ||
   'The interview will be 90 minutes and cover system design, coding, and problem-solving. Join via:' || E'\n' ||
   '{{meeting_url}}' || E'\n\n' ||
   'Please have your development environment ready. Good luck!' || E'\n\n' ||
   'Best,' || E'\n' || 'Engineering Hiring, Nexora',
   'interview_invite'),

  (_org_id, 'Offer Letter', 'Congratulations! Your offer from Nexora Technologies',
   'Dear {{candidate_name}},' || E'\n\n' ||
   'On behalf of everyone at Nexora Technologies, it is my pleasure to offer you the position of {{job_title}}.' || E'\n\n' ||
   'Your start date, compensation details, and benefits package are outlined in the attached formal offer letter.' || E'\n\n' ||
   'Please review and sign the offer by {{deadline}}. We can''t wait to have you on the team!' || E'\n\n' ||
   'Warmly,' || E'\n' || 'People & Culture, Nexora Technologies',
   'offer'),

  (_org_id, 'Application Update — Not Moving Forward', 'Update on your Nexora application',
   'Hi {{candidate_name}},' || E'\n\n' ||
   'Thank you for your interest in the {{job_title}} role and for the time you invested in our process.' || E'\n\n' ||
   'After careful consideration, we''ve decided to move forward with other candidates whose experience more closely aligns with our current needs.' || E'\n\n' ||
   'We were genuinely impressed by your background and will keep your profile for future openings. Please don''t hesitate to apply again.' || E'\n\n' ||
   'All the best,' || E'\n' || 'The Nexora Talent Team',
   'rejection');

  -- -------------------------------------------------------
  -- 4. Jobs
  -- -------------------------------------------------------
  DELETE FROM public.jobs WHERE organization_id = _org_id;

  INSERT INTO public.jobs
    (id, organization_id, title, department, location, employment_type,
     salary_min, salary_max, salary_currency, status, published_at, created_by,
     description, requirements)
  VALUES
  (gen_random_uuid(), _org_id, 'Senior Software Engineer', 'Engineering', 'Remote (US)', 'full_time',
   140000, 185000, 'USD', 'published', now() - interval '18 days', _uid,
   E'We are looking for a Senior Software Engineer to join our core platform team at Nexora Technologies.\n\nYou will design, build, and scale the distributed systems that power our products, work closely with product and design, and mentor junior engineers.\n\nWhy Nexora:\n• 100 % remote-first culture\n• Generous equity package\n• $3,000 annual learning budget\n• Unlimited PTO',
   E'• 5+ years of professional software engineering experience\n• Deep expertise in TypeScript / Node.js or Go\n• Experience with distributed systems and cloud infrastructure (AWS / GCP)\n• Familiarity with PostgreSQL and Redis\n• Strong communication skills and collaborative mindset')
  RETURNING id INTO j_swe;

  INSERT INTO public.jobs
    (id, organization_id, title, department, location, employment_type,
     salary_min, salary_max, salary_currency, status, published_at, created_by,
     description, requirements)
  VALUES
  (gen_random_uuid(), _org_id, 'Product Manager', 'Product', 'New York, NY (Hybrid)', 'full_time',
   120000, 155000, 'USD', 'published', now() - interval '12 days', _uid,
   E'Nexora is seeking an experienced Product Manager to own our enterprise product suite.\n\nYou will define the roadmap, gather customer insights, collaborate with engineering on delivery, and drive measurable outcomes for our B2B clients.\n\nThis role reports directly to the VP of Product.',
   E'• 4+ years of product management experience in a B2B SaaS environment\n• Proven track record of shipping impactful products end-to-end\n• Strong analytical skills — comfortable with SQL and data dashboards\n• Excellent stakeholder management and communication skills\n• Experience with agile methodologies')
  RETURNING id INTO j_pm;

  INSERT INTO public.jobs
    (id, organization_id, title, department, location, employment_type,
     salary_min, salary_max, salary_currency, status, published_at, created_by,
     description, requirements)
  VALUES
  (gen_random_uuid(), _org_id, 'Data Scientist', 'Data & Analytics', 'Remote (Global)', 'full_time',
   115000, 160000, 'USD', 'published', now() - interval '9 days', _uid,
   E'Join Nexora''s data science team to build predictive models and turn complex data into actionable insights that guide company strategy.\n\nYou will collaborate with product and engineering teams to instrument features, run experiments, and deploy ML models at scale.',
   E'• 3+ years of data science or machine learning experience\n• Proficient in Python (pandas, scikit-learn, PyTorch / TensorFlow)\n• Experience with large-scale data pipelines (Spark, dbt, Airflow)\n• Strong statistics fundamentals and A/B testing experience\n• PhD or MS in a quantitative field preferred')
  RETURNING id INTO j_ds;

  INSERT INTO public.jobs
    (id, organization_id, title, department, location, employment_type,
     salary_min, salary_max, salary_currency, status, published_at, created_by,
     description, requirements)
  VALUES
  (gen_random_uuid(), _org_id, 'DevOps Engineer', 'Infrastructure', 'Remote (US)', 'full_time',
   125000, 165000, 'USD', 'published', now() - interval '6 days', _uid,
   E'We are looking for a DevOps Engineer to own our CI/CD pipelines, Kubernetes clusters, and cloud infrastructure.\n\nYou will work alongside our platform and security teams to build systems that are reliable, secure, and cost-efficient.',
   E'• 4+ years of DevOps / platform engineering experience\n• Hands-on with Kubernetes and Helm\n• Experience with Terraform and infrastructure-as-code\n• Strong command of AWS (EKS, RDS, S3, CloudFront)\n• Experience with observability stacks — Datadog, Prometheus, or Grafana')
  RETURNING id INTO j_devops;

  INSERT INTO public.jobs
    (id, organization_id, title, department, location, employment_type,
     salary_min, salary_max, salary_currency, status, published_at, created_by,
     description, requirements)
  VALUES
  (gen_random_uuid(), _org_id, 'Senior Product Designer', 'Design', 'San Francisco, CA (Hybrid)', 'full_time',
   110000, 145000, 'USD', 'published', now() - interval '20 days', _uid,
   E'Nexora is searching for a Senior Product Designer to craft intuitive, delightful experiences across our product suite.\n\nYou will own design from research through high-fidelity delivery, run usability studies, and maintain our design system.',
   E'• 5+ years of product design experience in a digital product environment\n• Mastery of Figma\n• Portfolio demonstrating end-to-end product thinking and visual craft\n• Experience running user research sessions and usability tests\n• Familiarity with frontend implementation (HTML/CSS/React)')
  RETURNING id INTO j_designer;

  INSERT INTO public.jobs
    (id, organization_id, title, department, location, employment_type,
     salary_min, salary_max, salary_currency, status, created_by,
     description, requirements)
  VALUES
  (gen_random_uuid(), _org_id, 'Enterprise Account Executive', 'Sales', 'Chicago, IL', 'full_time',
   90000, 130000, 'USD', 'draft', _uid,
   E'We are looking for a driven Enterprise Account Executive to own the full sales cycle for our largest accounts.\n\nYou will prospect, demo, negotiate, and close six-figure deals with Fortune 500 companies.',
   E'• 5+ years of enterprise SaaS sales experience\n• Consistent history of exceeding $1M+ ARR quotas\n• Experience selling to HR, operations, or procurement buyers\n• Outstanding presentation and negotiation skills')
  RETURNING id INTO j_sales;

  -- -------------------------------------------------------
  -- 5. Candidates
  -- -------------------------------------------------------
  DELETE FROM public.candidates WHERE organization_id = _org_id;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Arjun Mehta', 'arjun.mehta@gmail.com', '+1 (415) 555-0182',
   'https://linkedin.com/in/arjunmehta', 'Stripe', 7, 155000, 175000, '4 weeks',
   'linkedin', ARRAY['backend','golang','distributed-systems'],
   'Strong candidate — led Stripe''s payments infra team. Very interested in the remote role.')
  RETURNING id INTO c1;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Sofia Reyes', 'sofia.reyes@outlook.com', '+1 (312) 555-0247',
   'https://linkedin.com/in/sofiareyes', 'Shopify', 5, 135000, 155000, '2 weeks',
   'referral', ARRAY['typescript','react','node'],
   'Referred by Marcus (Engineering Manager). Built Shopify''s checkout team.')
  RETURNING id INTO c2;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Liam O''Brien', 'liam.obrien@protonmail.com', '+1 (646) 555-0394',
   'https://linkedin.com/in/liamobrien', 'Datadog', 6, 140000, 160000, 'Immediate',
   'careers_site', ARRAY['python','ml','data-pipelines'],
   'PhD from MIT. 3 publications in NeurIPS. Previously at Google Brain for 2 years.')
  RETURNING id INTO c3;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Priya Nair', 'priya.nair@gmail.com', '+1 (510) 555-0561',
   'https://linkedin.com/in/priyanair', 'Notion', 4, 118000, 140000, '3 weeks',
   'linkedin', ARRAY['product','saas','analytics'],
   'PM at Notion for 4 years, shipped Notion AI and the database 2.0 revamp.')
  RETURNING id INTO c4;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Daniel Park', 'daniel.park@icloud.com', '+1 (503) 555-0733',
   'https://linkedin.com/in/danielpark', 'Figma', 6, 128000, 148000, '4 weeks',
   'careers_site', ARRAY['figma','design-systems','user-research'],
   'Worked on Figma''s core editor UX for 3 years. Excellent portfolio with tight motion design.')
  RETURNING id INTO c5;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Aisha Williams', 'aisha.williams@gmail.com', '+1 (929) 555-0812',
   'https://linkedin.com/in/aishawilliams', 'Netflix', 8, 165000, 190000, '4 weeks',
   'referral', ARRAY['kubernetes','terraform','aws','devops'],
   'Runs Netflix''s cost-optimisation infrastructure squad. Very senior; may need to flex on comp.')
  RETURNING id INTO c6;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Carlos Gómez', 'carlos.gomez@me.com', '+1 (512) 555-0916',
   'https://linkedin.com/in/carlosgomez', 'HubSpot', 9, 142000, 165000, '2 weeks',
   'linkedin', ARRAY['enterprise-sales','saas','crm'],
   'Closed $4.2M ARR last year at HubSpot. Has strong relationships in the Fortune 500 HR space.')
  RETURNING id INTO c7;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Nia Thompson', 'nia.thompson@gmail.com', '+1 (347) 555-0104',
   'https://linkedin.com/in/niathompson', 'Airbnb', 5, 125000, 150000, '3 weeks',
   'careers_site', ARRAY['typescript','react','graphql'],
   'Frontend-heavy engineer from Airbnb. Deep in React performance optimisation.')
  RETURNING id INTO c8;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'James Liu', 'james.liu@outlook.com', '+1 (206) 555-0285',
   'https://linkedin.com/in/jamesliu', 'Amazon', 4, 130000, 155000, 'Immediate',
   'linkedin', ARRAY['data-science','python','ab-testing'],
   'Amazon Ads data scientist, runs thousands of A/B tests quarterly. Strong stats background.')
  RETURNING id INTO c9;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Rachel Kim', 'rachel.kim@gmail.com', '+1 (617) 555-0473',
   'https://linkedin.com/in/rachelkim', 'HubSpot', 3, 105000, 130000, '4 weeks',
   'careers_site', ARRAY['product','growth','b2b'],
   'PM on HubSpot''s growth team, focused on self-serve onboarding. Great at data-driven decisions.')
  RETURNING id INTO c10;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Ethan Brooks', 'ethan.brooks@protonmail.com', '+1 (214) 555-0658',
   'https://linkedin.com/in/ethanbrooks', 'Palantir', 5, 138000, 162000, '3 weeks',
   'referral', ARRAY['golang','microservices','grpc'],
   'Palantir SWE — strong systems and distributed computing background.')
  RETURNING id INTO c11;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Maya Patel', 'maya.patel@gmail.com', '+1 (408) 555-0779',
   'https://linkedin.com/in/mayapatel', 'Salesforce', 7, 148000, 170000, '4 weeks',
   'linkedin', ARRAY['devops','gcp','kubernetes','ci-cd'],
   'Salesforce senior DevOps. Built their multi-region K8s rollout strategy from scratch.')
  RETURNING id INTO c12;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Oliver Smith', 'oliver.smith@icloud.com', '+1 (312) 555-0834',
   'https://linkedin.com/in/oliversmith', 'Duolingo', 5, 120000, 140000, '2 weeks',
   'careers_site', ARRAY['figma','ios','mobile-design'],
   'Lead designer at Duolingo owning the streak and gamification flows. Very polished portfolio.')
  RETURNING id INTO c13;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'Sara Chen', 'sara.chen@gmail.com', '+1 (415) 555-0921',
   'https://linkedin.com/in/sarachen', 'Meta', 6, 152000, 178000, '6 weeks',
   'linkedin', ARRAY['ml','pytorch','nlp'],
   'Meta AI researcher — worked on LLaMA fine-tuning and safety classifiers. Very impressive background.')
  RETURNING id INTO c14;

  INSERT INTO public.candidates
    (id, organization_id, full_name, email, phone, linkedin_url, current_company,
     experience_years, current_salary, expected_salary, notice_period, source, tags, notes)
  VALUES
  (gen_random_uuid(), _org_id, 'David Okafor', 'david.okafor@outlook.com', '+1 (617) 555-0144',
   'https://linkedin.com/in/davidokafor', 'Twilio', 4, 112000, 138000, '3 weeks',
   'careers_site', ARRAY['typescript','node','postgres'],
   'Backend engineer at Twilio. Solid fundamentals, good culture fit — mentioned in phone screen.')
  RETURNING id INTO c15;

  -- -------------------------------------------------------
  -- 6. Applications
  -- -------------------------------------------------------
  DELETE FROM public.applications WHERE organization_id = _org_id;

  -- SWE applications
  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_swe, c1, 'offer', 94,
   'Arjun is an exceptional fit — 7 years of backend engineering with direct experience scaling payment infrastructure at Stripe. His Go expertise and distributed systems background align perfectly with our platform team needs. Strong communication skills noted across all interview rounds.',
   'linkedin', now() - interval '16 days')
  RETURNING id INTO a1;

  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_swe, c2, 'technical_interview', 88,
   'Sofia brings 5 years of full-stack experience with a strong TypeScript and Node.js background. Referral from a trusted internal source adds confidence. HR interview performance was strong; technical round pending.',
   'referral', now() - interval '10 days')
  RETURNING id INTO a2;

  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_swe, c11, 'hr_interview', 82,
   'Ethan has solid Go and microservices experience from Palantir. Good fundamentals across the board. Communication style is concise and technical — a positive sign for peer collaboration.',
   'referral', now() - interval '7 days')
  RETURNING id INTO a3;

  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_swe, c15, 'screening', 72,
   'David has relevant Node.js and Postgres experience but fewer years than our target profile. Worth a screening call to assess problem-solving depth before progressing.',
   'careers_site', now() - interval '4 days')
  RETURNING id INTO a4;

  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_swe, c8, 'rejected', 68,
   'Nia is an excellent frontend engineer but the SWE role requires backend and systems depth that doesn''t match her profile well. Recommend redirecting to a potential frontend-focused opening.',
   'careers_site', now() - interval '14 days')
  RETURNING id INTO a5;

  -- PM applications
  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_pm, c4, 'manager_round', 91,
   'Priya is an outstanding PM candidate. Her track record at Notion — shipping Notion AI and the database revamp — maps directly to what we need. Interview panels gave unanimous positive feedback.',
   'linkedin', now() - interval '11 days')
  RETURNING id INTO a6;

  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_pm, c10, 'hr_interview', 78,
   'Rachel brings solid B2B product instincts from HubSpot''s growth team. Strong data-driven mindset. Less experience managing large cross-functional teams; worth exploring in HR round.',
   'careers_site', now() - interval '8 days')
  RETURNING id INTO a7;

  -- Data Scientist applications
  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_ds, c3, 'technical_interview', 96,
   'Liam is the strongest DS candidate we''ve seen. MIT PhD, NeurIPS publications, and 2 years at Google Brain give him exceptional depth. Ensure he''s motivated by applied work, not just research.',
   'careers_site', now() - interval '8 days')
  RETURNING id INTO a8;

  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_ds, c9, 'hr_interview', 85,
   'James has a strong A/B testing and experimentation background from Amazon Ads. Immediate availability is a plus. Data pipelines knowledge could use some probing in the technical stage.',
   'linkedin', now() - interval '6 days')
  RETURNING id INTO a9;

  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_ds, c14, 'applied', 93,
   'Sara''s Meta AI background is exceptional — LLaMA fine-tuning and NLP safety classifiers are highly relevant. Notice period of 6 weeks is longer but worth accommodating for this calibre.',
   'linkedin', now() - interval '2 days')
  RETURNING id INTO a10;

  -- DevOps applications
  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_devops, c6, 'hired', 97,
   'Aisha is exceptional — 8 years of infrastructure experience at Netflix with direct Kubernetes and cost-optimisation ownership. Strong in every round. Offer accepted.',
   'referral', now() - interval '25 days')
  RETURNING id INTO a11;

  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_devops, c12, 'offer', 89,
   'Maya is a strong DevOps candidate with a solid GCP and Kubernetes portfolio from Salesforce. Backup offer in case Aisha''s onboarding faces issues, or consider her for a second infra headcount.',
   'linkedin', now() - interval '15 days')
  RETURNING id INTO a12;

  -- Designer applications
  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_designer, c5, 'manager_round', 90,
   'Daniel''s Figma background is directly on-target. His portfolio shows strong systems thinking and excellent motion design. Final round with design leadership is the last gate.',
   'careers_site', now() - interval '18 days')
  RETURNING id INTO a13;

  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_designer, c13, 'technical_interview', 83,
   'Oliver''s mobile-first design perspective from Duolingo is refreshing. Portfolio is polished. Checking design systems thinking in the portfolio review stage.',
   'careers_site', now() - interval '9 days')
  RETURNING id INTO a14;

  -- Sales (draft job — still got a referral)
  INSERT INTO public.applications
    (id, organization_id, job_id, candidate_id, stage, ai_score, ai_summary, source, applied_at)
  VALUES
  (gen_random_uuid(), _org_id, j_sales, c7, 'screening', 88,
   'Carlos has a $4.2M ARR track record at HubSpot with proven enterprise HR software sales. Excellent background for this role. Waiting on job to be published before formal kick-off.',
   'linkedin', now() - interval '5 days')
  RETURNING id INTO a15;

  -- -------------------------------------------------------
  -- 7. Interviews
  -- -------------------------------------------------------
  DELETE FROM public.interviews WHERE organization_id = _org_id;

  -- Arjun (SWE, offer stage) — completed all stages
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a1, 'phone', now() - interval '14 days', 30, 'https://meet.nexora.io/arjun-phone',
   _uid, 'Strong communicator, articulates trade-offs clearly. Confirmed motivation and compensation range aligned. Recommend moving forward.', 5, 'completed'),
  (_org_id, a1, 'technical', now() - interval '10 days', 90, 'https://meet.nexora.io/arjun-tech',
   _uid, 'Exceptional systems design round — correctly identified bottlenecks in our proposed architecture and suggested a CQRS pattern we hadn''t considered. Coding was clean and well-structured.', 5, 'completed'),
  (_org_id, a1, 'manager', now() - interval '6 days', 60, 'https://meet.nexora.io/arjun-mgr',
   _uid, 'Great culture fit. Thoughtful about team dynamics and mentorship. Would fit well as a tech lead. Strong recommendation to extend offer.', 5, 'completed');

  -- Sofia (SWE, technical_interview) — phone done, technical scheduled
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a2, 'phone', now() - interval '8 days', 30, 'https://meet.nexora.io/sofia-phone',
   _uid, 'Confident and well-prepared. Strong knowledge of React 18 and streaming server components. Clear upward trajectory at Shopify.', 4, 'completed'),
  (_org_id, a2, 'technical', now() + interval '2 days', 90, 'https://meet.nexora.io/sofia-tech',
   _uid, NULL, NULL, 'scheduled');

  -- Ethan (SWE, hr_interview)
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a3, 'hr', now() + interval '1 day', 45, 'https://meet.nexora.io/ethan-hr',
   _uid, NULL, NULL, 'scheduled');

  -- Priya (PM, manager_round) — hr done, manager scheduled
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a6, 'hr', now() - interval '9 days', 45, 'https://meet.nexora.io/priya-hr',
   _uid, 'Very sharp on B2B product instincts. She mapped our problem space accurately without any briefing. Communication is clear, confident, and structured.', 5, 'completed'),
  (_org_id, a6, 'video', now() - interval '5 days', 60, 'https://meet.nexora.io/priya-panel',
   _uid, 'Panel interview went extremely well — Priya presented a mock roadmap that impressed both engineering leads. Genuine enthusiasm for the problem space.', 5, 'completed'),
  (_org_id, a6, 'manager', now() + interval '3 days', 60, 'https://meet.nexora.io/priya-vp',
   _uid, NULL, NULL, 'scheduled');

  -- Rachel (PM, hr_interview)
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a7, 'hr', now() + interval '1 day', 45, 'https://meet.nexora.io/rachel-hr',
   _uid, NULL, NULL, 'scheduled');

  -- Liam (DS, technical_interview) — phone done
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a8, 'phone', now() - interval '6 days', 30, 'https://meet.nexora.io/liam-phone',
   _uid, 'Outstanding academic depth. Liam can explain extremely complex ML concepts in simple terms — a rare combination. Verified he''s motivated by applied product ML, not pure research.', 5, 'completed'),
  (_org_id, a8, 'technical', now() + interval '4 days', 120, 'https://meet.nexora.io/liam-tech',
   _uid, NULL, NULL, 'scheduled');

  -- James (DS, hr_interview)
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a9, 'hr', now() + interval '2 days', 45, 'https://meet.nexora.io/james-hr',
   _uid, NULL, NULL, 'scheduled');

  -- Aisha (DevOps, hired) — full cycle completed
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a11, 'phone', now() - interval '23 days', 30, 'https://meet.nexora.io/aisha-phone',
   _uid, 'Impressive background. Clear technical depth in Kubernetes and infra cost management. Very senior presence.', 5, 'completed'),
  (_org_id, a11, 'technical', now() - interval '19 days', 90, 'https://meet.nexora.io/aisha-tech',
   _uid, 'Best technical interview we''ve had this quarter. Designed a multi-region Kubernetes migration strategy live with no preparation. Exceptional.', 5, 'completed'),
  (_org_id, a11, 'manager', now() - interval '15 days', 60, 'https://meet.nexora.io/aisha-mgr',
   _uid, 'Culture fit is excellent. She asks the right questions about engineering culture and growth. Strong recommendation — do not let this candidate go.', 5, 'completed');

  -- Maya (DevOps, offer stage) — phone and tech done
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a12, 'phone', now() - interval '13 days', 30, 'https://meet.nexora.io/maya-phone',
   _uid, 'Strong GCP and Terraform background. Clear communicator about past project scope and outcomes. Interested in the role.', 4, 'completed'),
  (_org_id, a12, 'technical', now() - interval '9 days', 90, 'https://meet.nexora.io/maya-tech',
   _uid, 'Solid technical round — particularly strong in CI/CD pipeline design. IaC answers were detailed and production-hardened. Good candidate.', 4, 'completed');

  -- Daniel (Designer, manager_round)
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a13, 'phone', now() - interval '16 days', 30, 'https://meet.nexora.io/daniel-phone',
   _uid, 'Articulate about his design philosophy. Shared great examples from the Figma editor redesign. Portfolio review will be the key gate.', 4, 'completed'),
  (_org_id, a13, 'video', now() - interval '11 days', 90, 'https://meet.nexora.io/daniel-portfolio',
   _uid, 'Portfolio review was strong — his design system work is thorough and well-documented. Motion prototypes were impressive. Recommend moving to final round.', 5, 'completed'),
  (_org_id, a13, 'manager', now() + interval '5 days', 60, 'https://meet.nexora.io/daniel-final',
   _uid, NULL, NULL, 'scheduled');

  -- Oliver (Designer, technical_interview)
  INSERT INTO public.interviews
    (organization_id, application_id, type, scheduled_at, duration_minutes, meeting_url,
     interviewer_id, feedback, rating, status)
  VALUES
  (_org_id, a14, 'phone', now() - interval '7 days', 30, 'https://meet.nexora.io/oliver-phone',
   _uid, 'Strong mobile design instincts. Confident and passionate about the space. Portfolio review scheduled as next step.', 4, 'completed'),
  (_org_id, a14, 'video', now() + interval '6 days', 90, 'https://meet.nexora.io/oliver-portfolio',
   _uid, NULL, NULL, 'scheduled');

  -- -------------------------------------------------------
  -- 8. Employees (hired & onboarding)
  -- -------------------------------------------------------
  DELETE FROM public.employees WHERE organization_id = _org_id;

  INSERT INTO public.employees
    (organization_id, candidate_id, application_id, employee_code, full_name, email,
     joining_date, department, manager, position, status)
  VALUES
  (_org_id, c6, a11, 'NXT-0041', 'Aisha Williams', 'aisha.williams@nexora.io',
   (now() + interval '7 days')::date, 'Infrastructure', 'Raj Patel (VP Engineering)',
   'Senior DevOps Engineer', 'onboarding'),

  (_org_id, NULL, NULL, 'NXT-0038', 'Marcus Johnson', 'marcus.johnson@nexora.io',
   (now() - interval '45 days')::date, 'Engineering', 'Raj Patel (VP Engineering)',
   'Engineering Manager', 'active'),

  (_org_id, NULL, NULL, 'NXT-0035', 'Jennifer Wu', 'jennifer.wu@nexora.io',
   (now() - interval '90 days')::date, 'Product', 'Sarah Chen (CPO)',
   'Senior Product Manager', 'active'),

  (_org_id, NULL, NULL, 'NXT-0031', 'Tom Nguyen', 'tom.nguyen@nexora.io',
   (now() - interval '150 days')::date, 'Data & Analytics', 'Raj Patel (VP Engineering)',
   'Data Engineer', 'active'),

  (_org_id, NULL, NULL, 'NXT-0027', 'Emily Rodriguez', 'emily.rodriguez@nexora.io',
   (now() - interval '210 days')::date, 'Design', 'Sarah Chen (CPO)',
   'Product Designer', 'active'),

  (_org_id, NULL, NULL, 'NXT-0019', 'Kevin Lee', 'kevin.lee@nexora.io',
   (now() - interval '365 days')::date, 'Engineering', 'Marcus Johnson',
   'Staff Software Engineer', 'active'),

  (_org_id, NULL, NULL, 'NXT-0012', 'Priya Sharma', 'priya.sharma@nexora.io',
   (now() - interval '480 days')::date, 'Sales', 'Dana Fox (VP Sales)',
   'Account Executive', 'active'),

  (_org_id, NULL, NULL, 'NXT-0008', 'Alex Turner', 'alex.turner@nexora.io',
   (now() - interval '600 days')::date, 'Engineering', 'Raj Patel (VP Engineering)',
   'Senior Software Engineer', 'active');

  -- -------------------------------------------------------
  -- 9. Automations
  -- -------------------------------------------------------
  DELETE FROM public.automations WHERE organization_id = _org_id;

  INSERT INTO public.automations
    (organization_id, name, trigger, trigger_config, action, action_config, enabled)
  VALUES
  (_org_id,
   'Send Confirmation on Application',
   'application_created',
   '{"source": "any"}'::jsonb,
   'send_email',
   '{"template": "application_received", "to": "candidate"}'::jsonb,
   true),

  (_org_id,
   'Notify Recruiter on New Application',
   'application_created',
   '{}'::jsonb,
   'send_slack_notification',
   '{"channel": "#recruiting-ops", "message": "New application received for {{job_title}} from {{candidate_name}}"}'::jsonb,
   true),

  (_org_id,
   'Phone Screen Invite when Moved to Screening',
   'stage_changed',
   '{"to_stage": "screening"}'::jsonb,
   'send_email',
   '{"template": "phone_screen", "to": "candidate"}'::jsonb,
   true),

  (_org_id,
   'Technical Interview Email on Stage Advance',
   'stage_changed',
   '{"to_stage": "technical_interview"}'::jsonb,
   'send_email',
   '{"template": "interview_invite", "to": "candidate"}'::jsonb,
   true),

  (_org_id,
   'Auto-Reject After 30 Days Without Progress',
   'inactivity_timeout',
   '{"days": 30, "stages": ["applied", "screening"]}'::jsonb,
   'move_stage',
   '{"stage": "rejected", "send_rejection_email": true}'::jsonb,
   false),

  (_org_id,
   'Offer Sent Notification to Hiring Manager',
   'stage_changed',
   '{"to_stage": "offer"}'::jsonb,
   'send_email',
   '{"template": "internal_offer_notify", "to": "hiring_manager"}'::jsonb,
   true),

  (_org_id,
   'Create Onboarding Task on Hire',
   'stage_changed',
   '{"to_stage": "hired"}'::jsonb,
   'create_employee_record',
   '{"notify_hr": true, "send_welcome_email": true}'::jsonb,
   true);

  RAISE NOTICE 'Demo data seeded successfully for srinithinoffl@gmail.com (org_id: %)', _org_id;
END $$;
