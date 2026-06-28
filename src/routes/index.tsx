import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, Users, BarChart3, Sparkles, ArrowRight, Check } from "lucide-react";
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

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Briefcase className="h-4 w-4" />
            </div>
            HireFlow
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth" search={{ mode: "signup" }}><Button size="sm">Get started</Button></Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> AI-powered resume scoring, included
        </div>
        <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
          Hire faster, without the chaos.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
          HireFlow is the modern applicant tracking system. Post jobs, run a clear pipeline, interview candidates,
          and onboard your next hire — from a single, dense, recruiter-friendly workspace.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="gap-2">Start free <ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <Link to="/auth"><Button size="lg" variant="outline">Sign in</Button></Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Briefcase, title: "Jobs & careers site", body: "Publish openings to your own branded careers page in one click." },
            { icon: Users, title: "Pipeline & CRM", body: "Drag candidates through stages. Keep a searchable talent pool." },
            { icon: BarChart3, title: "AI screening", body: "Auto-parse resumes and score fit against each role." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border bg-surface p-6">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Everything you need to hire</h2>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              "Multi-tenant workspaces with team roles",
              "Branded careers site at /c/your-company",
              "Resume uploads with secure storage",
              "Kanban hiring pipeline with stage automation",
              "Interview scheduling and feedback",
              "AI-powered candidate screening & scoring",
              "Email templates for the full candidate journey",
              "Offer letters and onboarding workflow",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 rounded-md border bg-surface px-4 py-3 text-sm">
                <Check className="h-4 w-4 text-primary" /> {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} HireFlow</span>
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
