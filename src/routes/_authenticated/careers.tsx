import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Copy, Check, Palette, Briefcase, Globe, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/careers")({
  head: () => ({ meta: [{ title: "Careers Page · HireFlow" }] }),
  component: CareersAdmin,
});

function buildCareersUrl(slug: string): string {
  if (typeof window === "undefined") return `https://${slug}.hireflow.app/careers`;
  const { hostname, port, protocol } = window.location;
  const parts = hostname.split(".");
  const base = parts.length >= 3 ? parts.slice(1).join(".") : hostname;
  const domain = port ? `${base}:${port}` : base;
  return `${protocol}//${slug}.${domain}/careers`;
}

function CareersAdmin() {
  const { data: org } = useCurrentOrg();
  const [copied, setCopied] = useState(false);

  const careersUrl = org?.slug ? buildCareersUrl(org.slug) : null;

  const { data: stats } = useQuery({
    enabled: !!org?.id,
    queryKey: ["careers-stats", org?.id],
    queryFn: async () => {
      const [published, draft] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("organization_id", org!.id).eq("status", "published"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("organization_id", org!.id).eq("status", "draft"),
      ]);
      return { published: published.count ?? 0, draft: draft.count ?? 0 };
    },
  });

  const { data: recentJobs } = useQuery({
    enabled: !!org?.id,
    queryKey: ["careers-recent-jobs", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, status, location, employment_type, published_at")
        .eq("organization_id", org!.id)
        .order("published_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  function copyUrl() {
    if (!careersUrl) return;
    navigator.clipboard.writeText(careersUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Careers Page</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your public-facing job board — share it with candidates.</p>
      </div>

      {/* URL banner */}
      <Card className="shadow-sm border-indigo-100 bg-indigo-50/40">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide mb-2">Your careers URL</p>
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 shrink-0 text-indigo-400" />
            {careersUrl ? (
              <a
                href={careersUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-sm font-medium text-indigo-700 hover:underline truncate"
              >
                {careersUrl}
              </a>
            ) : (
              <span className="flex-1 text-sm text-indigo-400">Loading…</span>
            )}
            <button
              onClick={copyUrl}
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {copied ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
            </button>
            {careersUrl && (
              <a
                href={careersUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />Open
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50">
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{stats?.published ?? "–"}</p>
              <p className="text-sm text-muted-foreground">Published jobs</p>
            </div>
            <Link to="/jobs" className="ml-auto">
              <Button size="sm" variant="outline" className="gap-1">
                Manage <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50">
              <Briefcase className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{stats?.draft ?? "–"}</p>
              <p className="text-sm text-muted-foreground">Draft jobs</p>
            </div>
            <Link to="/jobs/new" className="ml-auto">
              <Button size="sm" variant="outline" className="gap-1">
                New job <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent published jobs */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Published positions</CardTitle>
          <CardDescription>Jobs visible on your careers page right now</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!recentJobs || recentJobs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No published jobs yet.</p>
              <Link to="/jobs/new">
                <Button className="mt-3 gap-1.5" size="sm">Post your first job</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentJobs.map((j) => {
                const jobUrl = org?.slug
                  ? `${buildCareersUrl(org.slug)}/jobs/${j.id}`
                  : null;
                return (
                  <div key={j.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{j.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {j.location ?? "Remote"} · <span className="capitalize">{j.employment_type?.replaceAll("_", " ")}</span>
                      </p>
                    </div>
                    <Badge variant={j.status === "published" ? "default" : "secondary"} className="shrink-0 capitalize">
                      {j.status}
                    </Badge>
                    {jobUrl && j.status === "published" && (
                      <a href={jobUrl} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branding shortcut */}
      <Card className="shadow-sm">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-50">
            <Palette className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Branding</p>
            <p className="text-xs text-muted-foreground">Logo, colours and tagline for your careers page</p>
          </div>
          <Link to="/settings/branding">
            <Button size="sm" variant="outline" className="gap-1">
              Customise <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
