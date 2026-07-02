import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { scoreApplicationCore } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { sendSystemEmail } from "@/lib/system-email";
import { runAutomations } from "@/lib/automations";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { mergeFormConfig } from "@/lib/form-config";
import type { ApplicationFormFieldConfig } from "@/lib/form-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, MapPin, ArrowLeft, Upload } from "lucide-react";

const Input1 = z.object({ jobId: z.string().uuid() });

export const getPublicJob = createServerFn({ method: "GET" })
  .validator((d: unknown) => Input1.parse(d))
  .handler(async ({ data }) => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { realtime: { transport: ws }, auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: job } = await sb
      .from("jobs")
      .select("id, title, department, location, employment_type, salary_min, salary_max, salary_currency, description, requirements, organization_id, organizations(company_name, slug, logo_url)")
      .eq("id", data.jobId).eq("status", "published").maybeSingle();
    if (!job) return null;
    // Use service role key to bypass RLS — organization_settings is not readable by anon
    const sbAdmin = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: ws }, auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: settings } = await sbAdmin
      .from("organization_settings")
      .select("form_config")
      .eq("organization_id", job.organization_id)
      .maybeSingle();
    return { ...job, form_config: settings?.form_config ?? null };
  });

// ─── Application submit server function ──────────────────────────────────────

type IntegrationConfig = {
  webhook?: { url: string; secret?: string; enabled: boolean };
  sheets?: { script_url: string; enabled: boolean };
};

const AppInput = z.object({
  organizationId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string(),
  jobDepartment: z.string().nullable().optional(),
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  linkedin_url: z.string().optional(),
  current_company: z.string().optional(),
  experience_years: z.number().nullable().optional(),
  expected_salary: z.number().nullable().optional(),
  notice_period: z.string().optional(),
  cover_letter: z.string().optional(),
  resume_url: z.string().nullable().optional(),
});

// Block outbound server-side fetches to private/link-local ranges (SSRF protection).
// Only HTTPS URLs pointing to public internet addresses are allowed.
function isSafeOutboundUrl(raw: string): boolean {
  let url: URL;
  try { url = new URL(raw); } catch { return false; }
  if (url.protocol !== "https:") return false;
  const host = url.hostname;
  // Block RFC1918, loopback, and link-local ranges
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  return true;
}

