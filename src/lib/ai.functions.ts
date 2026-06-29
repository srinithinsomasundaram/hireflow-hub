import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.0-flash-lite";

function geminiHeaders(key: string) {
  return { "Content-Type": "application/json", "Authorization": `Bearer ${key}` };
}

function getKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

async function geminiRequest(key: string, body: object, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: geminiHeaders(key),
      body: JSON.stringify(body),
    });
    if (res.status !== 429 || attempt === retries) return res;
    // Exponential backoff: 2s, 4s, 8s
    await new Promise(r => setTimeout(r, 2000 * 2 ** attempt));
  }
  throw new Error("AI service rate limit reached — please try again in a minute.");
}

// ─── Offer Letter ─────────────────────────────────────────────────────────────

const OfferInput = z.object({
  applicationId: z.string().uuid(),
  salary: z.string().optional(),
  startDate: z.string().optional(),
  tone: z.enum(["formal", "warm", "friendly"]).optional(),
});

export const generateOfferLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => OfferInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

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
    const startLine = data.startDate ? new Date(data.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "a mutually agreed date";
    const tone = data.tone ?? "warm";

    const prompt = `Write a complete, professional offer letter with a ${tone} tone. Do not use any placeholders — write the full letter as it would be sent.

Company: ${companyName}
Candidate name: ${candidate.full_name}
Role: ${job.title}
${job.location ? `Location: ${job.location}` : ""}
${job.employment_type ? `Employment type: ${job.employment_type.replace(/_/g, " ")}` : ""}
Annual compensation: ${salaryLine}
Start date: ${startLine}
${job.description ? `Role overview: ${job.description.slice(0, 400)}` : ""}
${job.requirements ? `Requirements: ${job.requirements.slice(0, 300)}` : ""}

Include: greeting, formal offer statement, role & responsibilities summary, compensation details, start date, instructions for accepting (reply to this email within 5 days), and a warm closing signed by "${companyName} Talent Team".`;

    const res = await geminiRequest(key, {
      model: GEMINI_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = (json.choices?.[0]?.message?.content ?? "").trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
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
    };
  });

// ─── AI Scoring ───────────────────────────────────────────────────────────────

const ScoreInput = z.object({ applicationId: z.string().uuid() });

export const scoreApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ScoreInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: app, error } = await supabase
      .from("applications")
      .select("id, cover_letter, candidates(full_name, current_company, experience_years, resume_url), jobs(title, description, requirements)")
      .eq("id", data.applicationId).single();
    if (error || !app) throw new Error("Application not found");

    const key = getKey();

    const candidate = (app as unknown as { candidates: { full_name: string; current_company: string | null; experience_years: number | null } }).candidates;
    const job = (app as unknown as { jobs: { title: string; description: string | null; requirements: string | null } }).jobs;

    const prompt = `You are an expert technical recruiter. Score the candidate's fit for this job from 0-100 and write a 2-sentence summary.
Return strict JSON: { "score": number, "summary": string }.

JOB
Title: ${job.title}
Description: ${job.description ?? ""}
Requirements: ${job.requirements ?? ""}

CANDIDATE
Name: ${candidate.full_name}
Current company: ${candidate.current_company ?? "n/a"}
Years of experience: ${candidate.experience_years ?? "n/a"}
Cover letter: ${app.cover_letter ?? "(none)"}`;

    const res = await geminiRequest(key, {
      model: GEMINI_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { score?: number; summary?: string } = {};
    try { parsed = JSON.parse(content); } catch { /* ignore */ }
    const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 0)));
    const summary = parsed.summary ?? "";

    await supabase.from("applications").update({ ai_score: score, ai_summary: summary }).eq("id", data.applicationId);
    return { score, summary };
  });

// ─── Resume Parser ────────────────────────────────────────────────────────────

const ParseInput = z.object({ resumeText: z.string().min(20).max(50000) });

export const parseResumeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ParseInput.parse(d))
  .handler(async ({ data }) => {
    const key = getKey();
    const prompt = `Parse this resume into strict JSON with this shape:
{ "full_name": string, "email": string|null, "phone": string|null, "linkedin": string|null,
  "current_company": string|null, "experience_years": number|null,
  "skills": string[], "summary": string }

RESUME:
${data.resumeText}`;

    const res = await geminiRequest(key, {
      model: GEMINI_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    try { return JSON.parse(content); } catch { return { error: "Could not parse" }; }
  });
