import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Briefcase, Users, GitBranch, Calendar, ArrowUpRight, Plus,
  TrendingUp, Video, Phone, Monitor, ChevronRight, Zap,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApplicationDrawer } from "@/components/application-drawer";
import { CandidateDrawer } from "@/components/candidate-drawer";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · HireFlow" }] }),
  component: Dashboard,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  applied:             "bg-slate-100 text-slate-600 border-slate-200",
  screening:           "bg-blue-100 text-blue-700 border-blue-200",
  hr_interview:        "bg-indigo-100 text-indigo-700 border-indigo-200",
  technical_interview: "bg-violet-100 text-violet-700 border-violet-200",
  manager_round:       "bg-purple-100 text-purple-700 border-purple-200",
  offer:               "bg-amber-100 text-amber-700 border-amber-200",
  hired:               "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected:            "bg-red-100 text-red-600 border-red-200",
};

const PIPELINE_STAGES = [
  { id: "applied",             label: "Applied",     bar: "bg-slate-400"   },
  { id: "screening",           label: "Screening",   bar: "bg-blue-500"    },
  { id: "hr_interview",        label: "HR",          bar: "bg-indigo-500"  },
  { id: "technical_interview", label: "Technical",   bar: "bg-violet-500"  },
  { id: "manager_round",       label: "Manager",     bar: "bg-purple-500"  },
  { id: "offer",               label: "Offer",       bar: "bg-amber-500"   },
];

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
];

