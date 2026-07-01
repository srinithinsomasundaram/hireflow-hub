import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Briefcase, Users, GitBranch, Calendar, Sparkles, ArrowRight,
  Globe, Zap, LayoutDashboard, ChevronRight, Shield, Clock, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HireFlow — The modern ATS for fast-growing teams" },
      { name: "description", content: "Post jobs, manage candidates, run interviews, and onboard new hires — all from one workspace your team will actually use." },
      { property: "og:title", content: "HireFlow — The modern ATS for fast-growing teams" },
      { property: "og:description", content: "Post jobs, manage candidates, run interviews, and onboard new hires." },
    ],
  }),
  component: Landing,
});

// ─── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "10 min", label: "average setup time" },
  { value: "100%", label: "features, day one" },
  { value: "0", label: "per-seat upsells" },
  { value: "1", label: "workspace for your whole team" },
];

const FEATURES = [
  {
    icon: Globe,
    color: "bg-indigo-100 text-indigo-600",
    title: "Branded careers site",
    body: "Your own job board on a custom subdomain, live in seconds. Your logo, your colours, your jobs.",
  },
  {
    icon: GitBranch,
    color: "bg-violet-100 text-violet-600",
    title: "Visual hiring pipeline",
    body: "Drag candidates through stages. Kanban view built for recruiters — see everything at a glance.",
  },
  {
    icon: Sparkles,
    color: "bg-amber-100 text-amber-600",
    title: "AI resume scoring",
    body: "Auto-parse resumes and rank candidates by fit. Spend less time reading, more time hiring.",
  },
  {
    icon: Calendar,
    color: "bg-emerald-100 text-emerald-600",
    title: "Interviews & feedback",
    body: "Schedule interviews, capture structured feedback, and keep your whole team aligned.",
  },
  {
    icon: Zap,
    color: "bg-rose-100 text-rose-600",
    title: "Email & automations",
    body: "Stage-based triggers, reusable templates, and your own SMTP — so candidates never fall silent.",
  },
  {
    icon: Users,
    color: "bg-teal-100 text-teal-600",
    title: "Talent CRM",
    body: "Build a searchable talent pool. Resume storage, full history, and pipeline tracking in one place.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create your workspace",
    body: "Sign up, name your company, and get a branded careers page on your own subdomain — in under 60 seconds.",
  },
  {
    n: "02",
    title: "Post your first job",
    body: "Write a rich job description, set requirements, and publish. Your careers page updates automatically.",
  },
  {
    n: "03",
    title: "Hire with confidence",
    body: "Applications flow into your pipeline. Score, interview, send offers, and onboard — all in one place.",
  },
];

