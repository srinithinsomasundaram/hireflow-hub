import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

function getKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return key;
}

async function openaiRequest(key: string, body: object, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model: OPENAI_MODEL, ...body }),
    });
    if (res.status !== 429 || attempt === retries) return res;
    await new Promise(r => setTimeout(r, 2000 * 2 ** attempt));
  }
  throw new Error("AI service rate limit reached — please try again in a minute.");
}

// Truncate to n chars to keep token costs predictable
function cap(s: string | null | undefined, n: number): string {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n) + "…";
}

// ─── Offer Letter ─────────────────────────────────────────────────────────────

const OfferInput = z.object({
  applicationId: z.string().uuid(),
  salary: z.string().optional(),
  startDate: z.string().optional(),
  tone: z.enum(["formal", "warm", "friendly"]).optional(),
  force: z.boolean().optional(), // skip cache and regenerate
});

export const generateOfferLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => OfferInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // Return cached letter unless force-regeneration is requested
    if (!data.force) {
      const { data: cached } = await sb
        .from("offer_letters")
        .select("id, content, candidates(full_name, email), applications(jobs(title))")
        .eq("application_id", data.applicationId)
        .maybeSingle();
      if (cached?.content) {
        const cand = cached.candidates as { full_name: string; email: string } | null;
        const jobTitle = (cached.applications as { jobs: { title: string } | null } | null)?.jobs?.title ?? "";
        return {
          id: cached.id as string,
          content: cached.content as string,
          candidateName: cand?.full_name ?? "",
          candidateEmail: cand?.email ?? "",
          jobTitle,
          fromCache: true,
        };
      }
    }

    const { data: app, error } = await supabase
      .from("applications")
      .select("id, candidate_id, organization_id, candidates(full_name, email, experience_years, current_company), jobs(title, description, requirements, location, employment_type, salary_min, salary_max, salary_currency)")
      .eq("id", data.applicationId)
      .single();
    if (error || !app) throw new Error("Application not found");

    const { data: org } = await supabase
      .from("organizations")
      .select("company_name")
      .eq("id", app.organization_id)
      .single();

    const key = getKey();

    const candidate = (app as unknown as { candidates: { full_name: string; email: string; experience_years: number | null; current_company: string | null } }).candidates;
    const job = (app as unknown as { jobs: { title: string; description: string | null; requirements: string | null; location: string | null; employment_type: string; salary_min: number | null; salary_max: number | null; salary_currency: string | null } }).jobs;
    const companyName = org?.company_name ?? "Our Company";
    const currency = job.salary_currency ?? "USD";
    const salaryLine = data.salary ||
      (job.salary_min && job.salary_max ? `${currency} ${job.salary_min.toLocaleString()}–${job.salary_max.toLocaleString()}` :
       job.salary_min ? `${currency} ${job.salary_min.toLocaleString()}` : "Competitive");
    const startLine = data.startDate
      ? new Date(data.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "a mutually agreed date";
    const tone = data.tone ?? "warm";

    const res = await openaiRequest(key, {
      temperature: 0.3,
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are an expert HR writer who drafts complete, professional offer letters. Write in a ${tone} tone. Never use placeholders — write the full letter as it would be sent. Sign off as "${companyName} Talent Acquisition".`,
        },
        {
          role: "user",
          content: `Write a complete offer letter using these details:

Company: ${companyName}
Candidate: ${candidate.full_name}
Role: ${job.title}${job.location ? `\nLocation: ${job.location}` : ""}${job.employment_type ? `\nEmployment type: ${job.employment_type.replace(/_/g, " ")}` : ""}
Compensation: ${salaryLine}
Start date: ${startLine}${cap(job.description, 500) ? `\nRole overview: ${cap(job.description, 500)}` : ""}${cap(job.requirements, 400) ? `\nKey requirements: ${cap(job.requirements, 400)}` : ""}

Include: greeting, formal offer statement, role summary, compensation, start date, acceptance instructions (reply within 5 business days), and a professional closing.`,
        },
      ],
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = (json.choices?.[0]?.message?.content ?? "").trim();

    const { data: saved, error: saveErr } = await sb
      .from("offer_letters")
      .upsert({
        organization_id: app.organization_id,
        application_id: data.applicationId,
        candidate_id: app.candidate_id,
        content,
        salary: data.salary ?? null,
        start_date: data.startDate ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "application_id" })
      .select("id")
      .single();
    if (saveErr) throw new Error("Failed to save offer letter");

    return {
      id: (saved as { id: string }).id,
      content,
      candidateName: candidate.full_name,
      candidateEmail: candidate.email,
      jobTitle: job.title,
      fromCache: false,
    };
  });

// ─── AI Scoring ───────────────────────────────────────────────────────────────

// Shared scoring core — callable without auth middleware (e.g. on application submit)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function scoreApplicationCore(sb: any, applicationId: string, force = false): Promise<{ score: number; summary: string }> {
  const { data: app, error } = await sb
    .from("applications")
    .select("id, cover_letter, ai_score, ai_summary, candidates(full_name, current_company, experience_years), jobs(title, description, requirements)")
    .eq("id", applicationId)
    .single();
  if (error || !app) return { score: 0, summary: "" };

  if (!force && app.ai_score != null) {
    return { score: app.ai_score as number, summary: (app.ai_summary as string) ?? "" };
  }

  let key: string;
  try { key = getKey(); } catch { return { score: 0, summary: "" }; }

  const candidate = (app as unknown as { candidates: { full_name: string; current_company: string | null; experience_years: number | null } }).candidates;
  const job = (app as unknown as { jobs: { title: string; description: string | null; requirements: string | null } }).jobs;

  const res = await openaiRequest(key, {
    temperature: 0,
    max_tokens: 150,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are an expert technical recruiter. Score candidate fit 0–100 and write a concise 2-sentence summary. Return strict JSON only: { \"score\": number, \"summary\": string }.",
      },
      {
        role: "user",
        content: `JOB\nTitle: ${job.title}\nDescription: ${cap(job.description, 600)}\nRequirements: ${cap(job.requirements, 500)}\n\nCANDIDATE\nName: ${candidate.full_name}\nCompany: ${candidate.current_company ?? "n/a"}\nExperience: ${candidate.experience_years ?? "n/a"} yrs\nCover letter: ${cap(app.cover_letter, 500) || "(none)"}`,
      },
    ],
  });

  if (!res.ok) return { score: 0, summary: "" };

  const json = await res.json();
  let parsed: { score?: number; summary?: string } = {};
  try { parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}"); } catch { /* ignore */ }
  const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 0)));
  const summary = parsed.summary ?? "";

  await sb.from("applications").update({ ai_score: score, ai_summary: summary }).eq("id", applicationId);
  return { score, summary };
}

const ScoreInput = z.object({
  applicationId: z.string().uuid(),
  force: z.boolean().optional(),
});

export const scoreApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ScoreInput.parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return scoreApplicationCore(context.supabase as any, data.applicationId, data.force ?? false);
  });

// ─── Resume Parser ────────────────────────────────────────────────────────────

const ParseInput = z.object({ resumeText: z.string().min(20).max(6000) });

export const parseResumeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ParseInput.parse(d))
  .handler(async ({ data }) => {
    const key = getKey();

    const res = await openaiRequest(key, {
      temperature: 0,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Parse the resume into strict JSON with exactly this shape:
{ "full_name": string, "email": string|null, "phone": string|null, "linkedin": string|null, "current_company": string|null, "experience_years": number|null, "skills": string[], "summary": string }
Return only valid JSON — no markdown, no extra text.`,
        },
        {
          role: "user",
          content: data.resumeText,
        },
      ],
    });

    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const json = await res.json();
    try { return JSON.parse(json.choices?.[0]?.message?.content ?? "{}"); }
    catch { return { error: "Could not parse resume" }; }
  });