export const submitApplicationFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => AppInput.parse(d))
  .handler(async ({ data }) => {
    // Rate limit: 5 submissions per IP per job per 10 minutes
    const req = getRequest();
    const ip = req ? getClientIp(req.headers) : "unknown";
    if (!checkRateLimit(ip, data.jobId)) {
      return { error: "Too many submissions from this address. Please try again in 10 minutes." };
    }

    // Validate resume URL is a legitimate Supabase Storage path (no external URLs)
    if (data.resume_url) {
      const supabaseUrl = process.env.SUPABASE_URL ?? "";
      const isValidPath = !data.resume_url.startsWith("http") || data.resume_url.startsWith(supabaseUrl);
      if (!isValidPath) return { error: "Invalid resume URL." };
    }

    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: ws }, auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    // Upsert candidate — if same email already applied to this org, reuse the record.
    const { data: existing } = await sb
      .from("candidates")
      .select("id")
      .eq("organization_id", data.organizationId)
      .eq("email", data.email)
      .maybeSingle();

    let candidateId: string;
    if (existing) {
      candidateId = existing.id;
    } else {
      const { data: cand, error: candErr } = await sb.from("candidates").insert({
        organization_id: data.organizationId,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        linkedin_url: data.linkedin_url || null,
        current_company: data.current_company || null,
        experience_years: data.experience_years ?? null,
        expected_salary: data.expected_salary ?? null,
        notice_period: data.notice_period || null,
        resume_url: data.resume_url ?? null,
        source: "careers_site",
      }).select("id").single();
      if (candErr) return { error: "Failed to save your details. Please try again." };
      candidateId = cand.id;
    }

    // Prevent duplicate applications to the same job.
    const { data: dupApp } = await sb
      .from("applications")
      .select("id")
      .eq("job_id", data.jobId)
      .eq("candidate_id", candidateId)
      .maybeSingle();
    if (dupApp) return { error: "You have already applied for this position." };

    const { data: app, error: appErr } = await sb.from("applications").insert({
      organization_id: data.organizationId,
      job_id: data.jobId,
      candidate_id: candidateId,
      cover_letter: data.cover_letter || null,
      source: "careers_site",
    }).select("id").single();

    if (appErr) return { error: "Failed to submit application. Please try again." };

    // Auto-score in the background — fire and forget, never blocks the response
    scoreApplicationCore(sb, app.id).catch(() => {});

    // Fire application_received automations (thank-you emails etc.)
    await runAutomations("application_received", {
      applicationId: app.id,
      candidateId,
      jobId: data.jobId,
      organizationId: data.organizationId,
    }).catch(e => console.error("[submitApplication] automations error:", e));

    // Fetch org integration settings (webhook + sheets)
    const { data: settings } = await sb
      .from("organization_settings")
      .select("crm_config")
      .eq("organization_id", data.organizationId)
      .maybeSingle();

    const integrations = (settings?.crm_config as IntegrationConfig | null) ?? {};

    const payload = JSON.stringify({
      event: "application.submitted",
      timestamp: new Date().toISOString(),
      data: {
        application_id: app.id,
        candidate_id: candidateId,
        job_id: data.jobId,
        organization_id: data.organizationId,
        candidate: {
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
          linkedin_url: data.linkedin_url,
          current_company: data.current_company,
          experience_years: data.experience_years,
          expected_salary: data.expected_salary,
          notice_period: data.notice_period,
        },
        job: {
          title: data.jobTitle,
          department: data.jobDepartment,
        },
      },
    });

    // Fire custom webhook with HMAC-SHA256 signature
    if (integrations.webhook?.enabled && integrations.webhook.url) {
      try {
        if (isSafeOutboundUrl(integrations.webhook.url)) {
          const ts = Date.now().toString();
          const whHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            "X-HireFlow-Timestamp": ts,
          };
          if (integrations.webhook.secret) {
            const sig = createHmac("sha256", integrations.webhook.secret)
              .update(`${ts}.${payload}`)
              .digest("hex");
            whHeaders["X-HireFlow-Signature-256"] = `sha256=${sig}`;
          }
          await fetch(integrations.webhook.url, { method: "POST", headers: whHeaders, body: payload });
        }
      } catch {}
    }

    // Fire Google Sheets Apps Script
    if (integrations.sheets?.enabled && integrations.sheets.script_url) {
      try {
        if (isSafeOutboundUrl(integrations.sheets.script_url)) {
          await fetch(integrations.sheets.script_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });
        }
      } catch {}
    }

    // Notify all org admins & recruiters using their registered auth email
    try {
      const { data: orgData } = await sb
        .from("organizations")
        .select("company_name")
        .eq("id", data.organizationId)
        .maybeSingle();

      const { data: members } = await sb
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", data.organizationId)
        .in("role", ["owner", "admin", "recruiter"]);

      const uniqueUserIds = [...new Set((members ?? []).map(m => m.user_id))];

      // Use auth.admin to get the real registered email — profiles.email can be null
      const authEmails = (
        await Promise.all(
          uniqueUserIds.map(uid => sb.auth.admin.getUserById(uid))
        )
      )
        .map(r => r.data.user?.email)
        .filter(Boolean) as string[];

      if (authEmails.length > 0) {
        // Generate signed resume URL (valid 7 days) if resume exists
        let resumeLink = "Not provided";
        if (data.resume_url) {
          const { data: signed } = await sb.storage
            .from("resumes")
            .createSignedUrl(data.resume_url, 60 * 60 * 24 * 7);
          if (signed?.signedUrl) resumeLink = signed.signedUrl;
        }

        const appliedOn = new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true,
        });

        const dashboardUrl = process.env.APP_URL
          ? `${process.env.APP_URL}/pipeline`
          : "https://hireflow.yespstudio.com/pipeline";

        const html = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

            <!-- Header -->
            <div style="background:#0f172a;padding:24px 32px;display:flex;align-items:center;gap:10px;">
              <span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-.4px;">HireFlow</span>
              <span style="color:#64748b;font-size:13px;margin-left:4px;">by YESP</span>
            </div>

            <!-- Body -->
            <div style="padding:36px 32px;">
              <p style="margin:0 0 6px;font-size:14px;color:#64748b;">Hiring Team Notification</p>
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0f172a;">New Job Application Received</h1>

              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
                Hello,<br><br>
                A new application has been submitted through HireFlow.
              </p>

              <!-- Candidate Details -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:24px;margin-bottom:28px;">
                <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;">Candidate Details</p>

                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:14px;width:130px;vertical-align:top;font-weight:500;">Name</td>
                    <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${data.full_name}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;font-weight:500;">Email</td>
                    <td style="padding:8px 0;font-size:14px;"><a href="mailto:${data.email}" style="color:#2563eb;text-decoration:none;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;font-weight:500;">Phone</td>
                    <td style="padding:8px 0;color:#0f172a;font-size:14px;">${data.phone || "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;font-weight:500;">Position</td>
                    <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${data.jobTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;font-weight:500;">Experience</td>
                    <td style="padding:8px 0;color:#0f172a;font-size:14px;">${data.experience_years != null ? `${data.experience_years} year${data.experience_years !== 1 ? "s" : ""}` : "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;font-weight:500;">Resume</td>
                    <td style="padding:8px 0;font-size:14px;">${resumeLink !== "Not provided" ? `<a href="${resumeLink}" style="color:#2563eb;text-decoration:none;">View Resume →</a>` : "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;font-weight:500;">Applied On</td>
                    <td style="padding:8px 0;color:#0f172a;font-size:14px;">${appliedOn} IST</td>
                  </tr>
                </table>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${dashboardUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:8px;letter-spacing:-.1px;">View Application →</a>
              </div>

              <!-- Footer -->
              <div style="border-top:1px solid #f1f5f9;padding-top:20px;">
                <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                  Regards,<br>
                  <strong style="color:#64748b;">HireFlow by YESP</strong>
                </p>
              </div>
            </div>
          </div>
        `;

        await Promise.allSettled(
          authEmails.map(email =>
            sendSystemEmail(
              email,
              `New Job Application Received – ${data.full_name}`,
              html,
            )
          )
        );

        console.log(`[submitApplication] notified ${authEmails.length} member(s):`, authEmails);
      }
    } catch (e) {
      console.error("[submitApplication] team notification failed:", e);
    }

    return {};
  });

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/c/$slug/jobs/$jobId")({
  loader: ({ params }) => getPublicJob({ data: { jobId: params.jobId } }),
  head: ({ loaderData }) => {
    const org   = loaderData
      ? (loaderData as unknown as { organizations: { company_name: string; logo_url: string | null } }).organizations
      : null;
    const title = loaderData ? `${loaderData.title} · ${org?.company_name ?? "Careers"}` : "Job · Careers";
    const desc  = loaderData?.description?.slice(0, 160)
      ?? (loaderData ? `Apply for ${loaderData.title}${org?.company_name ? ` at ${org.company_name}` : ""}.` : "Apply now");
    const image = org?.logo_url ?? null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:type",        content: "website" },
        { property: "og:title",       content: title },
        { property: "og:description", content: desc },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card",        content: "summary" },
        { name: "twitter:title",       content: title },
        { name: "twitter:description", content: desc },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
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

function DynamicFormFields({
  fields,
  form,
  setForm,
  resume,
  setResume,
}: {
  fields: ApplicationFormFieldConfig[];
  form: Record<string, string>;
  setForm: (f: Record<string, string>) => void;
  resume: File | null;
  setResume: (f: File | null) => void;
}) {
  const gridFields = fields.filter(f => f.visible && f.key !== "resume" && f.key !== "cover_letter");
  const resumeField = fields.find(f => f.key === "resume" && f.visible);
  const coverField = fields.find(f => f.key === "cover_letter" && f.visible);

  const inputProps: Record<string, { type?: string; step?: string; placeholder?: string }> = {
    phone: { type: "tel", placeholder: "+91 98765 43210" },
    linkedin_url: { placeholder: "https://linkedin.com/in/…" },
    current_company: {},
    experience_years: { type: "number", step: "0.5" },
    expected_salary: { type: "number", placeholder: "e.g. 1200000" },
    notice_period: { placeholder: "e.g. 2 months" },
  };

  return (
    <>
      {gridFields.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {gridFields.map(f => (
            <div key={f.key}>
              <Label>{f.label}{f.required && <span className="ml-0.5 text-destructive">*</span>}</Label>
              <Input
                {...inputProps[f.key]}
                required={f.required}
                value={form[f.key] ?? ""}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}
      {resumeField && (
        <div>
          <Label>{resumeField.label}{resumeField.required && <span className="ml-0.5 text-destructive">*</span>}</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              required={resumeField.required && !resume}
              onChange={e => setResume(e.target.files?.[0] ?? null)}
            />
            {resume && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Upload className="h-3 w-3" />{resume.name}
              </span>
            )}
          </div>
        </div>
      )}
      {coverField && (
        <div>
          <Label>{coverField.label}{coverField.required && <span className="ml-0.5 text-destructive">*</span>}</Label>
          <Textarea
            rows={5}
            required={coverField.required}
            value={form.cover_letter ?? ""}
            onChange={e => setForm({ ...form, cover_letter: e.target.value })}
            placeholder="Tell us why you're interested…"
          />
        </div>
      )}
    </>
  );
}

function JobPublic() {
  const job = Route.useLoaderData();
  const { slug } = Route.useParams();
  useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    full_name: "", email: "", phone: "", linkedin_url: "", current_company: "",
    experience_years: "", expected_salary: "", notice_period: "", cover_letter: "",
  });
  const [resume, setResume] = useState<File | null>(null);

  if (!job) return <div className="grid min-h-screen place-items-center"><div className="text-center"><h1 className="text-2xl font-semibold">Job not found</h1><p className="mt-2 text-sm text-muted-foreground">This role may have closed.</p><Link to="/c/$slug" params={{ slug }} className="mt-4 inline-block underline">Back to careers</Link></div></div>;

  const org = (job as unknown as { organizations: { company_name: string; slug: string } }).organizations;
  const formFields = mergeFormConfig((job as unknown as { form_config: unknown }).form_config);

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
          <Link to="/c/$slug" params={{ slug }} className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
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
        <div className="mx-auto max-w-3xl px-6 py-5"><Link to="/c/$slug" params={{ slug }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> {org.company_name} careers</Link></div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {job.department && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.department}</span>}
            {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
            <span className="capitalize">{job.employment_type.replaceAll("_", " ")}</span>
            {job.salary_min && job.salary_max && <span>{formatSalary(job.salary_min, job.salary_max)}</span>}
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
                <div><Label>Full name <span className="text-destructive">*</span></Label><Input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Email <span className="text-destructive">*</span></Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <DynamicFormFields fields={formFields} form={form} setForm={setForm} resume={resume} setResume={setResume} />
              <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Submitting…" : "Submit application"}</Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="mt-10 border-t"><div className="mx-auto max-w-3xl px-6 py-6 text-xs text-muted-foreground">Powered by HireFlow</div></footer>
    </div>
  );
}
