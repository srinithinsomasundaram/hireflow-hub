import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
    onSuccess: data => { toast.success("Job created"); navigate({ to: "/jobs/$id", params: { id: data.id } }); },
    onError: e => toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All jobs
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New job</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Draft a job posting. Publish when you're ready to receive applications.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Job details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="t">Title <span className="text-destructive">*</span></Label>
            <Input id="t" className="mt-1.5" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Senior Frontend Engineer" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="d">Department</Label>
              <Input id="d" className="mt-1.5" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Engineering" />
            </div>
            <div>
              <Label htmlFor="l">Location</Label>
              <Input id="l" className="mt-1.5" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Remote / Bangalore" />
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
              <Label htmlFor="smin">Min salary (₹)</Label>
              <Input id="smin" type="number" className="mt-1.5" value={form.salary_min} onChange={e => setForm({ ...form, salary_min: e.target.value })} placeholder="800000" />
            </div>
            <div>
              <Label htmlFor="smax">Max salary (₹)</Label>
              <Input id="smax" type="number" className="mt-1.5" value={form.salary_max} onChange={e => setForm({ ...form, salary_max: e.target.value })} placeholder="1800000" />
            </div>
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={6} className="mt-1.5 resize-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What this role is about, what success looks like…" />
          </div>
          <div>
            <Label htmlFor="req">Requirements</Label>
            <Textarea id="req" rows={5} className="mt-1.5 resize-none" value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} placeholder="Must-haves, nice-to-haves, qualifications…" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => create.mutate(false)} disabled={!form.title || create.isPending} className="gap-1.5">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save draft
            </Button>
            <Button onClick={() => create.mutate(true)} disabled={!form.title || create.isPending} className="gap-1.5">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Publish now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
