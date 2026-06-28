import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Users, GitBranch, Calendar, ArrowUpRight, Plus, TrendingUp, ExternalLink, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · HireFlow" }] }),
  component: Dashboard,
});

const STAGE_COLOR: Record<string, string> = {
  applied:              "bg-slate-100 text-slate-700",
  screening:            "bg-blue-100 text-blue-700",
  hr_interview:         "bg-indigo-100 text-indigo-700",
  technical_interview:  "bg-violet-100 text-violet-700",
  manager_round:        "bg-purple-100 text-purple-700",
  offer:                "bg-amber-100 text-amber-700",
  hired:                "bg-emerald-100 text-emerald-700",
  rejected:             "bg-red-100 text-red-600",
};

function stageBadge(stage: string) {
  return STAGE_COLOR[stage] ?? "bg-muted text-muted-foreground";
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function useCareersUrl(slug: string | undefined) {
  if (!slug || typeof window === "undefined") return null;
  const { hostname, port } = window.location;
  const parts = hostname.split(".");
  const base = parts.length >= 3 ? parts.slice(1).join(".") : hostname;
  const domain = port ? `${base}:${port}` : base;
  return `${window.location.protocol}//${slug}.${domain}/careers`;
}

function Dashboard() {
  const { data: org } = useCurrentOrg();
  const careersUrl = useCareersUrl(org?.slug);
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    if (!careersUrl) return;
    navigator.clipboard.writeText(careersUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const { data: stats } = useQuery({
    enabled: !!org?.id,
    queryKey: ["dashboard-stats", org?.id],
    queryFn: async () => {
      const orgId = org!.id;
      const [jobs, candidates, apps, interviews] = await Promise.all([
        supabase.from("jobs").select("id, status").eq("organization_id", orgId),
        supabase.from("candidates").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("applications").select("id, stage").eq("organization_id", orgId),
        supabase.from("interviews").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("scheduled_at", new Date().toISOString()),
      ]);
      const openJobs   = (jobs.data ?? []).filter(j => j.status === "published").length;
      const activeApps = (apps.data ?? []).filter(a => !["hired","rejected"].includes(a.stage)).length;
      return { openJobs, totalJobs: jobs.data?.length ?? 0, candidates: candidates.count ?? 0, activeApps, upcomingInterviews: interviews.count ?? 0 };
    },
  });

  const { data: recent } = useQuery({
    enabled: !!org?.id,
    queryKey: ["recent-apps", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, stage, applied_at, candidates(full_name, email), jobs(title)")
        .eq("organization_id", org!.id)
        .order("applied_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="text-2xl font-semibold tracking-tight mt-0.5">{org?.company_name ?? "Dashboard"}</h1>
        </div>
        <Link to="/jobs/new">
          <Button className="gap-1.5 shadow-sm"><Plus className="h-4 w-4" /> New job</Button>
        </Link>
      </div>

      {/* Careers page URL banner */}
      {careersUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3">
          <ExternalLink className="h-4 w-4 shrink-0 text-indigo-500" />
          <a
            href={careersUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-indigo-700 font-medium truncate flex-1 hover:underline"
          >{careersUrl}</a>
          <button
            onClick={copyUrl}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {copied ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
          </button>
          <a
            href={careersUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Open ↗
          </a>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Briefcase} label="Open jobs" value={stats?.openJobs ?? 0} sub={`${stats?.totalJobs ?? 0} total`} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard icon={Users} label="Candidates" value={stats?.candidates ?? 0} iconBg="bg-violet-50" iconColor="text-violet-600" />
        <StatCard icon={GitBranch} label="Active applications" value={stats?.activeApps ?? 0} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard icon={Calendar} label="Upcoming interviews" value={stats?.upcomingInterviews ?? 0} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
      </div>

      {/* Recent applications */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
          <CardTitle className="text-base font-semibold">Recent applications</CardTitle>
          <Link to="/pipeline" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View pipeline <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {!recent || recent.length === 0 ? (
            <div className="py-14 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No applications yet</p>
              <p className="text-xs text-muted-foreground mt-1">Share your careers page to start receiving applications.</p>
            </div>
          ) : (
            <div className="divide-y">
              {recent.map((r) => {
                const cand = (r as unknown as { candidates: { full_name: string; email: string } | null }).candidates;
                const job  = (r as unknown as { jobs: { title: string } | null }).jobs;
                return (
                  <Link key={r.id} to="/applications/$id" params={{ id: r.id }}
                    className="flex items-center gap-3 py-3 px-5 hover:bg-muted/40 transition-colors">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(cand?.full_name ?? "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cand?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{job?.title} · {cand?.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${stageBadge(r.stage)}`}>
                      {r.stage.replaceAll("_", " ")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor }: {
  icon: typeof Briefcase; label: string; value: number; sub?: string; iconBg: string; iconColor: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className={`grid h-8 w-8 place-items-center rounded-lg ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
