"use server";

import { z } from "zod";
import { getAuthenticatedUser, adminClient } from "@/lib/auth-token.server";

const FREE_LIMIT = 2;

const GenerateInput = z.object({
  businessName: z.string().trim().min(1).max(120),
  niche: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  observedGaps: z.string().trim().min(1).max(800),
});

const PitchSchema = z.object({
  subjectLine: z.string().min(1).max(140),
  emailFormat: z.string().min(1),
  whatsAppFormat: z.string().min(1),
  linkedInFormat: z.string().min(1).max(320),
});

export type Pitch = z.infer<typeof PitchSchema>;

async function getAuthenticatedClient() {
  const { userId, email } = await getAuthenticatedUser();
  return { supabase: adminClient(), userId, email };
}

export async function getMyStatus() {
  const { supabase, userId, email } = await getAuthenticatedClient();

  const [{ count }, { data: profile }] = await Promise.all([
    supabase
      .from("user_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("profiles").select("is_premium, full_name, agency_name").eq("id", userId).maybeSingle(),
  ]);

  return {
    count: count ?? 0,
    limit: FREE_LIMIT,
    isPremium: profile?.is_premium ?? false,
    email: email ?? null,
    fullName: profile?.full_name ?? null,
    agencyName: profile?.agency_name ?? null,
  };
}

export async function getMyGenerations() {
  const { supabase, userId } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("user_generations")
    .select("id, business_name, niche, location, observed_gaps, generated_pitch, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteGeneration(input: { id: string }) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input);
  const { supabase, userId } = await getAuthenticatedClient();

  const { error } = await supabase
    .from("user_generations")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return { ok: true };
}

function stripMarkdown(s: string): string {
  return s.replace(/[*_`]+/g, "").trim();
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("AI_FAILED");
  }
}

export async function generatePitch(input: {
  businessName: string;
  niche: string;
  location: string;
  observedGaps: string;
}) {
  const data = GenerateInput.parse(input);
  const { supabase, userId } = await getAuthenticatedClient();

  const { count } = await supabase
    .from("user_generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium, full_name, agency_name, service_niche, target_market, social_proof")
    .eq("id", userId)
    .maybeSingle();

  const isPremium = profile?.is_premium ?? false;
  if (!isPremium && (count ?? 0) >= FREE_LIMIT) {
    throw new Error("LIMIT_EXCEEDED");
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");

  const { createAiProvider } = await import("@/lib/ai-gateway.server");
  const { generateText } = await import("ai");
  const gateway = createAiProvider(key);

  const senderName = profile?.full_name || null;
  const senderAgency = profile?.agency_name || null;
  const senderNiche = profile?.service_niche || null;
  const targetMarket = profile?.target_market || null;
  const socialProof = profile?.social_proof || null;

  const senderLines: string[] = ["SENDER CONTEXT:"];
  if (senderName) senderLines.push(`Sender name: ${senderName}`);
  if (senderAgency) senderLines.push(`Agency / Company: ${senderAgency}`);
  if (senderNiche) senderLines.push(`Service offered: ${senderNiche}`);
  if (targetMarket) senderLines.push(`Typical target market: ${targetMarket}`);
  if (socialProof) senderLines.push(`Proof point to use (use this verbatim or very close to it): "${socialProof}"`);
  if (senderAgency) senderLines.push(`All pitches must be written from the perspective of ${senderAgency}.`);
  if (senderName && senderAgency) senderLines.push(`Sign off every email as: ${senderName} | ${senderAgency}`);
  else if (senderName) senderLines.push(`Sign off every email with the sender's name: ${senderName}`);
  if (!senderAgency && !senderNiche) senderLines.push("Write from the perspective of a specialist freelancer or boutique agency.");

  const senderBlock = senderLines.join("\n");

  const prospectBlock = [
    `Business name: ${data.businessName}`,
    data.niche ? `Industry / niche: ${data.niche}` : null,
    data.location ? `City / market: ${data.location}` : null,
    `Observed problem / gap: ${data.observedGaps}`,
  ].filter(Boolean).join("\n");

  const prompt = `You are a world-class B2B sales copywriter with 15+ years of experience writing cold outreach that has booked thousands of meetings for agencies, consultants, and service businesses. You write pitches that feel hand-researched and human — never templated, never vague, never flattering without substance.

Your writing principles (non-negotiable):
1. Never open with "I" — open with an observation about the prospect.
2. Name the specific gap before naming the solution.
3. Translate technical problems into business costs — lost customers, missed revenue, wasted ad spend.
4. One sentence of social proof maximum — make it concrete (a number, a timeframe, a client type).
5. CTA asks for time, not money — "worth a 10-min call?" not "book a demo."
6. Zero buzzwords. No "synergy", "leverage", "circle back", "hope this finds you well", "I came across your profile", or "I love what you're doing."
7. No markdown, no asterisks, no bullet points, no em-dashes used for decoration. Plain prose only.
8. Every sentence must earn its place. Cut anything vague.

${senderBlock}

PROSPECT DETAILS:
${prospectBlock}

---

OUTPUT FORMAT:
Return a single raw JSON object with exactly four keys. No markdown fences. No explanation. Just the JSON.

{
  "subjectLine": "...",
  "emailFormat": "...",
  "whatsAppFormat": "...",
  "linkedInFormat": "..."
}

---

FIELD INSTRUCTIONS:

subjectLine:
- 5–9 words, specific to THIS business and THIS problem
- Never use "Quick question", "Following up", "Checking in", "Opportunity for [Business]", or anything generic
- Reference the gap or the business name directly

emailFormat:
Write a complete cold email BODY — include a greeting, 3 paragraphs, and a sign-off. Total email length: 120–180 words.

whatsAppFormat:
Write a WhatsApp message for mobile. Maximum 5 short lines. Under 60 words.

linkedInFormat:
Write a LinkedIn connection note. HARD LIMIT: under 295 characters including spaces. No emojis.

Respond ONLY with the JSON object. Nothing before it, nothing after it.`;

  let parsed: Pitch;
  try {
    const { text } = await generateText({
      model: gateway("gemini-2.5-flash"),
      prompt,
    });
    const raw = extractJson(text);
    const cleaned = PitchSchema.parse(raw);
    parsed = {
      subjectLine: stripMarkdown(cleaned.subjectLine),
      emailFormat: stripMarkdown(cleaned.emailFormat),
      whatsAppFormat: stripMarkdown(cleaned.whatsAppFormat),
      linkedInFormat: stripMarkdown(cleaned.linkedInFormat),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generatePitch] AI error:", msg, err);
    if (msg.includes("429")) throw new Error("RATE_LIMITED");
    if (msg.includes("402")) throw new Error("CREDITS_EXHAUSTED");
    if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("invalid key")) {
      throw new Error("INVALID_KEY: Check your GEMINI_API_KEY in .env");
    }
    throw new Error("AI_FAILED: " + msg);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("user_generations")
    .insert({
      user_id: userId,
      business_name: data.businessName,
      niche: data.niche,
      location: data.location,
      observed_gaps: data.observedGaps,
      generated_pitch: JSON.stringify(parsed),
    })
    .select("id, business_name, niche, location, observed_gaps, generated_pitch, created_at")
    .single();

  if (insertError) throw new Error(insertError.message);
  return inserted;
}
