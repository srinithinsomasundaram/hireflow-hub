import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, ExternalLink, Pencil, Trash2, Briefcase, MapPin, Clock, ChevronRight, Users, Search, MoreHorizontal, Upload } from "lucide-react";
import { ListSkeleton } from "@/components/loading";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JobImportDialog } from "@/components/job-import-dialog";

function buildSubdomainUrl(slug: string, path = ""): string {
  const domain = import.meta.env.VITE_APP_DOMAIN ?? "hireflow.yesp.space";
  return `https://${slug}.${domain}${path}`;
}

export const Route = createFileRoute("/_authenticated/jobs/")({
  head: () => ({ meta: [{ title: "Jobs · HireFlow" }] }),
  component: JobsList,
});

const STATUS_DOT: Record<string, string> = {
  published: "bg-emerald-500",
  draft:     "bg-slate-400",
  closed:    "bg-orange-400",
  archived:  "bg-red-400",
};

const STATUS_BADGE: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft:     "bg-slate-100 text-slate-600 border-slate-200",
  closed:    "bg-orange-50 text-orange-600 border-orange-200",
  archived:  "bg-red-50 text-red-600 border-red-200",
};

type FilterKey = "all" | "published" | "draft" | "closed";

const CAN_MANAGE_JOBS = ["owner", "admin", "recruiter", "hiring_manager"];

function JobsList() {
  const { data: org } = useCurrentOrg();
  const canManage = org ? CAN_MANAGE_JOBS.includes(org.role) : false;
  const qc = useQueryClient();
  const [filter, setFilter]       = useState<FilterKey>("all");
  const [search, setSearch]       = useState("");
  const [importing, setImporting] = useState(false);

  const { data: appCounts } = useQuery({
    enabled: !!org?.id,
    queryKey: ["job-app-counts", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications").select("job_id").eq("organization_id", org!.id);
      const counts: Record<string, number> = {};
      (data ?? []).forEach(a => { if (a.job_id) counts[a.job_id] = (counts[a.job_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: jobs, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["jobs", org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("organization_id", org!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id).eq("organization_id", org!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast.success("Job deleted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const toggle = useMutation({
    mutationFn: async (j: { id: string; status: string }) => {
      const next = j.status === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("jobs")
        .update({ status: next, published_at: next === "published" ? new Date().toISOString() : null })
        .eq("id", j.id)
        .eq("organization_id", org!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const counts = {
    all:       (jobs ?? []).length,
    published: (jobs ?? []).filter(j => j.status === "published").length,
    draft:     (jobs ?? []).filter(j => j.status === "draft").length,
    closed:    (jobs ?? []).filter(j => j.status === "closed" || j.status === "archived").length,
  };

  const byStatus =
    filter === "all"    ? (jobs ?? []) :
    filter === "closed" ? (jobs ?? []).filter(j => j.status === "closed" || j.status === "archived") :
                          (jobs ?? []).filter(j => j.status === filter);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? byStatus.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.department ?? "").toLowerCase().includes(q) ||
        (j.location ?? "").toLowerCase().includes(q)
      )
    : byStatus;

  const tabs: { key: FilterKey; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "published", label: "Published" },
    { key: "draft",     label: "Drafts" },
    { key: "closed",    label: "Closed" },
  ];

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Header ── */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <span>Workspace</span>
              <ChevronRight className="h-3 w-3" />
              <span>Jobs</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Jobs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {jobs ? `${counts.all} positions · ${counts.published} published` : "Manage open positions"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search jobs…"
                className="h-8 pl-8 pr-3 text-xs w-48 focus:w-56 transition-all"
              />
            </div>
            {canManage && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs px-3" onClick={() => setImporting(true)}>
                  <Upload className="h-3.5 w-3.5" />Import
                </Button>
                <Link to="/jobs/new">
                  <Button size="sm" className="gap-1.5 shadow-sm h-8 text-xs px-3">
                    <Plus className="h-3.5 w-3.5" />New job
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 border-b" />
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`rounded-full px-1.5 py-px text-[11px] tabular-nums font-medium ${
                filter === tab.key
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {counts[tab.key]}
              </span>
            )}
            {filter === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Jobs list ── */}
      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <CardContent className="py-16 text-center">
            <Briefcase className="h-9 w-9 text-muted-foreground/25 mx-auto mb-3" />
            <p className="font-medium text-sm">
              {filter === "all" ? "No jobs yet" : `No ${filter} jobs`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === "all"
                ? "Create your first job and publish it to your careers page."
                : `You have no jobs with "${filter}" status.`}
            </p>
            {filter === "all" && (
              <Link to="/jobs/new">
                <Button className="mt-4 gap-1.5"><Plus className="h-4 w-4" />Create first job</Button>
              </Link>
            )}
          </CardContent>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden sm:grid px-5 py-2.5 border-b bg-muted/30"
                 style={{ gridTemplateColumns: "1fr 6rem 5.5rem 2.5rem" }}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Job title</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-center">Applications</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-center">Status</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" />
            </div>
            <div className="divide-y">
            {filtered.map((j) => (
              <div key={j.id}
                   className="group flex items-start sm:items-center gap-3 sm:gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors">

                {/* Info */}
                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                  <div className={`mt-1.5 sm:mt-0 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[j.status] ?? "bg-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to="/jobs/$id" params={{ id: j.id }}
                            className="text-sm font-medium hover:underline underline-offset-2 truncate">
                        {j.title}
                      </Link>
                      <span className={`sm:hidden rounded-full border px-2 py-px text-[11px] font-medium capitalize ${STATUS_BADGE[j.status] ?? "bg-muted text-muted-foreground border-transparent"}`}>
                        {j.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                      {j.department && <span className="text-xs text-muted-foreground">{j.department}</span>}
                      {j.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />{j.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground capitalize">
                        <Clock className="h-3 w-3" />{j.employment_type.replaceAll("_", " ")}
                      </span>
                      <span className="sm:hidden inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />{appCounts?.[j.id] ?? 0} applicants
                      </span>
                    </div>
                  </div>
                </div>

                {/* Application count — desktop */}
                <div className="hidden sm:flex w-24 items-center justify-center gap-1.5 shrink-0">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium tabular-nums">
                    {appCounts?.[j.id] ?? 0}
                  </span>
                </div>

                {/* Status — desktop */}
                <div className="hidden sm:flex w-[5.5rem] justify-center shrink-0">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[j.status] ?? "bg-muted text-muted-foreground border-transparent"}`}>
                    {j.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="shrink-0 ml-auto sm:ml-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem asChild>
                        <Link to="/jobs/$id" params={{ id: j.id }} className="flex items-center gap-2">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      {j.status === "published" && org && (
                        <DropdownMenuItem asChild>
                          <a
                            href={buildSubdomainUrl(org.slug, `/careers/jobs/${j.id}`)}
                            target="_blank" rel="noreferrer"
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> View live
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="flex items-center gap-2"
                        onClick={() => toggle.mutate(j)}
                      >
                        {j.status === "published"
                          ? <><Clock className="h-3.5 w-3.5" /> Unpublish</>
                          : <><ExternalLink className="h-3.5 w-3.5" /> Publish</>
                        }
                      </DropdownMenuItem>
                      {canManage && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="flex items-center gap-2 text-destructive focus:text-destructive"
                            onClick={() => { if (confirm("Delete this job?")) del.mutate(j.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </Card>
      <JobImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        onImported={() => qc.invalidateQueries({ queryKey: ["jobs"] })}
      />
    </div>
  );
}
