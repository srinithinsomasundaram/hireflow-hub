import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronRight, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/jobs/new")({
  head: () => ({ meta: [{ title: "New job · HireFlow" }] }),
  component: NewJob,
});

function NewJob() {
  const navigate = useNavigate();
  const { data: org } = useCurrentOrg();
  const [form, setForm] = useState({
    title: "", department: "", location: "",
    employment_type: "full_time" as const,
    salary_min: "", salary_max: "",
    description: "", requirements: "",
  });

  const create = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!org) throw new Error("No workspace");
      const { data, error } = await supabase.from("jobs").insert({
        organization_id: org.id,
        title: form.title,
        department: form.department || null,
        location: form.location || null,
        employment_type: form.employment_type,
        salary_min: form.salary_min ? parseInt(form.salary_min, 10) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
        salary_currency: "INR",
        description: form.description || null,
        requirements: form.requirements || null,
        status: publish ? "published" : "draft",
        published_at: publish ? new Date().toISOString() : null,
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
      toast.success("Job created");
      navigate({ to: "/jobs/$id", params: { id: data.id } });
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  return (
    <div className="max-w-5xl space-y-5">

      {/* Breadcrumb + heading */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <span>Workspace</span>
          <ChevronRight className="h-3 w-3" />
          <Link to="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
          <ChevronRight className="h-3 w-3" />
          <span>New job</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Create job posting</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Draft a position. Publish when you're ready to receive applications.
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
              <p className="text-xs text-muted-foreground mt-0.5">Basic information about the position</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label htmlFor="t">
                  Job title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="t" className="mt-1.5" required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Senior Frontend Engineer"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="dept">Department</Label>
                  <Input
                    id="dept" className="mt-1.5"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    placeholder="e.g. Engineering"
                  />
                </div>
                <div>
                  <Label htmlFor="loc">Location</Label>
                  <Input
                    id="loc" className="mt-1.5"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Remote / Bangalore"
                  />
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
              <p className="text-xs text-muted-foreground mt-0.5">Annual salary range in Indian Rupees (optional)</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="smin">Minimum (₹)</Label>
                  <Input
                    id="smin" type="number" className="mt-1.5"
                    value={form.salary_min}
                    onChange={e => setForm({ ...form, salary_min: e.target.value })}
                    placeholder="800,000"
                  />
                </div>
                <div>
                  <Label htmlFor="smax">Maximum (₹)</Label>
                  <Input
                    id="smax" type="number" className="mt-1.5"
                    value={form.salary_max}
                    onChange={e => setForm({ ...form, salary_max: e.target.value })}
                    placeholder="1,800,000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job description */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Job description</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Visible to candidates on your public careers page</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc" rows={7} className="mt-1.5 resize-none"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What this role is about, what success looks like, team context…"
                />
              </div>
              <div>
                <Label htmlFor="req">Requirements</Label>
                <Textarea
                  id="req" rows={5} className="mt-1.5 resize-none"
                  value={form.requirements}
                  onChange={e => setForm({ ...form, requirements: e.target.value })}
                  placeholder="Must-haves, nice-to-haves, qualifications, years of experience…"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: publishing panel ── */}
        <div>
          <Card className="shadow-sm sticky top-4">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 border-slate-200">
                  Draft
                </span>
              </div>

              {org && (
                <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    Public careers page
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 break-all leading-relaxed">
                    {org.slug}.{import.meta.env.VITE_APP_DOMAIN ?? "hireflow.yesp.space"}/careers
                  </p>
                </div>
              )}

              {!form.title && (
                <p className="text-xs text-muted-foreground text-center pb-1">Add a job title to continue</p>
              )}
              <div className="space-y-2 pt-1">
                <Button
                  className="w-full gap-1.5"
                  disabled={!form.title || create.isPending}
                  onClick={() => create.mutate(true)}
                >
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Publish now
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-1.5"
                  disabled={!form.title || create.isPending}
                  onClick={() => create.mutate(false)}
                >
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save as draft
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
                Publishing makes this role live and visible to candidates on your careers page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