const TYPE_ICON: Record<string, React.ElementType> = {
  video: Video, phone: Phone, onsite: Monitor, technical: Monitor,
  hr: Users, manager: Users,
};

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function avatarColor(id: string) {
  return AVATAR_COLORS[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % AVATAR_COLORS.length];
}
function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const { data: org } = useCurrentOrg();
  const [drawerAppId, setDrawerAppId] = useState<string | null>(null);
  const [drawerCandId, setDrawerCandId] = useState<string | null>(null);

  const { data: stats } = useQuery({
    enabled: !!org?.id,
    queryKey: ["dashboard-stats", org?.id],
    queryFn: async () => {
      const [jobs, candidates, apps, interviews] = await Promise.all([
        supabase.from("jobs").select("id, status").eq("organization_id", org!.id),
        supabase.from("candidates").select("id", { count: "exact", head: true }).eq("organization_id", org!.id),
        supabase.from("applications").select("id, stage").eq("organization_id", org!.id),
        supabase.from("interviews").select("id", { count: "exact", head: true })
          .eq("organization_id", org!.id).eq("status", "scheduled")
          .gte("scheduled_at", new Date().toISOString()),
      ]);
      const openJobs   = (jobs.data ?? []).filter(j => j.status === "published").length;
      const activeApps = (apps.data ?? []).filter(a => !["hired","rejected"].includes(a.stage)).length;
      return {
        openJobs, totalJobs: jobs.data?.length ?? 0,
        candidates: candidates.count ?? 0,
        activeApps, upcomingInterviews: interviews.count ?? 0,
      };
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

  const { data: upcoming } = useQuery({
    enabled: !!org?.id,
    queryKey: ["dash-upcoming", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("interviews")
        .select("id, scheduled_at, type, applications(candidates(full_name), jobs(title))")
        .eq("organization_id", org!.id)
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(4);
      return data ?? [];
    },
  });

  const { data: stageCounts } = useQuery({
    enabled: !!org?.id,
    queryKey: ["stage-dist", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("stage")
        .eq("organization_id", org!.id)
        .not("stage", "in", "(hired,rejected)");
      const counts: Record<string, number> = {};
      (data ?? []).forEach(a => { counts[a.stage] = (counts[a.stage] || 0) + 1; });
      return counts;
    },
  });

  // Today-specific data
  const { data: todayApps } = useQuery({
    enabled: !!org?.id,
    queryKey: ["today-apps", org?.id],
    queryFn: async () => {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("applications")
        .select("id, stage, applied_at, candidates(full_name), jobs(title)")
        .eq("organization_id", org!.id)
        .gte("applied_at", startOfDay.toISOString())
        .order("applied_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: todayInterviews } = useQuery({
    enabled: !!org?.id,
    queryKey: ["today-interviews", org?.id],
    queryFn: async () => {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay   = new Date(); endOfDay.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from("interviews")
        .select("id, scheduled_at, type, applications(candidates(full_name), jobs(title))")
        .eq("organization_id", org!.id)
        .eq("status", "scheduled")
        .gte("scheduled_at", startOfDay.toISOString())
        .lte("scheduled_at", endOfDay.toISOString())
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
  });

  // Bottleneck stages — more than 15 candidates stuck
  const bottlenecks = Object.entries(stageCounts ?? {})
    .filter(([, count]) => count >= 15)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="space-y-7 max-w-7xl">

      {/* ── Page header ── */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <span>{org?.company_name}</span>
              <ChevronRight className="h-3 w-3" />
              <span>Dashboard</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">{greeting()}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
          </div>
          <Link to="/jobs/new">
            <Button size="sm" className="gap-1.5 shadow-sm h-8 text-xs px-3">
              <Plus className="h-3.5 w-3.5" />New job
            </Button>
          </Link>
        </div>
        <div className="mt-4 border-b" />
      </div>

      {/* ── Today's agenda ── */}
      {((todayInterviews?.length ?? 0) > 0 || (todayApps?.length ?? 0) > 0 || bottlenecks.length > 0) && (
        <div className="rounded-xl border bg-primary/5 border-primary/10 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Today's agenda</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(todayInterviews?.length ?? 0) > 0 && (
              <Link to="/interviews" className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs hover:shadow-sm transition-all">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-semibold text-foreground">{todayInterviews!.length}</span>
                <span className="text-muted-foreground">interview{todayInterviews!.length > 1 ? "s" : ""} today</span>
              </Link>
            )}
            {(todayApps?.length ?? 0) > 0 && (
              <button
                onClick={() => setDrawerAppId(todayApps![0].id)}
                className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs hover:shadow-sm transition-all"
              >
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-semibold text-foreground">{todayApps!.length}</span>
                <span className="text-muted-foreground">new application{todayApps!.length > 1 ? "s" : ""} today</span>
              </button>
            )}
            {bottlenecks.map(([stage, count]) => (
              <Link key={stage} to="/pipeline" className="flex items-center gap-2 rounded-lg border bg-amber-50 border-amber-200 px-3 py-2 text-xs hover:shadow-sm transition-all">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-semibold text-amber-800">{count} stuck</span>
                <span className="text-amber-700">in {stage.replaceAll("_", " ")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Briefcase} label="Open Jobs" value={stats?.openJobs ?? 0}
          sub={`${stats?.totalJobs ?? 0} total positions`}
          accent="border-l-blue-500" iconBg="bg-blue-50" iconText="text-blue-600"
        />
        <KpiCard
          icon={Users} label="Total Candidates" value={stats?.candidates ?? 0}
          accent="border-l-violet-500" iconBg="bg-violet-50" iconText="text-violet-600"
        />
        <KpiCard
          icon={GitBranch} label="Active Applications" value={stats?.activeApps ?? 0}
          accent="border-l-amber-500" iconBg="bg-amber-50" iconText="text-amber-600"
        />
        <KpiCard
          icon={Calendar} label="Upcoming Interviews" value={stats?.upcomingInterviews ?? 0}
          accent="border-l-emerald-500" iconBg="bg-emerald-50" iconText="text-emerald-600"
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Recent applications — 2 cols */}
        <Card className="xl:col-span-2 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-5">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Applications</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Latest activity across all open roles</p>
            </div>
            <Link to="/pipeline" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Pipeline <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>

          {/* Table column headers */}
          {recent && recent.length > 0 && (
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-2 border-b bg-muted/30">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Candidate / Job</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-28 text-center">Stage</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-16 text-right">Applied</p>
            </div>
          )}

          {!recent || recent.length === 0 ? (
            <div className="py-14 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/25 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No applications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Share your careers page to start receiving applications.</p>
            </div>
          ) : (
            <div className="divide-y">
              {recent.map((r) => {
                const cand = (r as unknown as { candidates: { full_name: string; email: string } | null }).candidates;
                const job  = (r as unknown as { jobs: { title: string } | null }).jobs;
                return (
                  <button
                    key={r.id}
                    onClick={() => setDrawerAppId(r.id)}
                    className="w-full grid grid-cols-[1fr_auto_auto] gap-3 items-center py-3 px-5 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${avatarColor(r.id)}`}>
                        {initials(cand?.full_name ?? "?")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">{cand?.full_name ?? "Unknown"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{job?.title}</p>
                      </div>
                    </div>
                    <span className={`w-28 text-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${STAGE_COLORS[r.stage] ?? "bg-muted text-muted-foreground border-transparent"}`}>
                      {r.stage.replaceAll("_", " ")}
                    </span>
                    <span className="w-16 text-right text-[11px] text-muted-foreground tabular-nums">
                      {timeAgo(r.applied_at)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right panel */}
        <div className="space-y-4">

          {/* Pipeline funnel */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-5">
              <CardTitle className="text-sm font-semibold">Active Pipeline</CardTitle>
              <Link to="/pipeline" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                Board <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <div className="px-5 py-4">
              <PipelineFunnel counts={stageCounts ?? {}} />
            </div>
          </Card>

          {/* Upcoming interviews */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-5">
              <CardTitle className="text-sm font-semibold">Upcoming Interviews</CardTitle>
              <Link to="/interviews" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                All <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            {!upcoming || upcoming.length === 0 ? (
              <div className="py-7 text-center">
                <Calendar className="h-7 w-7 text-muted-foreground/25 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No upcoming interviews</p>
              </div>
            ) : (
              <div className="divide-y">
                {upcoming.map((i: unknown) => {
                  const iv = i as {
                    id: string; scheduled_at: string; type: string;
                    applications: { candidates: { full_name: string } | null; jobs: { title: string } | null } | null;
                  };
                  const d = new Date(iv.scheduled_at);
                  const TypeIcon = TYPE_ICON[iv.type] ?? Calendar;
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div key={iv.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10">
                        <TypeIcon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate leading-tight">
                          {iv.applications?.candidates?.full_name ?? "Unknown"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{iv.applications?.jobs?.title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold tabular-nums">
                          {d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className={`text-[11px] ${isToday ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          {isToday ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

        </div>
      </div>

      <CandidateDrawer
        candidateId={drawerCandId}
        onClose={() => setDrawerCandId(null)}
        onOpenApplication={id => { setDrawerCandId(null); setDrawerAppId(id); }}
      />
      <ApplicationDrawer
        applicationId={drawerAppId}
        onClose={() => setDrawerAppId(null)}
        onOpenCandidate={id => { setDrawerAppId(null); setDrawerCandId(id); }}
      />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent, iconBg, iconText }: {
  icon: typeof Briefcase; label: string; value: number; sub?: string;
  accent: string; iconBg: string; iconText: string;
}) {
  return (
    <div className={`rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden border-l-4 ${accent}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className={`grid h-8 w-8 place-items-center rounded-lg ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconText}`} />
          </div>
        </div>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Pipeline Funnel ─────────────────────────────────────────────────────────

function PipelineFunnel({ counts }: { counts: Record<string, number> }) {
  const active = PIPELINE_STAGES.filter(s => (counts[s.id] ?? 0) > 0);
  const total  = PIPELINE_STAGES.reduce((acc, s) => acc + (counts[s.id] ?? 0), 0);
  const max    = Math.max(...PIPELINE_STAGES.map(s => counts[s.id] ?? 0), 1);

  if (total === 0) {
    return (
      <div className="py-4 text-center">
        <GitBranch className="h-7 w-7 text-muted-foreground/25 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No active candidates</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {active.map(s => (
        <div key={s.id} className="flex items-center gap-2.5">
          <p className="w-16 text-[11px] text-muted-foreground text-right shrink-0">{s.label}</p>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${s.bar} rounded-full transition-all duration-500`}
              style={{ width: `${((counts[s.id] ?? 0) / max) * 100}%` }}
            />
          </div>
          <p className="w-5 text-right text-[11px] font-medium tabular-nums shrink-0">
            {counts[s.id] ?? 0}
          </p>
        </div>
      ))}
      <div className="pt-2 border-t">
        <p className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{total}</span> active candidate{total !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
