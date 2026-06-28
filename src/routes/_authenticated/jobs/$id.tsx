import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
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

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft:     "bg-slate-100 text-slate-600 border-slate-200",
  closed:    "bg-orange-100 text-orange-600 border-orange-200",
  archived:  "bg-red-100 text-red-600 border-red-200",
};

const STAGE_STYLE: Record<string, string> = {
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
        .from("jobs")
        .select("*")
        .eq("id", id)
        .eq("organization_id", org!.id)
        .single();
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
        .eq("job_id", id)
        .eq("organization_id", org!.id)
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); qc.invalidateQueries({ queryKey: ["jobs"] }); toast.success("Saved"); },
    onError: e => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (isLoading || !form) return (
    <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All jobs
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{form.title}</h1>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[form.status] ?? "bg-muted text-muted-foreground"}`}>
              {form.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{apps?.length ?? 0} applications</p>
        </div>
        {form.status === "published" && org && (
          <a
            href={(() => {
              const { protocol, host } = window.location;
              const parts = host.split(".");
              const base = parts.length >= 3 ? parts.slice(1).join(".") : host;
              return `${protocol}//${org.slug}.${base}/careers/jobs/${id}`;
            })()}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> View public page
            </Button>
          </a>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Job details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input className="mt-1.5" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Department</Label>
                <Input className="mt-1.5" value={form.department ?? ""} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input className="mt-1.5" value={form.location ?? ""} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Employment type</Label>
                <Select value={form.employment_type} onValueChange={v => setForm({ ...form, employment_type: v as typeof form.employment_type })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full time</SelectItem>
                    <SelectItem value="part_time">Part time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Min salary (₹)</Label>
                <Input type="number" className="mt-1.5" value={form.salary_min ?? ""} onChange={e => setForm({ ...form, salary_min: e.target.value ? parseInt(e.target.value, 10) : null, salary_currency: "INR" })} />
              </div>
              <div>
                <Label>Max salary (₹)</Label>
                <Input type="number" className="mt-1.5" value={form.salary_max ?? ""} onChange={e => setForm({ ...form, salary_max: e.target.value ? parseInt(e.target.value, 10) : null, salary_currency: "INR" })} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={6} className="mt-1.5 resize-none" value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Requirements</Label>
              <Textarea rows={5} className="mt-1.5 resize-none" value={form.requirements ?? ""} onChange={e => setForm({ ...form, requirements: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as typeof form.status })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5">
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Applications <span className="ml-1 text-sm font-normal text-muted-foreground">({(apps ?? []).length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(apps ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications yet.</p>
            ) : apps?.map(a => {
              const c = (a as unknown as { candidates: { full_name: string; email: string } | null }).candidates;
              return (
                <Link key={a.id} to="/applications/$id" params={{ id: a.id }}
                  className="block rounded-lg border p-3 text-sm hover:bg-muted/40 transition-colors">
                  <div className="font-medium">{c?.full_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${STAGE_STYLE[a.stage] ?? "bg-muted text-muted-foreground"}`}>
                      {a.stage.replaceAll("_", " ")}
                    </span>
                  </div>
                  {c?.email && <div className="text-xs text-muted-foreground mt-1 truncate">{c.email}</div>}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
