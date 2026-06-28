import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicJob, submitApplicationFn } from "../../jobs/$jobId";
import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";

function OrgLogo({ url, name }: { url: string | null | undefined; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <Building2 className="h-5 w-5 text-muted-foreground" />;
  return (
    <img
      src={url}
      alt={`${name} logo`}
      className="h-7 w-7 rounded-md object-contain bg-gray-50 border border-gray-100"
      onError={() => setFailed(true)}
    />
  );
}

function useFavicon(url: string | null | undefined) {
  useEffect(() => {
    if (!url) return;
    document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']").forEach(l => l.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.sizes = "any";
    link.href = url;
    document.head.appendChild(link);
  }, [url]);
}
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, MapPin, ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/c/$slug/careers/jobs/$jobId")({
  loader: ({ params }) => getPublicJob({ data: { jobId: params.jobId } }),
  head: ({ loaderData }) => {
    const org = loaderData
      ? (loaderData as unknown as { organizations: { company_name: string; logo_url: string | null } }).organizations
      : null;
    return {
      meta: [
        { title: loaderData ? `${loaderData.title} · ${org?.company_name ?? "Careers"}` : "Job · Careers" },
        { name: "description", content: loaderData?.description?.slice(0, 160) ?? "Apply now" },
      ],
      links: org?.logo_url ? [{ rel: "icon", href: org.logo_url }] : [],
    };
  },
  component: JobPublic,
});

function formatSalary(min: number, max: number) {
  const fmt = (n: number) =>
    n >= 10_00_000
      ? `${(n / 10_00_000).toFixed(n % 10_00_000 === 0 ? 0 : 1)}Cr`
      : `${(n / 1_00_000).toFixed(n % 1_00_000 === 0 ? 0 : 1)}L`;
  return `₹${fmt(min)} – ₹${fmt(max)}`;
}

function JobPublic() {
  const job = Route.useLoaderData();
  const { slug } = Route.useParams();
  const orgData = job ? (job as unknown as { organizations: { company_name: string; slug: string; logo_url: string | null } }).organizations : null;
  useFavicon(orgData?.logo_url);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", linkedin_url: "", current_company: "",
    experience_years: "", expected_salary: "", notice_period: "", cover_letter: "",
  });
  const [resume, setResume] = useState<File | null>(null);

  if (!job) return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Job not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This role may have closed.</p>
        <Link to="/c/$slug/careers" params={{ slug }} className="mt-4 inline-block underline">Back to careers</Link>
      </div>
    </div>
  );

  const org = (job as unknown as { organizations: { company_name: string; slug: string } }).organizations;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Application submitted!</h2>
          <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
            Thank you for applying to <span className="font-medium text-foreground">{job.title}</span> at{" "}
            <span className="font-medium text-foreground">{org.company_name}</span>.
            We'll review your application and reach out if there's a match.
          </p>
          <Link to="/c/$slug/careers" params={{ slug }} className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            ← View all open positions
          </Link>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!job) return;
    setSubmitting(true);
    try {
      let resumePath: string | null = null;
      if (resume) {
        const ext = resume.name.split(".").pop() ?? "pdf";
        const path = `${job.organization_id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("resumes")
          .upload(path, resume, { upsert: false });
        if (!upErr) resumePath = path;
        else console.warn("Resume upload skipped:", upErr.message);
      }

      const result = await submitApplicationFn({
        data: {
          organizationId: job.organization_id,
          jobId: job.id,
          jobTitle: job.title,
          jobDepartment: job.department ?? null,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          linkedin_url: form.linkedin_url || undefined,
          current_company: form.current_company || undefined,
          experience_years: form.experience_years ? Number(form.experience_years) : null,
          expected_salary: form.expected_salary ? Number(form.expected_salary) : null,
          notice_period: form.notice_period || undefined,
          cover_letter: form.cover_letter || undefined,
          resume_url: resumePath,
        },
      });

      if (result?.error) throw new Error(result.error);
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/c/$slug/careers" params={{ slug }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {org.company_name} careers
          </Link>
          <div className="flex items-center gap-2 font-semibold text-sm">
            <OrgLogo url={orgData?.logo_url} name={org.company_name} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {job.department && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.department}</span>}
            {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
            <span className="capitalize">{job.employment_type.replaceAll("_", " ")}</span>
            {job.salary_min && job.salary_max && (
              <span>{formatSalary(job.salary_min, job.salary_max)}</span>
            )}
          </div>
        </div>

        {job.description && <section className="prose prose-sm max-w-none whitespace-pre-wrap">{job.description}</section>}
        {job.requirements && (
          <section>
            <h2 className="text-lg font-semibold">Requirements</h2>
            <div className="mt-2 whitespace-pre-wrap text-sm">{job.requirements}</div>
          </section>
        )}

        <Card>
          <CardHeader><CardTitle>Apply for this role</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label>Full name</Label><Input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>LinkedIn</Label><Input value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/…" /></div>
                <div><Label>Current company</Label><Input value={form.current_company} onChange={e => setForm({ ...form, current_company: e.target.value })} /></div>
                <div><Label>Years of experience</Label><Input type="number" step="0.5" value={form.experience_years} onChange={e => setForm({ ...form, experience_years: e.target.value })} /></div>
                <div><Label>Expected salary</Label><Input type="number" value={form.expected_salary} onChange={e => setForm({ ...form, expected_salary: e.target.value })} /></div>
                <div><Label>Notice period</Label><Input value={form.notice_period} onChange={e => setForm({ ...form, notice_period: e.target.value })} placeholder="e.g. 2 months" /></div>
              </div>
              <div>
                <Label>Resume (PDF, DOC, DOCX)</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setResume(e.target.files?.[0] ?? null)} />
                  {resume && <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Upload className="h-3 w-3" />{resume.name}</span>}
                </div>
              </div>
              <div>
                <Label>Cover letter (optional)</Label>
                <Textarea rows={5} value={form.cover_letter} onChange={e => setForm({ ...form, cover_letter: e.target.value })} placeholder="Tell us why you're interested…" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting…" : "Submit application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="mt-10 border-t">
        <div className="mx-auto max-w-3xl px-6 py-6 text-xs text-muted-foreground">Powered by HireFlow</div>
      </footer>
    </div>
  );
}
