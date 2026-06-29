import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase, Users, GitBranch, Calendar, Sparkles, ArrowRight, Check,
  Globe, Mail, Zap, FileText, UserCheck, Star, LayoutDashboard,
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

const FEATURE_CARDS = [
  {
    icon: Globe,
    title: "Branded careers site",
    body: "Your own public job board on a custom subdomain, complete with your logo, brand colour, and tagline — live in seconds.",
  },
  {
    icon: GitBranch,
    title: "Visual hiring pipeline",
    body: "Drag candidates through stages. See every application at a glance with a kanban board built for recruiters.",
  },
  {
    icon: Users,
    title: "Candidate CRM",
    body: "Build and search a talent pool across every role. Resume uploads, profiles, and full application history in one place.",
  },
  {
    icon: Sparkles,
    title: "AI screening & scoring",
    body: "Auto-parse resumes and score each candidate's fit against the role. Spend less time reading, more time hiring.",
  },
  {
    icon: Calendar,
    title: "Interviews & feedback",
    body: "Schedule interviews, capture structured feedback, and keep the whole team aligned at every stage.",
  },
  {
    icon: Zap,
    title: "Email & automation",
    body: "Reusable email templates, automated stage-based workflows, and your own SMTP sender — so candidates always hear from you.",
  },
];

const ALL_FEATURES = [
  { icon: Globe,          label: "Public careers page on your own subdomain" },
  { icon: Briefcase,      label: "Job posting with rich descriptions & requirements" },
  { icon: GitBranch,      label: "Kanban pipeline with customisable hiring stages" },
  { icon: Users,          label: "Candidate profiles with secure resume storage" },
  { icon: Star,           label: "Talent CRM to track leads and past applicants" },
  { icon: Calendar,       label: "Interview scheduling with structured feedback" },
  { icon: Sparkles,       label: "AI resume parsing to extract candidate details instantly" },
  { icon: Sparkles,       label: "AI candidate scoring & fit analysis per role" },
  { icon: FileText,       label: "Offer letter generation and tracking" },
  { icon: UserCheck,      label: "Employee onboarding workflows" },
  { icon: Mail,           label: "Email templates for every hiring stage" },
  { icon: Zap,            label: "Automated candidate communications by pipeline stage" },
  { icon: LayoutDashboard,label: "Dashboard with real-time hiring analytics" },
  { icon: Users,          label: "Multi-member team workspaces with role management" },
  { icon: Globe,          label: "Custom branding — logo, colours, and tagline" },
  { icon: Mail,           label: "SMTP integration for sending from your own domain" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b sticky top-0 z-20 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Briefcase className="h-4 w-4" />
            </div>
            HireFlow
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth" search={{ mode: "signup" }}><Button size="sm">Get started free</Button></Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> AI-powered resume scoring, included
        </div>
        <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
          Hire faster,<br className="hidden md:block" /> without the chaos.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
          HireFlow is a full applicant tracking system built for fast-moving teams. Post jobs, run a clear pipeline,
          interview candidates, send offers, and onboard your next hire — from a single workspace.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="gap-2">Start for free <ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border bg-surface p-6">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Full feature list */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold tracking-tight">Everything included</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Every feature is available from day one — no add-ons, no locked tiers.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ALL_FEATURES.map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to build your hiring engine?</h2>
          <p className="mt-3 text-muted-foreground">Set up your workspace and careers page in under a minute.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="gap-2">Get started free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground">
              <Briefcase className="h-3 w-3" />
            </div>
            <span>© {new Date().getFullYear()} HireFlow</span>
          </div>
          <Link to="/auth" className="hover:text-foreground transition-colors">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
