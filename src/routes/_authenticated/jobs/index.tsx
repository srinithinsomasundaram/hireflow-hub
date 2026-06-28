import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ExternalLink, Pencil, Trash2, Briefcase, MapPin, Clock } from "lucide-react";
import { ListSkeleton } from "@/components/loading";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function buildSubdomainUrl(slug: string, path = ""): string {
  if (typeof window === "undefined") return `https://${slug}.hireflow.app${path}`;
  const { hostname, port, protocol } = window.location;
  const parts = hostname.split(".");
  const base = parts.length >= 3 ? parts.slice(1).join(".") : hostname;
  const domain = port ? `${base}:${port}` : base;
  return `${protocol}//${slug}.${domain}${path}`;
}

export const Route = createFileRoute("/_authenticated/jobs/")({
  head: () => ({ meta: [{ title: "Jobs · HireFlow" }] }),
  component: JobsList,
});

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft:     "bg-slate-100 text-slate-600 border-slate-200",
  closed:    "bg-orange-100 text-orange-600 border-orange-200",
  archived:  "bg-red-100 text-red-600 border-red-200",
};

function JobsList() {
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["jobs", org?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("organization_id", org!.id).order("created_at", { ascending: false }).limit(200);
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
      const { error } = await supabase.from("jobs").update({ status: next, published_at: next === "published" ? new Date().toISOString() : null }).eq("id", j.id).eq("organization_id", org!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const published = (jobs ?? []).filter(j => j.status === "published").length;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {jobs ? `${jobs.length} total · ${published} published` : "Manage open positions and publish to your careers site."}
          </p>
        </div>
        <Link to="/jobs/new">
          <Button className="gap-1.5 shadow-sm"><Plus className="h-4 w-4" /> New job</Button>
        </Link>
      </div>

      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) :!jobs || jobs.length === 0 ? (
          <CardContent className="py-16 text-center">
            <Briefcase className="h-9 w-9 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-sm">No jobs yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first job and publish it to your careers page.</p>
            <Link to="/jobs/new">
              <Button className="mt-4 gap-1.5"><Plus className="h-4 w-4" /> Create first job</Button>
            </Link>
          </CardContent>
        ) : (
          <div className="divide-y">
            {jobs.map((j) => (
              <div key={j.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to="/jobs/$id" params={{ id: j.id }} className="font-medium text-sm hover:underline">{j.title}</Link>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {j.department && <span className="text-xs text-muted-foreground">{j.department}</span>}
                    {j.location && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />{j.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground capitalize">
                      <Clock className="h-3 w-3" />{j.employment_type.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[j.status] ?? "bg-muted text-muted-foreground"}`}>
                    {j.status}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggle.mutate(j)}>
                    {j.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  {j.status === "published" && org && (
                    <a
                      href={buildSubdomainUrl(org.slug, `/careers/jobs/${j.id}`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    </a>
                  )}
                  <Link to="/jobs/$id" params={{ id: j.id }}>
                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3.5 w-3.5" /></Button>
                  </Link>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => { if (confirm("Delete this job?")) del.mutate(j.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
