import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ChevronRight, ExternalLink, Loader2, Globe, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/jobs/$id")({
  head: () => ({ meta: [{ title: "Job · HireFlow" }] }),
  component: JobDetail,
});

const STATUS_BADGE: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft:     "bg-slate-100 text-slate-600 border-slate-200",
  closed:    "bg-orange-50 text-orange-600 border-orange-200",
  archived:  "bg-red-50 text-red-600 border-red-200",
};

const STAGE_DOT: Record<string, string> = {
  applied:             "bg-slate-400",
  screening:           "bg-blue-500",
  hr_interview:        "bg-indigo-500",
  technical_interview: "bg-violet-500",
  manager_round:       "bg-purple-500",
  offer:               "bg-amber-500",
  hired:               "bg-emerald-500",
  rejected:            "bg-red-400",
};

const STAGE_BADGE: Record<string, string> = {
  applied:             "bg-slate-100 text-slate-600 border-slate-200",
  screening:           "bg-blue-100 text-blue-700 border-blue-200",
  hr_interview:        "bg-indigo-100 text-indigo-700 border-indigo-200",
  technical_interview: "bg-violet-100 text-violet-700 border-violet-200",
  manager_round:       "bg-purple-100 text-purple-700 border-purple-200",
  offer:               "bg-amber-100 text-amber-700 border-amber-200",
  hired:               "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected:            "bg-red-100 text-red-600 border-red-200",
};

function JobDetail() {
  const { id } = Route.useParams();
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();

  const { data: job, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs").select("*").eq("id", id).eq("organization_id", org!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: apps } = useQuery({
    enabled: !!org?.id,
    queryKey: ["job-apps", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, stage, applied_at, candidates(full_name, email)")
        .eq("job_id", id).eq("organization_id", org!.id)
        .order("applied_at", { ascending: false });
      return data ?? [];
    },
  });

  const [form, setForm] = useState<typeof job | null>(null);
  useEffect(() => { if (job) setForm(job); }, [job]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const { error } = await supabase.from("jobs").update({
        title: form.title, department: form.department, location: form.location,
        employment_type: form.employment_type, salary_min: form.salary_min, salary_max: form.salary_max,
        salary_currency: "INR",
        description: form.description, requirements: form.requirements, status: form.status,
        published_at: form.status === "published" && !job?.published_at ? new Date().toISOString() : job?.published_at,
      }).eq("id", id).eq("organization_id", org!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Saved");
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (isLoading || !form) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  const publicUrl = org
    ? `https://${org.slug}.${import.meta.env.VITE_APP_DOMAIN ?? "hireflow.yesp.space"}/careers/jobs/${id}`
    : null;

  return (
    <div className="max-w-5xl space-y-5">

      {/* Breadcrumb + heading */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <span>Workspace</span>
          <ChevronRight className="h-3 w-3" />
          <Link to="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate max-w-[18rem]">{form.title}</span>
        </div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight">{form.title}</h1>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[form.status] ?? "bg-muted text-muted-foreground border-transparent"}`}>
              {form.status}
            </span>
          </div>
          {publicUrl && form.status === "published" && (
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <ExternalLink className="h-3.5 w-3.5" /> View live
              </Button>
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {(apps ?? []).length} application{(apps ?? []).length !== 1 ? "s" : ""}
        </p>
        <div className="mt-4 border-b" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">

        {/* ── Left: form sections ── */}
        <div className="space-y-4">

          {/* Role details */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Role details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label>Job title</Label>
                <Input className="mt-1.5" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Department</Label>
                  <Input className="mt-1.5" value={form.department ?? ""}
                    onChange={e => setForm({ ...form, department: e.target.value })} />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input className="mt-1.5" value={form.location ?? ""}
                    onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Employment type</Label>
                <Select
                  value={form.employment_type}
                  onValueChange={v => setForm({ ...form, employment_type: v as typeof form.employment_type })}
                >
                  <SelectTrigger className="mt-1.5 w-full sm:w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Compensation */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Compensation</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Annual salary range in Indian Rupees</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Minimum (₹)</Label>
                  <Input type="number" className="mt-1.5" value={form.salary_min ?? ""}
                    onChange={e => setForm({ ...form, salary_min: e.target.value ? parseInt(e.target.value, 10) : null, salary_currency: "INR" })} />
                </div>
                <div>
                  <Label>Maximum (₹)</Label>
                  <Input type="number" className="mt-1.5" value={form.salary_max ?? ""}
                    onChange={e => setForm({ ...form, salary_max: e.target.value ? parseInt(e.target.value, 10) : null, salary_currency: "INR" })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job description */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Job description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label>Description</Label>
                <Textarea rows={7} className="mt-1.5 resize-none" value={form.description ?? ""}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Requirements</Label>
                <Textarea rows={5} className="mt-1.5 resize-none" value={form.requirements ?? ""}
                  onChange={e => setForm({ ...form, requirements: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: publishing panel + applications ── */}
        <div className="space-y-4">

          {/* Publishing panel */}
          <Card className="shadow-sm sticky top-4">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={v => setForm({ ...form, status: v as typeof form.status })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {org && (
                <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    Careers page
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 break-all leading-relaxed">
                    {org.slug}.{import.meta.env.VITE_APP_DOMAIN ?? "hireflow.yesp.space"}/careers
                  </p>
                </div>
              )}

              <Button
                className="w-full gap-1.5"
                onClick={() => save.mutate()}
                disabled={save.isPending}
              >
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </CardContent>
          </Card>

          {/* Applications list */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Applications</CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {(apps ?? []).length}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {(apps ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No applications yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {apps?.map(a => {
                    const c = (a as unknown as { candidates: { full_name: string; email: string } | null }).candidates;
                    return (
                      <Link key={a.id} to="/applications/$id" params={{ id: a.id }}
                        className="flex items-start gap-2.5 rounded-lg border p-2.5 hover:bg-muted/40 transition-colors">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STAGE_DOT[a.stage] ?? "bg-muted-foreground"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{c?.full_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${STAGE_BADGE[a.stage] ?? "bg-muted text-muted-foreground"}`}>
                              {a.stage.replaceAll("_", " ")}
                            </span>
                          </div>
                          {c?.email && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.email}</div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