const DOC_SECTIONS = [
  {
    id: "setup",
    label: "Workspace Setup",
    icon: LayoutDashboard,
    description: "Configure your organisation, branding, and team access in under ten minutes.",
    steps: [
      {
        title: "Create your organisation",
        desc: "Sign up and enter your company name. HireFlow provisions a private workspace and a public careers page on your own subdomain immediately — no waiting, no credit card required.",
        note: "app.hireflow.io / your-company / careers",
      },
      {
        title: "Configure your brand",
        desc: "Upload a logo, pick primary colours, and add a company tagline. Changes propagate across your job board, candidate-facing emails, and offer letters the moment you save.",
      },
      {
        title: "Invite your team",
        desc: "Add recruiters, hiring managers, and interviewers by email. Each member gets a role — Admin, Recruiter, or Interviewer — controlling exactly what they can view and act on.",
      },
    ],
  },
  {
    id: "jobs",
    label: "Jobs & Pipeline",
    icon: Briefcase,
    description: "Publish roles and guide candidates through a structured, transparent hiring funnel.",
    steps: [
      {
        title: "Post a job",
        desc: "Write a rich job description, set requirements, and define custom pipeline stages. The role appears on your public careers page the moment you click publish.",
      },
      {
        title: "Review applications",
        desc: "Every applicant lands in your pipeline with a parsed resume and an AI fit score. Filter, sort, and bulk-action candidates — all from the Kanban board without switching views.",
      },
      {
        title: "Move candidates through stages",
        desc: "Drag-and-drop candidates between pipeline stages. Each transition can trigger automated status emails to candidates so no one is left guessing about their application.",
      },
    ],
  },
  {
    id: "interviews",
    label: "Interviews",
    icon: Calendar,
    description: "Schedule, brief, and score interviews — then make decisions together as a team.",
    steps: [
      {
        title: "Schedule interviews",
        desc: "Propose times, send calendar invites, and attach video-conference links — all from the candidate profile. Interviewers receive a briefing with the resume and role details attached.",
      },
      {
        title: "Collect structured feedback",
        desc: "Each interviewer submits a scorecard after the session. Ratings and written notes aggregate into a shared view so your team can move from interview to decision without a sync meeting.",
      },
      {
        title: "Generate and track offers",
        desc: "Produce a branded offer letter from a reusable template, deliver it directly to the candidate, and track opens and acceptance status — everything logged inside HireFlow.",
      },
    ],
  },
  {
    id: "automation",
    label: "Automations",
    icon: Zap,
    description: "Eliminate repetitive communication work with stage-based triggers and reusable templates.",
    steps: [
      {
        title: "Define stage triggers",
        desc: "Set an email rule for every pipeline stage. When a candidate moves to Interview they get a preparation guide; when declined they receive a personalised note — triggered automatically, zero manual effort.",
      },
      {
        title: "Build reusable templates",
        desc: "Create email templates with dynamic variables that merge candidate and role data at send time. Templates are shared across your team and versioned for consistency.",
        note: "Variables: {candidate_name}  ·  {job_title}  ·  {stage}",
      },
      {
        title: "Connect your SMTP",
        desc: "Route all candidate emails through your own domain instead of a generic sender. Plug in SMTP credentials once and every outbound message carries your brand.",
        note: "smtp.yourdomain.com  ·  port 587  ·  STARTTLS",
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: TrendingUp,
    description: "Track funnel performance, source quality, and time-to-hire across every open role.",
    steps: [
      {
        title: "Monitor the hiring funnel",
        desc: "See candidate volume at each stage, conversion rates between stages, and time-to-hire per role — updated in real time. Identify bottlenecks before they cost you a great candidate.",
      },
      {
        title: "Evaluate source performance",
        desc: "Understand which channels — job boards, referrals, direct traffic — produce the highest-quality applicants. Compare sources by volume and by how far candidates advance through the funnel.",
      },
      {
        title: "Export for reporting",
        desc: "Download complete hiring data as CSV for board presentations, compliance audits, or your own BI stack. All history is retained and always accessible.",
      },
    ],
  },
] as const;

// ─── Mini dashboard mockup ────────────────────────────────────────────────────

function DashboardMockup() {
  const stages = [
    { label: "Applied", count: 24, color: "bg-slate-400", w: "w-full" },
    { label: "Screening", count: 11, color: "bg-indigo-500", w: "w-8/12" },
    { label: "Interview", count: 6, color: "bg-violet-500", w: "w-5/12" },
    { label: "Offer", count: 2, color: "bg-amber-500", w: "w-2/12" },
  ];

  const candidates = [
    { name: "Sarah Chen", role: "Product Designer", stage: "Interview", dot: "bg-violet-500" },
    { name: "Marcus Webb", role: "Eng. Manager", stage: "Screening", dot: "bg-indigo-500" },
    { name: "Priya Nair", role: "Product Designer", stage: "Offer", dot: "bg-amber-500" },
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none pointer-events-none">
      <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-3xl" />
      <div className="relative rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-md bg-background border px-3 py-1 text-[11px] text-muted-foreground">
            <Globe className="h-3 w-3" /> app.hireflow.io/dashboard
          </div>
        </div>
        <div className="flex h-[340px]">
          <div className="w-44 shrink-0 border-r bg-[oklch(0.22_0.025_260)] flex flex-col p-3 gap-1">
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
              <div className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
                <Briefcase className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-semibold text-white">HireFlow</span>
            </div>
            {[
              { icon: LayoutDashboard, label: "Dashboard", active: true },
              { icon: Briefcase, label: "Jobs", active: false },
              { icon: GitBranch, label: "Pipeline", active: false },
              { icon: Users, label: "Candidates", active: false },
              { icon: Calendar, label: "Interviews", active: false },
            ].map(({ icon: Icon, label, active }) => (
              <div key={label} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${active ? "bg-white/10 text-white" : "text-white/50"}`}>
                <Icon className="h-3 w-3 shrink-0" /> {label}
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-hidden p-4 bg-background">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Open roles", val: "8" },
                { label: "Candidates", val: "143" },
                { label: "This week", val: "+12" },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-lg border bg-card p-2.5">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{val}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border bg-card p-3 mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">PIPELINE</p>
              <div className="space-y-1.5">
                {stages.map(({ label, count, color, w }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-14 text-[9px] text-muted-foreground shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${color} ${w}`} />
                    </div>
                    <span className="text-[9px] font-medium text-foreground w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">RECENT</p>
              <div className="space-y-1.5">
                {candidates.map(({ name, role, stage, dot }) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[8px] font-bold text-primary">
                      {name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-foreground truncate">{name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{role}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      <span className="text-[9px] text-muted-foreground">{stage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Documentation tabs ───────────────────────────────────────────────────────

function DocsTabs() {
  const [activeId, setActiveId] = useState<string>(DOC_SECTIONS[0].id);
  const section = DOC_SECTIONS.find((s) => s.id === activeId) ?? DOC_SECTIONS[0];
  const SectionIcon = section.icon;

  return (
    <div className="rounded-2xl border bg-card shadow-lg overflow-hidden">
      {/* Tab bar */}
      <div className="border-b bg-muted/30 flex overflow-x-auto scrollbar-none">
        {DOC_SECTIONS.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setActiveId(id)}
            className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all focus:outline-none ${
              activeId === id
                ? "border-primary text-primary bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <TabIcon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="grid lg:grid-cols-[280px_1fr] min-h-[460px]">
        {/* Left sidebar */}
        <div className="border-r bg-muted/20 p-8 flex flex-col">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary mb-5 shrink-0">
            <SectionIcon className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{section.label}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{section.description}</p>

          <div className="mt-8 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              In this section
            </p>
            {section.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground leading-snug">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: step-by-step */}
        <div className="p-8 lg:p-10">
          {section.steps.map((step, i) => {
            const isLast = i === section.steps.length - 1;
            return (
              <div key={i} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary/5 text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  {!isLast && <div className="w-px flex-1 min-h-[24px] bg-border my-2" />}
                </div>
                <div className={`${isLast ? "pb-0" : "pb-10"} min-w-0`}>
                  <h4 className="font-semibold text-base mb-2">{step.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  {"note" in step && step.note && (
                    <div className="mt-3 inline-flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span className="font-mono text-xs text-slate-300 leading-relaxed">{step.note}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Briefcase className="h-4 w-4" />
            </div>
            HireFlow
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#docs" className="hover:text-foreground transition-colors">Documentation</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" className="gap-1.5">Get started <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-primary/8 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16">
          <div className="flex flex-col items-center text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1 text-xs text-muted-foreground mb-6">
              <Sparkles className="h-3 w-3 text-primary" />
              AI-powered screening & scoring — included
            </div>
            <h1 className="max-w-3xl text-balance text-5xl font-bold tracking-tight leading-tight md:text-6xl lg:text-7xl">
              Hire faster,<br />
              <span className="text-primary">without the chaos.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
              HireFlow is a full applicant tracking system built for fast-moving teams.
              Post jobs, run a clear pipeline, interview candidates, and send offers —
              from one workspace your team will actually use.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="gap-2 px-6 h-12 text-base">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="h-12 text-base px-6">
                  Sign in
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Setup in under 60 seconds
            </p>
          </div>
          <DashboardMockup />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-bold text-foreground">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
          <h2 className="text-4xl font-bold tracking-tight">Everything your hiring team needs</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            From the first job post to the offer letter — HireFlow covers the full hiring lifecycle.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, color, title, body }) => (
            <div key={title} className="group rounded-2xl border bg-card p-6 hover:shadow-md hover:border-primary/30 transition-all duration-200">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-base">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-4xl font-bold tracking-tight">Up and running in minutes</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              No long onboarding, no sales call. Just sign up and start hiring.
            </p>
          </div>
          <div className="relative grid gap-8 md:grid-cols-3">
            <div className="absolute top-8 left-[16.6%] right-[16.6%] h-px bg-border hidden md:block" />
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="relative flex flex-col items-center text-center md:items-start md:text-left">
                <div className="relative z-10 grid h-16 w-16 place-items-center rounded-2xl border-2 border-primary bg-background text-xl font-bold text-primary mb-5">
                  {n}
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-t border-b">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 text-sm text-muted-foreground">
            {[
              { icon: Shield, label: "SOC 2-ready infrastructure" },
              { icon: Clock, label: "99.9% uptime SLA" },
              { icon: TrendingUp, label: "Built for scale from day one" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Documentation ── */}
      <section id="docs" className="border-t bg-muted/10">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Documentation</p>
              <h2 className="text-4xl font-bold tracking-tight">Learn every feature</h2>
              <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">
                Everything you need to run your end-to-end hiring process — from workspace
                configuration to offer letters and reporting.
              </p>
            </div>
            <div className="shrink-0">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button variant="outline" size="sm" className="gap-2">
                  Open app <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          <DocsTabs />

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border bg-card px-6 py-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Briefcase className="h-4 w-4" />
              </div>
              <span>Need help? Every feature has in-app guidance built in.</span>
            </div>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" className="gap-1.5 whitespace-nowrap">
                Try it free <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t bg-primary">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-primary-foreground">
            Ready to build your hiring engine?
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-lg mx-auto">
            Set up your workspace and branded careers page in under a minute.
            No sales call, no setup fee.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" variant="secondary" className="gap-2 h-12 px-8 text-base">
                Start for free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col md:flex-row items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <div className="grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground">
              <Briefcase className="h-3 w-3" />
            </div>
            HireFlow
          </div>
          <p className="text-xs">© {new Date().getFullYear()} HireFlow. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/auth" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="hover:text-foreground transition-colors">Get started</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
